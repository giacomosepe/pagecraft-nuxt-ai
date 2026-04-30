import { serverSupabaseClient } from "#supabase/server";
import { DEFAULT_VISURA_EXTRACTION_PROMPT } from "../../utils/visuraExtraction";

export default defineEventHandler(async (event) => {
	const userClient = await serverSupabaseClient(event);
	const {
		data: { user },
	} = await userClient.auth.getUser();
	if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

	return DEFAULT_VISURA_EXTRACTION_PROMPT;
});
