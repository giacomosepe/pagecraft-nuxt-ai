// POST /api/visura/extract
// Body: { text: string }  ← extracted text from the uploaded PDF
// Returns: { shareholders: Shareholder[], subsidiaries: Subsidiary[], missing: MissingFieldsReport }

import { serverSupabaseClient } from "#supabase/server";
import { z } from "zod";

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

  const systemPrompt = `You are a data extraction assistant specialising in Italian company documents.
You will receive the text of a Visura Camerale Storica (Italian company registry extract).
Extract shareholder and subsidiary data and return it as a single JSON object.
Return ONLY valid JSON — no prose, no markdown, no code fences.

The JSON must match this exact structure:
{
  "shareholders": [
    // For a natural person:
    {
      "type": "persona_fisica",
      "first_name": "string",
      "last_name": "string",
      "place_of_birth": "string or null",
      "date_of_birth": "YYYY-MM-DD or null",
      "address": "string or null",
      "codice_fiscale": "string or null",
      "quota_pct": number or null
    },
    // For a company:
    {
      "type": "persona_giuridica",
      "company_name": "string",
      "company_form": "string",
      "registered_address": "string or null",
      "codice_fiscale": "string or null",
      "quota_pct": number or null,
      "legal_rep": null,
      "legal_rep_missing": true
    }
  ],
  "subsidiaries": [
    {
      "type": "persona_giuridica",
      "company_name": "string",
      "company_form": "string or null",
      "registered_address": "string or null",
      "country": "string or null",
      "codice_fiscale": "string or null",
      "quota_held_pct": number or null,
      "legal_rep": null,
      "legal_rep_missing": true
    }
  ]
}

Rules:
- legal_rep for persona_giuridica shareholders and subsidiaries is ALWAYS null and legal_rep_missing is ALWAYS true — this information is not available in the Visura
- Use null for any field you cannot find — never invent data
- quota_pct is a number between 0 and 100, not a string
- date_of_birth format: YYYY-MM-DD
- If no shareholders or subsidiaries are found, return empty arrays
- Do not include any text outside the JSON object`;

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

  // Build missing fields report
  const missing: MissingFieldsReport = {
    shareholders: [],
    subsidiaries: [],
  };

  extracted.shareholders?.forEach((s: any, i: number) => {
    const missingFields: string[] = [];
    if (s.type === "persona_fisica") {
      if (!s.codice_fiscale) missingFields.push("codice_fiscale");
      if (!s.address) missingFields.push("address");
      if (!s.place_of_birth) missingFields.push("place_of_birth");
    }
    if (s.type === "persona_giuridica") {
      missingFields.push("legal_rep"); // always missing from Visura
      if (!s.codice_fiscale) missingFields.push("codice_fiscale");
    }
    if (missingFields.length) {
      const name =
        s.type === "persona_fisica"
          ? `${s.first_name} ${s.last_name}`
          : `${s.company_name} ${s.company_form ?? ""}`;
      missing.shareholders.push({
        index: i,
        name: name.trim(),
        missing: missingFields,
      });
    }
  });

  // Same for subsidiaries
  extracted.subsidiaries?.forEach((s: any, i: number) => {
    const missingFields = ["legal_rep"]; // always missing
    if (!s.codice_fiscale) missingFields.push("codice_fiscale");
    missing.subsidiaries.push({
      index: i,
      name: `${s.company_name ?? "Partecipata"} ${s.company_form ?? ""}`.trim(),
      missing: missingFields,
    });
  });

  return {
    shareholders: extracted.shareholders ?? [],
    subsidiaries: extracted.subsidiaries ?? [],
    missing,
  };
});
