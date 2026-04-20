import { serverSupabaseClient } from "#supabase/server";
import { z } from "zod";

const DeleteSchema = z.object({
	entity: z.enum(["client", "project", "document"]),
	id: z.string().uuid(),
});

export default defineEventHandler(async (event) => {
	const client = await serverSupabaseClient(event);
	const {
		data: { user },
	} = await client.auth.getUser();

	if (!user) {
		throw createError({ statusCode: 401, message: "Unauthorized" });
	}

	const body = await readBody(event);
	const parsed = DeleteSchema.safeParse(body);

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			message: parsed.error.issues[0]?.message,
		});
	}

	const { entity, id } = parsed.data;

	if (entity === "document") {
		const { error } = await client
			.from("pages")
			.delete()
			.eq("id", id)
			.eq("user_id", user.id);

		if (error) {
			throw createError({ statusCode: 500, message: error.message });
		}

		return { success: true };
	}

	if (entity === "project") {
		const { error: pagesError } = await client
			.from("pages")
			.delete()
			.eq("folder_id", id)
			.eq("user_id", user.id);

		if (pagesError) {
			throw createError({ statusCode: 500, message: pagesError.message });
		}

		const { error: folderError } = await client
			.from("folders")
			.delete()
			.eq("id", id)
			.eq("user_id", user.id);

		if (folderError) {
			throw createError({ statusCode: 500, message: folderError.message });
		}

		return { success: true };
	}

	const { data: folders, error: foldersError } = await client
		.from("folders")
		.select("id")
		.eq("client_id", id)
		.eq("user_id", user.id);

	if (foldersError) {
		throw createError({ statusCode: 500, message: foldersError.message });
	}

	const folderIds = (folders ?? []).map((folder) => folder.id);

	if (folderIds.length) {
		const { error: projectPagesError } = await client
			.from("pages")
			.delete()
			.in("folder_id", folderIds)
			.eq("user_id", user.id);

		if (projectPagesError) {
			throw createError({ statusCode: 500, message: projectPagesError.message });
		}

		const { error: deleteFoldersError } = await client
			.from("folders")
			.delete()
			.in("id", folderIds)
			.eq("user_id", user.id);

		if (deleteFoldersError) {
			throw createError({ statusCode: 500, message: deleteFoldersError.message });
		}
	}

	const { error: standalonePagesError } = await client
		.from("pages")
		.delete()
		.eq("client_id", id)
		.is("folder_id", null)
		.eq("user_id", user.id);

	if (standalonePagesError) {
		throw createError({ statusCode: 500, message: standalonePagesError.message });
	}

	const { error: clientError } = await client
		.from("clients")
		.delete()
		.eq("id", id)
		.eq("user_id", user.id);

	if (clientError) {
		throw createError({ statusCode: 500, message: clientError.message });
	}

	return { success: true };
});
