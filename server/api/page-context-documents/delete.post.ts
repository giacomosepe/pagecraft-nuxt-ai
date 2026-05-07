import {
	serverSupabaseClient,
	serverSupabaseServiceRole,
} from "#supabase/server";
import { z } from "zod";
import { PAGE_CONTEXT_BUCKET } from "../../utils/contextDocuments";

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

	const { data: contextDoc, error: loadError } = await (userClient.from as any)("page_context_documents")
		.select("id, storage_path")
		.eq("id", id)
		.single();

	if (loadError || !contextDoc) {
		throw createError({ statusCode: 404, message: "Document not found" });
	}

	const supabase = serverSupabaseServiceRole(event);
	const { error: deleteError } = await (supabase.from as any)("page_context_documents")
		.delete()
		.eq("id", id);

	if (deleteError) {
		throw createError({ statusCode: 500, message: deleteError.message });
	}

	if (contextDoc.storage_path) {
		await supabase.storage
			.from(PAGE_CONTEXT_BUCKET)
			.remove([contextDoc.storage_path]);
	}

	return { success: true };
});
