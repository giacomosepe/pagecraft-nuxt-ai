import { serverSupabaseClient } from "#supabase/server";
import { z } from "zod";

const QuerySchema = z.object({
	pageId: z.string().uuid(),
});

export default defineEventHandler(async (event) => {
	const client = await serverSupabaseClient(event);
	const {
		data: { user },
	} = await client.auth.getUser();
	if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

	const parsed = QuerySchema.safeParse(getQuery(event));
	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			message: parsed.error.issues[0]?.message ?? "Invalid query",
		});
	}

	const { pageId } = parsed.data;

	const { error: ownerError } = await client
		.from("pages")
		.select("id")
		.eq("id", pageId)
		.single();

	if (ownerError) {
		throw createError({ statusCode: 403, message: "Access denied" });
	}

	const { data, error } = await (client.from as any)("page_context_documents")
		.select("id, page_id, slot, filename, file_size_bytes, storage_path, extracted_at, uploaded_at")
		.eq("page_id", pageId)
		.order("uploaded_at", { ascending: false });

	if (error) {
		throw createError({ statusCode: 500, message: error.message });
	}

	return data ?? [];
});
