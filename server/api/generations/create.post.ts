import {
  serverSupabaseClient,
  serverSupabaseServiceRole,
} from "#supabase/server";
import { randomUUID } from "uncrypto";
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
      id, title, system_prompt_template, refine_prompt_template,
      page:pages (
        title, tax_year,
        client:clients (
          name, company_name, company_form, industry_sector, employee_count,
          legal_representative, vat_number, codice_fiscale, registered_address,
          board_members, shareholders, subsidiaries
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
  const page = (step.page as any);
  const c = page?.client;
  const taxYear = page?.tax_year;

  function formatShareholders(shareholders: any[]): string {
    if (!shareholders?.length) return "Nessun azionista registrato.";
    return shareholders.map((s: any, i: number) => {
      if (s.type === "persona_fisica") {
        return [
          `Azionista ${i + 1} (persona fisica):`,
          `  Nome: ${s.first_name ?? "[N/D]"} ${s.last_name ?? "[N/D]"}`,
          `  Luogo di nascita: ${s.place_of_birth ?? "[N/D]"}`,
          `  Data di nascita: ${s.date_of_birth ?? "[N/D]"}`,
          `  Indirizzo: ${s.address ?? "[N/D]"}`,
          `  Codice fiscale: ${s.codice_fiscale ?? "[N/D]"}`,
          `  Quota: ${s.quota_pct != null ? `${s.quota_pct}%` : "[N/D]"}`,
        ].join("\n");
      } else {
        return [
          `Azionista ${i + 1} (persona giuridica):`,
          `  Denominazione: ${s.company_name ?? "[N/D]"} ${s.company_form ?? ""}`,
          `  Sede legale: ${s.registered_address ?? "[N/D]"}`,
          `  Codice fiscale/P.IVA: ${s.codice_fiscale ?? "[N/D]"}`,
          `  Quota: ${s.quota_pct != null ? `${s.quota_pct}%` : "[N/D]"}`,
          `  Legale rappresentante: ${s.legal_rep ?? "[DA COMPLETARE]"}`,
        ].join("\n");
      }
    }).join("\n\n");
  }

  function formatSubsidiaries(subsidiaries: any[]): string {
    if (!subsidiaries?.length) return "Nessuna società partecipata registrata.";
    return subsidiaries.map((s: any, i: number) => [
      `Partecipata ${i + 1}:`,
      `  Denominazione: ${s.company_name ?? "[N/D]"} ${s.company_form ?? ""}`,
      `  Paese: ${s.country ?? "Italia"}`,
      `  Quota detenuta: ${s.quota_held_pct != null ? `${s.quota_held_pct}%` : "[N/D]"}`,
      `  Legale rappresentante: ${s.legal_rep ?? "[DA COMPLETARE]"}`,
    ].join("\n")).join("\n\n");
  }

  const companyContext = c
    ? [
        `Ragione sociale: ${c.company_name ?? c.name ?? "N/D"} ${c.company_form ?? ""}`.trim(),
        c.industry_sector       ? `Settore: ${c.industry_sector}` : null,
        c.employee_count        ? `Dipendenti: ${c.employee_count}` : null,
        taxYear                 ? `Anno fiscale: ${taxYear}` : null,
        c.legal_representative  ? `Legale rappresentante: ${c.legal_representative}` : null,
        c.vat_number            ? `P.IVA: ${c.vat_number}` : null,
        c.codice_fiscale        ? `Codice fiscale: ${c.codice_fiscale}` : null,
        c.registered_address    ? `Sede legale: ${c.registered_address}` : null,
        c.board_members?.length
          ? `Membri CdA: ${(c.board_members as string[]).join(", ")}`
          : null,
        `\nAzionisti:\n${formatShareholders(c.shareholders)}`,
        `\nSocietà partecipate:\n${formatSubsidiaries(c.subsidiaries)}`,
      ].filter(Boolean).join("\n")
    : "";

  // ─── Step 6: Build the prompt ─────────────────────────────────────────────
  const systemPrompt =
    mode === "generate"
      ? step.system_prompt_template
      : step.refine_prompt_template;

  const userMessage = [
    companyContext ? `Informazioni aziendali:\n${companyContext}` : "",
    mode === "refine" && existingOutput
      ? `Bozza esistente da raffinare:\n${existingOutput}`
      : "",
    userContext ? `Istruzioni aggiuntive:\n${userContext}` : "",
    `Si prega di ${mode === "generate" ? "scrivere" : "raffinare"} la sezione "${step.title}" ora.`,
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
  const generationId = randomUUID();
  const promptUsed = `${systemPrompt}\n\n---\n\n${userMessage}`;

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
