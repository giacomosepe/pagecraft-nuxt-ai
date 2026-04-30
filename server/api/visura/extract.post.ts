// POST /api/visura/extract
// Body: { text: string }  ← extracted text from the uploaded PDF
// Returns: { shareholders: Shareholder[], subsidiaries: Subsidiary[], missing: MissingFieldsReport }

import { serverSupabaseClient } from "#supabase/server";
import { z } from "zod";
import {
  buildVisuraMissingReport,
  DEFAULT_VISURA_EXTRACTION_PROMPT,
  normalizeVisuraExtraction,
} from "../../utils/visuraExtraction";

const ExtractSchema = z.object({
  text: z.string().min(100).max(100000),
});

export default defineEventHandler(async (event) => {
  // Auth
  const userClient = await serverSupabaseClient(event);
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

  // Validate
  const body = await readBody(event);
  const parsed = ExtractSchema.safeParse(body);
  if (!parsed.success)
    throw createError({ statusCode: 400, message: "Invalid body" });

  const anthropicKey = useRuntimeConfig().anthropicApiKey;

  const systemPrompt = DEFAULT_VISURA_EXTRACTION_PROMPT;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        { role: "user", content: `Visura text:\n\n${parsed.data.text}` },
      ],
    }),
  });

  if (!response.ok) {
    throw createError({ statusCode: 502, message: "Extraction service error" });
  }

  const result = await response.json();
  const rawText = result.content?.[0]?.text ?? "";

  let extracted: any;
  try {
    extracted = JSON.parse(rawText);
  } catch {
    throw createError({
      statusCode: 422,
      message: "Could not parse extraction result",
    });
  }

  const normalized = normalizeVisuraExtraction(extracted);
  const missing = buildVisuraMissingReport(normalized);

  return {
    ...normalized,
    shareholders: normalized.soci,
    subsidiaries: normalized.partecipate,
    missing,
  };
});
