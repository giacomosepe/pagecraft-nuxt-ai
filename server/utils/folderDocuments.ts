export const FOLDER_DOCUMENT_BUCKET = "folder-documents";

export const FOLDER_DOCUMENT_SLOTS = ["contratto", "additional"] as const;

export type FolderDocumentSlot = typeof FOLDER_DOCUMENT_SLOTS[number];

export const FOLDER_DOCUMENT_SLOT_LABELS: Record<FolderDocumentSlot, string> = {
	contratto: "Contratto",
	additional: "Documenti aggiuntivi",
};

export const FOLDER_DOCUMENT_ALLOWED_MIME_TYPES = [
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];

export function isFolderDocumentSlot(value: string): value is FolderDocumentSlot {
	return FOLDER_DOCUMENT_SLOTS.includes(value as FolderDocumentSlot);
}

export function sanitizeFolderDocumentFilename(filename: string): string {
	const cleaned = filename
		.normalize("NFKD")
		.replace(/[^\w.\- ]+/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.toLowerCase();

	return cleaned || "documento";
}

export function inferFolderDocumentMimeType(filename: string, providedType: string): string {
	if (providedType && providedType !== "application/octet-stream") return providedType;

	const lower = filename.toLowerCase();
	if (lower.endsWith(".pdf")) return "application/pdf";
	if (lower.endsWith(".doc")) return "application/msword";
	if (lower.endsWith(".docx")) {
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
	}
	if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
	if (lower.endsWith(".xlsx")) {
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
	}

	return providedType || "application/octet-stream";
}

export function isAllowedFolderDocument(filename: string, mimeType: string): boolean {
	const lower = filename.toLowerCase();
	const hasAllowedExtension = ALLOWED_EXTENSIONS.some((extension) =>
		lower.endsWith(extension),
	);
	return hasAllowedExtension && FOLDER_DOCUMENT_ALLOWED_MIME_TYPES.includes(mimeType as any);
}

export function buildFolderDocumentStoragePath(
	folderId: string,
	slot: FolderDocumentSlot,
	filename: string,
): string {
	return `${folderId}/${slot}/${sanitizeFolderDocumentFilename(filename)}`;
}
