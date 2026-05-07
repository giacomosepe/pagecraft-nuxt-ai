import mammoth from "mammoth";
import { normalizeExtractedText } from "./contextDocuments";

const PDF_EXTRACTION_PROMPT =
	"Extract all text content from this document. Return plain text only, preserving paragraph breaks. Do not summarise or restructure.";

async function extractPdfText(fileBuffer: Buffer): Promise<string> {
	const anthropicKey = useRuntimeConfig().anthropicApiKey;
	if (!anthropicKey) {
		throw createError({
			statusCode: 500,
			message: "Anthropic API key not configured",
		});
	}

	const response = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-api-key": anthropicKey,
			"anthropic-version": "2023-06-01",
		},
		body: JSON.stringify({
			model: "claude-opus-4-5",
			max_tokens: 12000,
			system: PDF_EXTRACTION_PROMPT,
			messages: [
				{
					role: "user",
					content: [
						{
							type: "document",
							source: {
								type: "base64",
								media_type: "application/pdf",
								data: fileBuffer.toString("base64"),
							},
						},
						{
							type: "text",
							text: PDF_EXTRACTION_PROMPT,
						},
					],
				},
			],
		}),
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		console.error("[extractDocumentText] Anthropic PDF extraction error:", response.status, errorText);
		throw createError({ statusCode: 502, message: "Extraction service error" });
	}

	const result = await response.json();
	return normalizeExtractedText(result.content?.[0]?.text ?? "");
}

async function extractWordText(fileBuffer: Buffer): Promise<string> {
	const result = await mammoth.extractRawText({ buffer: fileBuffer });
	return normalizeExtractedText(result.value ?? "");
}

export async function extractDocumentText(
	fileBuffer: Buffer,
	mimeType: string,
): Promise<string> {
	if (mimeType === "application/pdf") {
		return extractPdfText(fileBuffer);
	}

	if (
		mimeType === "application/msword" ||
		mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	) {
		return extractWordText(fileBuffer);
	}

	throw createError({
		statusCode: 400,
		message: "Unsupported document type",
	});
}
