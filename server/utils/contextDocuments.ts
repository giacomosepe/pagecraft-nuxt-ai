export const PAGE_CONTEXT_BUCKET = "page-context-documents";

export const PAGE_CONTEXT_SLOTS = [
	"technical_presentation",
	"financial_notes",
	"additional_docs",
] as const;

export type PageContextSlot = typeof PAGE_CONTEXT_SLOTS[number];

export const PAGE_CONTEXT_SLOT_LABELS: Record<PageContextSlot, string> = {
	technical_presentation: "Presentazione tecnica",
	financial_notes: "Nota integrativa",
	additional_docs: "Documentazione aggiuntiva",
};

export const PAGE_CONTEXT_CHAR_BUDGETS: Record<PageContextSlot, number> = {
	technical_presentation: 40000,
	financial_notes: 32000,
	additional_docs: 20000,
};

export const PAGE_CONTEXT_ALLOWED_MIME_TYPES = [
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export function isPageContextSlot(value: string): value is PageContextSlot {
	return PAGE_CONTEXT_SLOTS.includes(value as PageContextSlot);
}

export function normalizeExtractedText(text: string): string {
	return text
		.replace(/\r\n/g, "\n")
		.replace(/[ \t]+/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function truncateAtSentence(text: string, maxChars: number): string {
	if (text.length <= maxChars) return text;

	const slice = text.slice(0, maxChars);
	const sentenceEnd = Math.max(
		slice.lastIndexOf("."),
		slice.lastIndexOf("!"),
		slice.lastIndexOf("?"),
		slice.lastIndexOf(";"),
	);

	if (sentenceEnd > Math.floor(maxChars * 0.6)) {
		return slice.slice(0, sentenceEnd + 1).trim();
	}

	const lastSpace = slice.lastIndexOf(" ");
	return slice.slice(0, lastSpace > 0 ? lastSpace : maxChars).trim();
}

export function sanitizeStorageFilename(filename: string): string {
	const cleaned = filename
		.normalize("NFKD")
		.replace(/[^\w.\- ]+/g, "")
		.trim()
		.replace(/\s+/g, "-");

	return cleaned || `document-${Date.now()}`;
}

export function buildPageContextStoragePath(
	pageId: string,
	slot: PageContextSlot,
	filename: string,
): string {
	return `${pageId}/${slot}/${sanitizeStorageFilename(filename)}`;
}

export function inferDocumentMimeType(filename: string, mimeType = ""): string {
	const lower = filename.toLowerCase();
	if (mimeType && PAGE_CONTEXT_ALLOWED_MIME_TYPES.includes(mimeType as any)) {
		return mimeType;
	}
	if (lower.endsWith(".pdf")) return "application/pdf";
	if (lower.endsWith(".doc")) return "application/msword";
	if (lower.endsWith(".docx")) {
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
	}
	return mimeType;
}

export function isAllowedContextDocument(filename: string, mimeType = ""): boolean {
	const inferred = inferDocumentMimeType(filename, mimeType);
	return PAGE_CONTEXT_ALLOWED_MIME_TYPES.includes(inferred as any);
}
