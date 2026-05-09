import {
	serverSupabaseClient,
	serverSupabaseServiceRole,
} from "#supabase/server";
import { z } from "zod";
import { FOLDER_DOCUMENT_BUCKET } from "../../utils/folderDocuments";

const QuerySchema = z.object({
	id: z.string().uuid(),
});

export default defineEventHandler(async (event) => {
	const userClient = await serverSupabaseClient(event);
	const {
		data: { user },
	} = await userClient.auth.getUser();
	if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

	const parsed = QuerySchema.safeParse(getQuery(event));
	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			message: parsed.error.issues[0]?.message ?? "Invalid query",
		});
	}

	const { id } = parsed.data;

	const { data: document, error: documentError } = await (userClient.from as any)("folder_documents")
		.select("id, folder_id, storage_path")
		.eq("id", id)
		.single();

	if (documentError || !document?.storage_path) {
		throw createError({ statusCode: 404, message: "Document not found" });
	}

	const { data: folder, error: folderError } = await userClient
		.from("folders")
		.select("id, user_id")
		.eq("id", document.folder_id)
		.single();

	if (folderError || !folder || folder.user_id !== user.id) {
		throw createError({ statusCode: 403, message: "Access denied" });
	}

	const supabase = serverSupabaseServiceRole(event);
	const { data, error } = await supabase.storage
		.from(FOLDER_DOCUMENT_BUCKET)
		.createSignedUrl(document.storage_path, 60);

	if (error || !data?.signedUrl) {
		throw createError({
			statusCode: 500,
			message: error?.message ?? "Signed URL generation failed",
		});
	}

	return { url: data.signedUrl };
});
