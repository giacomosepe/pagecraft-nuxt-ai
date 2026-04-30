// POST /api/visura/extract-pdf
// Body: multipart/form-data — field "file" must be a PDF (max 10 MB)
// Returns canonical extraction data plus legacy compatibility aliases:
// { soci, partecipate, board, legale_rappresentante_societa, shareholders, subsidiaries, missing }
//
// Accepts a Visura Camerale PDF, sends it to Claude using the native document API
// (no pdf-lib needed — Claude handles multi-page PDFs directly), then extracts
// structured company ownership data.

import { serverSupabaseClient } from "#supabase/server";
import {
	buildVisuraMissingReport,
	DEFAULT_VISURA_EXTRACTION_PROMPT,
	normalizeVisuraExtraction,
} from "../../utils/visuraExtraction";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB — Anthropic document API limit

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
  const extractionRule = form.find((part) => part.name === "extractionRule")?.data?.toString("utf8").trim();

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
      system: extractionRule || DEFAULT_VISURA_EXTRACTION_PROMPT,
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
              text: "Extract the structured data from this Visura Camerale. Return only the JSON object as specified.",
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

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch {
    console.error("[visura/extract-pdf] Failed to parse Claude response:", rawText.slice(0, 200));
    throw createError({
      statusCode: 422,
      message: "Could not parse extraction result",
    });
  }

  const extracted = normalizeVisuraExtraction(parsedJson);
  const missing = buildVisuraMissingReport(extracted);

  return {
    ...extracted,
    shareholders: extracted.soci,
    subsidiaries: extracted.partecipate,
    missing,
  };
});
