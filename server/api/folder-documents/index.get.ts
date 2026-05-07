import { serverSupabaseClient } from "#supabase/server";
import { z } from "zod";

const QuerySchema = z.object({
	folderId: z.string().uuid(),
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

	const { folderId } = parsed.data;

	const { data: folder, error: folderError } = await client
		.from("folders")
		.select("id")
		.eq("id", folderId)
		.single();

	if (folderError || !folder) {
		throw createError({ statusCode: 403, message: "Access denied" });
	}

	const { data, error } = await (client.from as any)("folder_documents")
		.select("id, folder_id, slot, filename, file_size_bytes, storage_path, uploaded_at")
		.eq("folder_id", folderId)
		.order("uploaded_at", { ascending: false });

	if (error) {
		throw createError({ statusCode: 500, message: error.message });
	}

	return data ?? [];
});
