interface SupabaseLikeClient {
	from: any;
}

interface StepFigureRow {
	caption: string | null;
}

function isMissingTableError(error: { code?: string; message?: string }): boolean {
	return error.code === "42P01" || error.message?.includes("page_step_figures") === true;
}

export async function getStepFigureCaptions(
	stepId: string | null | undefined,
	supabase: SupabaseLikeClient,
): Promise<string[]> {
	if (!stepId) return [];

	const { data, error } = await (supabase.from as any)("page_step_figures")
		.select("caption")
		.eq("step_id", stepId)
		.order("sort_order", { ascending: true });

	if (error) {
		if (!isMissingTableError(error)) {
			console.error("[getStepFigureCaptions] Failed to load figures:", error);
		}
		return [];
	}

	return ((data ?? []) as StepFigureRow[])
		.map((row) => row.caption?.trim() ?? "")
		.filter(Boolean);
}
