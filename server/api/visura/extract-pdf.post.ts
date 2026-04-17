// POST /api/visura/extract-pdf
// Body: multipart/form-data — field "file" must be a PDF (max 10 MB)
// Returns: { shareholders: Shareholder[], subsidiaries: Subsidiary[], missing: MissingFieldsReport }
//
// Accepts a Visura Camerale PDF, sends it to Claude using the native document API
// (no pdf-lib needed — Claude handles multi-page PDFs directly), then extracts
// structured shareholder and subsidiary data.

import { serverSupabaseClient } from "#supabase/server";

interface MissingFieldEntry {
  index: number;
  name: string;
  missing: string[];
}

interface MissingFieldsReport {
  shareholders: MissingFieldEntry[];
  subsidiaries: MissingFieldEntry[];
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB — Anthropic document API limit

// Stable system prompt — all invariants go here to benefit from prompt caching
const SYSTEM_PROMPT = `You are a data extraction assistant specialising in Italian company documents.
You will receive a Visura Camerale Storica (Italian company registry extract) as a PDF document.
Extract shareholder and subsidiary data and return it as a single JSON object.
Return ONLY valid JSON — no prose, no markdown, no code fences.

The JSON must match this exact structure:
{
  "shareholders": [
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

export default defineEventHandler(async (event) => {
  // Auth
  const userClient = await serverSupabaseClient(event);
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

  // Parse multipart form
  const form = await readMultipartFormData(event);
  if (!form || form.length === 0) {
    throw createError({ statusCode: 400, message: "No file uploaded" });
  }

  const filePart = form.find((part) => part.name === "file");
  if (!filePart || !filePart.data) {
    throw createError({ statusCode: 400, message: "Missing file field" });
  }

  // Validate MIME type
  const mimeType = filePart.type ?? "";
  if (mimeType !== "application/pdf" && !filePart.filename?.endsWith(".pdf")) {
    throw createError({
      statusCode: 400,
      message: "Only PDF files are accepted",
    });
  }

  // Validate file size
  if (filePart.data.length > MAX_FILE_SIZE) {
    throw createError({
      statusCode: 413,
      message: "File exceeds maximum size of 10 MB",
    });
  }

  const anthropicKey = useRuntimeConfig().anthropicApiKey;
  if (!anthropicKey) {
    throw createError({
      statusCode: 500,
      message: "Anthropic API key not configured",
    });
  }

  // Convert buffer to base64 — Claude document API requires base64-encoded PDF
  const base64Pdf = filePart.data.toString("base64");

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
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Pdf,
              },
            },
            {
              type: "text",
              text: "Extract the shareholder and subsidiary data from this Visura Camerale. Return only the JSON object as specified.",
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("[visura/extract-pdf] Anthropic API error:", response.status, errorText);
    throw createError({ statusCode: 502, message: "Extraction service error" });
  }

  const result = await response.json();
  const rawText: string = result.content?.[0]?.text ?? "";

  // Strip markdown fences if Claude wraps its output despite instructions
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let extracted: { shareholders?: unknown[]; subsidiaries?: unknown[] };
  try {
    extracted = JSON.parse(cleaned);
  } catch {
    console.error("[visura/extract-pdf] Failed to parse Claude response:", rawText.slice(0, 200));
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

  (extracted.shareholders ?? []).forEach((s: unknown, i: number) => {
    const sh = s as Record<string, unknown>;
    const missingFields: string[] = [];
    if (sh.type === "persona_fisica") {
      if (!sh.codice_fiscale) missingFields.push("codice_fiscale");
      if (!sh.address) missingFields.push("address");
      if (!sh.place_of_birth) missingFields.push("place_of_birth");
    }
    if (sh.type === "persona_giuridica") {
      missingFields.push("legal_rep"); // always missing from Visura
      if (!sh.codice_fiscale) missingFields.push("codice_fiscale");
    }
    if (missingFields.length) {
      const name =
        sh.type === "persona_fisica"
          ? `${sh.first_name ?? ""} ${sh.last_name ?? ""}`.trim()
          : `${sh.company_name ?? ""} ${sh.company_form ?? ""}`.trim();
      missing.shareholders.push({ index: i, name, missing: missingFields });
    }
  });

  (extracted.subsidiaries ?? []).forEach((s: unknown, i: number) => {
    const sub = s as Record<string, unknown>;
    const missingFields = ["legal_rep"]; // always missing
    if (!sub.codice_fiscale) missingFields.push("codice_fiscale");
    const name = `${sub.company_name ?? "Partecipata"} ${sub.company_form ?? ""}`.trim();
    missing.subsidiaries.push({ index: i, name, missing: missingFields });
  });

  return {
    shareholders: extracted.shareholders ?? [],
    subsidiaries: extracted.subsidiaries ?? [],
    missing,
  };
});
