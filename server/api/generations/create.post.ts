import {
  serverSupabaseClient,
  serverSupabaseServiceRole,
} from "#supabase/server";
import { randomUUID } from "uncrypto"; // ← fix 3
import { z } from "zod";

// ─── Request schema ───────────────────────────────────────────────────────────
const GenerateSchema = z.object({
  stepId: z.string().uuid("Invalid step ID"),
  pageId: z.string().uuid("Invalid page ID"),
  userContext: z.string().max(5000).optional().default(""),
  mode: z.enum(["generate", "refine"]),
  existingOutput: z.string().optional().default(""),
});

export default defineEventHandler(async (event) => {
  // ─── Step 1: Authenticate ─────────────────────────────────────────────────
  const userClient = await serverSupabaseClient(event);
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // ─── Step 2: Validate request body ───────────────────────────────────────
  const body = await readBody(event);
  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? "Invalid request body",
    });
  }
  const { stepId, pageId, userContext, mode, existingOutput } = parsed.data;

  // ─── Step 3: Verify page ownership ───────────────────────────────────────
  // Use the user's own client so RLS enforces ownership automatically.
  // If this page doesn't belong to the current user, .single() returns
  // an error and we reject before touching any AI resources.           ← fix 1
  const { error: ownerError } = await userClient
    .from("pages")
    .select("id")
    .eq("id", pageId)
    .single();

  if (ownerError) {
    throw createError({ statusCode: 403, message: "Access denied" });
  }

  // ─── Step 4: Load step and company data in one query ─────────────────────
  // Service role is safe here — ownership already confirmed above.
  // Single query replaces two sequential round trips.                  ← fix 2
  const supabase = serverSupabaseServiceRole(event);

  const { data: step, error: stepError } = await supabase
    .from("steps")
    .select(
      `
      id, title, system_prompt_template, refine_prompt_template,
      page:pages (
        title,
        company_profile:company_profiles (
          company_name, industry_sector, employee_count,
          tax_year, legal_representative
        )
      )
    `,
    )
    .eq("id", stepId)
    .eq("page_id", pageId)
    .single();

  if (stepError || !step) {
    throw createError({ statusCode: 404, message: "Step not found" });
  }

  // ─── Step 5: Build company context string ─────────────────────────────────
  const profile = (step.page as any)?.company_profile;
  const companyContext = profile
    ? [
        `Company: ${profile.company_name ?? "N/A"}`,
        `Industry: ${profile.industry_sector ?? "N/A"}`,
        `Employees: ${profile.employee_count ?? "N/A"}`,
        `Tax year: ${profile.tax_year ?? "N/A"}`,
        `Legal representative: ${profile.legal_representative ?? "N/A"}`,
      ].join("\n")
    : "";

  // ─── Step 6: Build the prompt ─────────────────────────────────────────────
  // Generate: system prompt + company context + user instructions
  // Refine:   refine prompt + existing draft + user instructions
  const systemPrompt =
    mode === "generate"
      ? step.system_prompt_template
      : step.refine_prompt_template;

  const userMessage = [
    companyContext ? `Company information:\n${companyContext}` : "",
    mode === "refine" && existingOutput
      ? `Existing draft to refine:\n${existingOutput}`
      : "",
    userContext ? `Additional instructions:\n${userContext}` : "",
    `Please ${mode === "generate" ? "write" : "refine"} the "${step.title}" section now.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // ─── Step 7: Verify AI service is configured ──────────────────────────────
  const anthropicKey = useRuntimeConfig().anthropicApiKey;
  if (!anthropicKey) {
    throw createError({
      statusCode: 500,
      message: "AI service not configured",
    });
  }

  // ─── Step 8: Call Claude API ──────────────────────────────────────────────
  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 8000,
      stream: true,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text();
    console.error("Anthropic API error:", err);
    throw createError({ statusCode: 502, message: "AI service error" });
  }

  // ─── Step 9: Stream response, accumulate full output, then save ───────────
  // Stream to the client AND collect the full text server-side.
  // After streaming completes, save the complete output to the database.
  // This gives a proper audit trail and enables future "previous generations" UI.
  // fix 4 + fix 5
  const generationId = randomUUID();
  const promptUsed = `${systemPrompt}\n\n---\n\n${userMessage}`;

  setResponseHeaders(event, {
    "Content-Type": "text/plain; charset=utf-8",
    "Transfer-Encoding": "chunked",
    "Cache-Control": "no-cache",
    "X-Generation-Id": generationId, // expose ID to client for commit flow
  });

  const reader = anthropicRes.body!.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let fullOutput = "";

  return new ReadableStream({
    async start(controller) {
      try {
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (
                parsed.type === "content_block_delta" &&
                parsed.delta?.type === "text_delta"
              ) {
                const text = parsed.delta.text;
                fullOutput += text; // accumulate
                controller.enqueue(encoder.encode(text)); // stream to client
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        // ─── Streaming complete — save generation record and update step ───
        await Promise.all([
          supabase.from("generations").insert({
            id: generationId,
            step_id: stepId,
            prompt_used: promptUsed,
            output: fullOutput, // full text saved
            source: mode === "generate" ? "AI_GENERATED" : "AI_REFINED",
            is_committed: false,
          }),
          supabase
            .from("steps")
            .update({ status: "IN_PROGRESS" })
            .eq("id", stepId),
        ]);
      } catch (e) {
        controller.error(e);
      } finally {
        controller.close();
      }
    },
  });
});
