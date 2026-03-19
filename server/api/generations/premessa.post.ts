// server/api/generations/premessa.post.ts
//
// Template-only route for Premessa (step order 2).
// Returns the fixed legal boilerplate with company name and tax year
// substituted. No Claude call — this section is standardised by law.

import { serverSupabaseClient } from "#supabase/server";
import { z } from "zod";

const PremessaSchema = z.object({
	pageId: z.string().uuid(),
	taxYearStart: z.number().int().min(2020).max(2035),
	taxYearEnd: z.number().int().min(2020).max(2035),
});

// ─── The fixed legal template ─────────────────────────────────────────────────
// Source: Provvedimento n. prot. 48243 AdE 15/02/2022 + Circolare 5/E 24/02/2023
// Variables: {{COMPANY_NAME}}, {{TAX_YEARS}}
// TAX_YEARS is either "YYYY" (single year) or "YYYY, YYYY" (range)

function buildPremessa(companyName: string, taxYears: string): string {
	return `Premessa

Questo documento costituisce Documentazione Idonea atta a fornire la descrizione delle attività rilevanti dell'impresa ${companyName} e delle spese sostenute per il loro svolgimento in relazione agli Esercizi ${taxYears} sulla base di quanto previsto dall'Articolo 6 del decreto-legge 21 ottobre 2021, n. 146, convertito, con modificazioni, dalla legge 17 dicembre 2021, n. 215, così come successivamente modificato dalla legge 30 dicembre 2021, n. 234.

Come da disposizioni attuative contenute nel Provvedimento n. prot. 48243 dell'Agenzia delle Entrate del 15 febbraio 2022 e nella Circolare Agenzia delle Entrate n. 5/E del 24 febbraio 2023, al fine di favorirne la ricostruzione e provare la sussistenza dei costi agevolabili sui quali è stato quantificato il beneficio, la Documentazione contiene i seguenti elementi informativi:

◆ Sezione A

i. Struttura partecipativa dell'impresa anche in relazione alle imprese associate ed eventi straordinari;

ii. Attività rilevanti, natura di investitore ed eventuale attività svolta con imprese associate;

iii. Attività rilevanti commissionate a terzi indipendenti;

iv. Modello organizzativo dell'impresa;

v. Relazione tecnica (in un documento separato);

vi. Funzioni, rischi e beni dell'impresa.

◆ Sezione B

i. Spese agevolabili sostenute in riferimento a ciascun bene immateriale;

ii. Costo del personale impiegato in attività rilevanti;

iii. Costi promiscui;

iv. Individuazione delle variazioni fiscali direttamente e indirettamente riferibili ai beni immateriali oggetto di agevolazione.

Nel caso in cui il contribuente si sia avvalso anche del meccanismo premiale previsto dal comma 10-bis dell'Articolo 6, la Sezione B conterrà anche uno specifico prospetto atto ad illustrare il processo di determinazione della corrispondente quota di beneficio.

Fermo restando i principi generali di effettività, inerenza e congruità, tutti i costi oggetto di maggiorazione — assunti al netto di eventuali contributi ricevuti dall'impresa per il loro finanziamento — rilevano nel loro ammontare fiscalmente deducibile e sono imputati, ai fini del calcolo della maggiorazione del 110%, a ciascun periodo di imposta in applicazione del principio di competenza di cui ai commi 1 e 2 dell'articolo 109 del TUIR, indipendentemente dai regimi e dai principi contabili adottati dall'impresa, nonché dall'eventuale capitalizzazione degli stessi costi.`;
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
	const { pageId, taxYearStart, taxYearEnd } = parsed.data;

	// ─── Verify page ownership + load company name ────────────────────────────
	const { data: page, error: pageError } = await userClient
		.from("pages")
		.select(
			"id, company_profile:company_profiles(company_name)",
		)
		.eq("id", pageId)
		.single();

	if (pageError || !page) {
		throw createError({ statusCode: 403, message: "Access denied" });
	}

	const companyName =
		(page.company_profile as any)?.company_name ?? "[RAGIONE SOCIALE]";

	// ─── Build tax year string ─────────────────────────────────────────────────
	const taxYears =
		taxYearStart === taxYearEnd
			? `${taxYearStart}`
			: `${taxYearStart}, ${taxYearEnd}`;

	// ─── Return plain text — same content-type as streaming route ─────────────
	// No streaming needed here, but we match the Content-Type so the client
	// can handle both routes identically.
	setResponseHeaders(event, {
		"Content-Type": "text/plain; charset=utf-8",
	});

	return buildPremessa(companyName, taxYears);
});
