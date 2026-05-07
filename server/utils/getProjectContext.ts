import {
	PAGE_CONTEXT_SLOT_LABELS,
	type PageContextSlot,
} from "./contextDocuments";

interface SupabaseLikeClient {
	from: any;
}

const STEP_CONTEXT_MAP: Record<number, PageContextSlot[]> = {
	4: ["technical_presentation", "additional_docs"],
	5: ["technical_presentation"],
	6: ["technical_presentation", "additional_docs"],
	7: ["financial_notes", "technical_presentation"],
};

interface ContextDocumentRow {
	slot: PageContextSlot;
	extracted_text: string | null;
}

export async function getProjectContext(
	pageId: string,
	stepNumber: number,
	supabase: SupabaseLikeClient,
): Promise<string> {
	const slots = STEP_CONTEXT_MAP[stepNumber] ?? [];
	if (!slots.length) return "";

	const { data, error } = await (supabase.from as any)("page_context_documents")
		.select("slot, extracted_text")
		.eq("page_id", pageId)
		.in("slot", slots)
		.not("extracted_text", "is", null);

	if (error) {
		console.error("[getProjectContext] Failed to load context documents:", error);
		return "";
	}

	const rows = (data ?? []) as ContextDocumentRow[];
	const sections = slots
		.map((slot) => rows.find((row) => row.slot === slot))
		.filter((row): row is ContextDocumentRow => Boolean(row?.extracted_text?.trim()))
		.map((row) => [
			`--- ${PAGE_CONTEXT_SLOT_LABELS[row.slot]} ---`,
			row.extracted_text?.trim(),
		].join("\n"));

	if (!sections.length) return "";

	return ["=== DOCUMENTI DI CONTESTO ===", ...sections].join("\n\n");
}
