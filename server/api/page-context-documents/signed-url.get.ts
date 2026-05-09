import {
	serverSupabaseClient,
	serverSupabaseServiceRole,
} from "#supabase/server";
import { z } from "zod";
import { PAGE_CONTEXT_BUCKET } from "../../utils/contextDocuments";

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

	const { data: document, error: documentError } = await (userClient.from as any)("page_context_documents")
		.select("id, page_id, storage_path")
		.eq("id", id)
		.single();

	if (documentError || !document?.storage_path) {
		throw createError({ statusCode: 404, message: "Document not found" });
	}

	const { data: page, error: pageError } = await userClient
		.from("pages")
		.select("id, user_id")
		.eq("id", document.page_id)
		.single();

	if (pageError || !page || page.user_id !== user.id) {
		throw createError({ statusCode: 403, message: "Access denied" });
	}

	const supabase = serverSupabaseServiceRole(event);
	const { data, error } = await supabase.storage
		.from(PAGE_CONTEXT_BUCKET)
		.createSignedUrl(document.storage_path, 60);

	if (error || !data?.signedUrl) {
		throw createError({
			statusCode: 500,
			message: error?.message ?? "Signed URL generation failed",
		});
	}

	return { url: data.signedUrl };
});
