import {
	serverSupabaseClient,
	serverSupabaseServiceRole,
} from "#supabase/server";
import { z } from "zod";
import { FOLDER_DOCUMENT_BUCKET } from "../../utils/folderDocuments";

const DeleteSchema = z.object({
	id: z.string().uuid(),
});

export default defineEventHandler(async (event) => {
	const userClient = await serverSupabaseClient(event);
	const {
		data: { user },
	} = await userClient.auth.getUser();
	if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

	const body = await readBody(event);
	const parsed = DeleteSchema.safeParse(body);
	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			message: parsed.error.issues[0]?.message ?? "Invalid request body",
		});
	}

	const { id } = parsed.data;

	const { data: document, error: loadError } = await (userClient.from as any)("folder_documents")
		.select("id, storage_path")
		.eq("id", id)
		.single();

	if (loadError || !document) {
		throw createError({ statusCode: 404, message: "Document not found" });
	}

	const supabase = serverSupabaseServiceRole(event);
	const { error: deleteError } = await (supabase.from as any)("folder_documents")
		.delete()
		.eq("id", id);

	if (deleteError) {
		throw createError({ statusCode: 500, message: deleteError.message });
	}

	if (document.storage_path) {
		await supabase.storage
			.from(FOLDER_DOCUMENT_BUCKET)
			.remove([document.storage_path]);
	}

	return { success: true };
});
