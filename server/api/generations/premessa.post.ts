// server/api/generations/premessa.post.ts
//
// Template-only route for Premessa (step order 2).
// Returns the fixed legal boilerplate with company name and tax year
// substituted. No Claude call — this section is standardised by law.

import { serverSupabaseClient } from "#supabase/server";
import { z } from "zod";
import { buildPremessa } from "../../utils/buildPremessa";

const PremessaSchema = z.object({
	pageId: z.string().uuid(),
	taxYearStart: z.number().int().min(2020).max(2035).optional(),
	taxYearEnd: z.number().int().min(2020).max(2035).optional(),
	legalRepresentative: z.string().optional(),
	templateOverride: z.string().optional().nullable(),
});

function normalizeFormData(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function cleanString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function readTaxYear(value: unknown): number | null {
	const year = Number(String(value ?? "").trim());
	return Number.isInteger(year) && year >= 2020 && year <= 2035 ? year : null;
}

function assertRequired(value: string | number | null, message: string): void {
	if (value === null || (typeof value === "string" && !value.trim())) {
		throw createError({ statusCode: 400, message });
	}
}

export default defineEventHandler(async (event) => {
	// ─── Auth ─────────────────────────────────────────────────────────────────
	const userClient = await serverSupabaseClient(event);
	const {
		data: { user },
	} = await userClient.auth.getUser();
	if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

	// ─── Validate ─────────────────────────────────────────────────────────────
	const body = await readBody(event);
	const parsed = PremessaSchema.safeParse(body);
	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			message: parsed.error.issues[0]?.message ?? "Invalid request",
		});
	}
	const { pageId, taxYearStart, legalRepresentative, templateOverride } = parsed.data;

	// ─── Verify page ownership + load company context ─────────────────────────
	const { data: page, error: pageError } = await userClient
		.from("pages")
		.select(
			"id, client:clients(company_name, name, legal_representative)",
		)
		.eq("id", pageId)
		.single();

	if (pageError || !page) {
		throw createError({ statusCode: 403, message: "Access denied" });
	}

	const { data: steps, error: stepsError } = await userClient
		.from("steps")
		.select("order, form_data")
		.eq("page_id", pageId)
		.order("order", { ascending: true });

	if (stepsError) {
		throw createError({
			statusCode: 500,
			message: "Impossibile caricare i dati degli step.",
		});
	}

	const step1FormData = normalizeFormData(
		steps?.find((step) => step.order === 1)?.form_data,
	);
	const step2FormData = normalizeFormData(
		steps?.find((step) => step.order === 2)?.form_data,
	);
	const client = page.client as {
		company_name?: string | null;
		name?: string | null;
		legal_representative?: string | null;
	} | null;

	const programTitle = cleanString(step1FormData.program_title);
	const companyName = cleanString(client?.company_name) || cleanString(client?.name);
	const taxYear = taxYearStart ?? readTaxYear(step2FormData.esercizio_fiscale);
	const representative =
		cleanString(legalRepresentative) ||
		cleanString(step2FormData.legale_rappresentante) ||
		cleanString(client?.legal_representative);

	assertRequired(programTitle, "Compila il titolo del programma nello Step 1 prima di generare la premessa.");
	assertRequired(companyName, "Collega un cliente con ragione sociale prima di generare la premessa.");
	assertRequired(taxYear, "Compila l'anno di imposta prima di generare la premessa.");
	assertRequired(representative, "Compila il legale rappresentante prima di generare la premessa.");

	// ─── Return plain text — same content-type as streaming route ─────────────
	// No streaming needed here, but we match the Content-Type so the client
	// can handle both routes identically.
	setResponseHeaders(event, {
		"Content-Type": "text/plain; charset=utf-8",
	});

	return buildPremessa({
		programTitle,
		companyName,
		taxYear,
		legalRepresentative: representative,
		templateOverride,
	});
});
