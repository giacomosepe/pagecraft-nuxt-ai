import {
  serverSupabaseClient,
  serverSupabaseServiceRole,
} from "#supabase/server";
import { randomUUID } from "uncrypto";
import { z } from "zod";
import { buildGenerationPrompt, splitPromptUsed } from "../../utils/generationPrompt";

// ─── Request schema ───────────────────────────────────────────────────────────
const GenerateSchema = z.object({
  stepId: z.string().uuid("Invalid step ID"),
  pageId: z.string().uuid("Invalid page ID"),
  mode: z.enum(["generate", "refine"]),
  existingOutput: z.string().optional().default(""),
  promptRule: z.string().optional().nullable(),
  promptOverride: z.string().optional().nullable(),
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
  const { stepId, pageId, mode, existingOutput, promptRule, promptOverride } = parsed.data;

  // ─── Step 3: Verify page ownership ───────────────────────────────────────
  const { error: ownerError } = await userClient
    .from("pages")
    .select("id")
    .eq("id", pageId)
    .single();

  if (ownerError) {
    throw createError({ statusCode: 403, message: "Access denied" });
  }

  // ─── Step 4: Load step + page + client data ───────────────────────────────
  // client replaces company_profiles — all company data lives on clients now.
  // tax_year is on the page, not the client.
  const supabase = serverSupabaseServiceRole(event);

  const { data: step, error: stepError } = await supabase
    .from("steps")
    .select(
      `
      id, order, title, system_prompt_template, refine_prompt_template, form_data, form_schema,
      page:pages (
        title, tax_year, referente,
        client:clients (
          name, company_name, company_form, industry_sector, employee_count,
          legal_representative, vat_number, codice_fiscale, registered_address,
          board_members, soci, partecipate, shareholders, subsidiaries
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

  // Fetch committed outputs from prior steps for cross-step context
  const { data: priorSteps } = await supabase
    .from("steps")
    .select("order, title, committed_output")
    .eq("page_id", pageId)
    .lt("order", (step as any).order)
    .not("committed_output", "is", null)
    .order("order", { ascending: true });

  // ─── Step 5: Build or apply the generative rule ───────────────────────────
  const builtPrompt = promptRule?.trim()
    ? splitPromptUsed(promptRule)
    : buildGenerationPrompt({
        step: step as any,
        priorSteps: priorSteps ?? [],
        mode,
        existingOutput,
        promptOverride,
      });
  const { systemPrompt, userMessage, promptUsed } = builtPrompt;

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
  const generationId = randomUUID();
  setResponseHeaders(event, {
    "Content-Type": "text/plain; charset=utf-8",
    "Transfer-Encoding": "chunked",
    "Cache-Control": "no-cache",
    "X-Generation-Id": generationId,
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
                fullOutput += text;
                controller.enqueue(encoder.encode(text));
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        await Promise.all([
          supabase.from("generations").insert({
            id: generationId,
            step_id: stepId,
            prompt_used: promptUsed,
            output: fullOutput,
            source: mode === "generate" ? "AI_GENERATED" : "AI_REFINED",
            is_committed: false,
          }),
          supabase
            .from("steps")
            .update({ status: "IN_PROGRESS", last_prompt_used: promptUsed })
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
