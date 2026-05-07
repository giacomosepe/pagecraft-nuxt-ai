export interface FrameworkStepExampleContext {
	sector: string | null;
	content: string;
	blocklist: string[];
}

interface SupabaseLikeClient {
	from: any;
}

interface FrameworkStepExampleRow {
	sector: string | null;
	content: string;
	blocklist: string[] | null;
}

interface FrameworkStepExampleBlocklistRow {
	blocklist: string[] | null;
}

export async function getFrameworkStepExample(
	frameworkStepId: string | null | undefined,
	supabase: SupabaseLikeClient,
): Promise<FrameworkStepExampleContext | null> {
	if (!frameworkStepId) return null;

	const { data, error } = await (supabase.from as any)("framework_step_examples")
		.select("sector, content, blocklist")
		.eq("framework_step_id", frameworkStepId)
		.eq("is_active", true)
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		console.error("[getFrameworkStepExample] Failed to load example:", error);
		return null;
	}

	const row = data as FrameworkStepExampleRow | null;
	if (!row?.content?.trim()) return null;

	return {
		sector: row.sector ?? null,
		content: row.content.trim(),
		blocklist: row.blocklist ?? [],
	};
}

export async function getActiveFrameworkStepExampleBlocklist(
	frameworkStepId: string | null | undefined,
	supabase: SupabaseLikeClient,
): Promise<string[]> {
	if (!frameworkStepId) return [];

	const { data, error } = await (supabase.from as any)("framework_step_examples")
		.select("blocklist")
		.eq("framework_step_id", frameworkStepId)
		.eq("is_active", true);

	if (error) {
		console.error("[getActiveFrameworkStepExampleBlocklist] Failed to load examples:", error);
		return [];
	}

	const terms = ((data ?? []) as FrameworkStepExampleBlocklistRow[])
		.flatMap((row) => row.blocklist ?? [])
		.filter((term) => term.trim().length > 0);

	return Array.from(new Set(terms));
}
