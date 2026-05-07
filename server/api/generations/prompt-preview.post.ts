import {
	serverSupabaseClient,
	serverSupabaseServiceRole,
} from "#supabase/server";
import { z } from "zod";
import { buildGenerationPrompt } from "../../utils/generationPrompt";
import { getFrameworkStepExample } from "../../utils/getFrameworkStepExample";
import { getProjectContext } from "../../utils/getProjectContext";
import { getStepFigureCaptions } from "../../utils/getStepFigureCaptions";

const PromptPreviewSchema = z.object({
	stepId: z.string().uuid("Invalid step ID"),
	pageId: z.string().uuid("Invalid page ID"),
	mode: z.enum(["generate", "refine"]).default("generate"),
	existingOutput: z.string().optional().default(""),
});

export default defineEventHandler(async (event) => {
	const userClient = await serverSupabaseClient(event);
	const {
		data: { user },
	} = await userClient.auth.getUser();
	if (!user) {
		throw createError({ statusCode: 401, message: "Unauthorized" });
	}

	const body = await readBody(event);
	const parsed = PromptPreviewSchema.safeParse(body);
	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			message: parsed.error.issues[0]?.message ?? "Invalid request body",
		});
	}
	const { stepId, pageId, mode, existingOutput } = parsed.data;

	const { error: ownerError } = await userClient
		.from("pages")
		.select("id")
		.eq("id", pageId)
		.single();

	if (ownerError) {
		throw createError({ statusCode: 403, message: "Access denied" });
	}

	const supabase = serverSupabaseServiceRole(event);
	const { data: step, error: stepError } = await supabase
		.from("steps")
		.select(
			`
			id, framework_step_id, order, title, system_prompt_template, refine_prompt_template, form_data, form_schema,
			page:pages (
				title, tax_year, referente,
				client:clients (
					name, company_name, company_form, industry_sector, employee_count,
					legal_representative, vat_number, codice_fiscale, registered_address,
					board_members, soci, partecipate, shareholders, subsidiaries
				)
			)
		`,
		)
		.eq("id", stepId)
		.eq("page_id", pageId)
		.single();

	if (stepError || !step) {
		throw createError({ statusCode: 404, message: "Step not found" });
	}

	const { data: priorSteps } = await supabase
		.from("steps")
		.select("order, title, committed_output")
		.eq("page_id", pageId)
		.lt("order", (step as any).order)
		.not("committed_output", "is", null)
		.order("order", { ascending: true });

	const [projectContext, stepExample, figureCaptions] = await Promise.all([
		getProjectContext(pageId, (step as any).order, supabase as any),
		getFrameworkStepExample((step as any).framework_step_id, supabase as any),
		getStepFigureCaptions((step as any).id, supabase as any),
	]);

	return buildGenerationPrompt({
		step: step as any,
		priorSteps: priorSteps ?? [],
		mode,
		existingOutput,
		projectContext,
		stepExample,
		figureCaptions,
	}).promptUsed;
});
