import type { ClientRecord } from "~/composables/useClientFields";
import type { StepFormField, StepRecord } from "~/types/app.types";
import { assembleStruttura } from "~/utils/assembleStruttura";
import { buildIntestazione } from "~/utils/buildIntestazione";
import { formatDateLong } from "~/utils/date";

export interface StepPreviewParams {
	step: StepRecord | null;
	client: ClientRecord | null;
	taxYear: number | null;
	formValues: Record<string, unknown>;
}

export interface StepPreviewPart {
	text: string;
	isToken: boolean;
}

export interface StepPreviewSection {
	title?: string;
	parts: StepPreviewPart[];
}

export interface StepPreview {
	eyebrow: string;
	title: string;
	sections: StepPreviewSection[];
	tokens: { key: string; label: string }[];
}

function token(key: string): string {
	return `{{${key}}}`;
}

function partText(text: string): StepPreviewPart {
	return { text, isToken: false };
}

function partToken(key: string): StepPreviewPart {
	return { text: key, isToken: true };
}

function textValue(value: unknown): string {
	return value === null || value === undefined ? "" : String(value).trim();
}

function fieldTokens(step: StepRecord | null): { key: string; label: string }[] {
	const schema = step?.form_schema;
	if (!Array.isArray(schema)) return [];
	return (schema as StepFormField[])
		.filter((field) =>
			["text", "textarea", "number", "select", "multiselect", "repeatable_group"].includes(field.type),
		)
		.map((field) => ({ key: field.key, label: field.label }));
}

function tokenizeTemplate(text: string): StepPreviewPart[] {
	return text.split(/(\{\{[^}]+\}\})/g)
		.filter(Boolean)
		.map((part) => {
			const match = part.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
			return match ? partToken(match[1]) : partText(part);
		});
}

function clientCompanyName(client: ClientRecord | null): string {
	const base = client?.company_name ?? client?.name ?? token("company_name");
	return client?.company_form ? `${base} ${client.company_form}`.trim() : base;
}

function buildStepOnePreview(params: StepPreviewParams): StepPreview {
	const rendered = buildIntestazione({
		programTitle: textValue(params.formValues.program_title) || token("program_title"),
		legalCitation: textValue(params.formValues.legal_citation) || token("legal_citation"),
		companyName: clientCompanyName(params.client),
		companyForm: "",
		legalRepresentative: params.client?.legal_representative ?? token("legal_representative"),
		taxYear: params.taxYear ?? token("tax_year"),
	});

	return {
		eyebrow: "Template documento",
		title: "Intestazione",
		sections: [{ parts: tokenizeTemplate(rendered) }],
		tokens: [
			{ key: "program_title", label: "Titolo del programma" },
			{ key: "legal_citation", label: "Citazione normativa" },
			{ key: "company_name", label: "Ragione sociale" },
			{ key: "tax_year", label: "Anno fiscale" },
			{ key: "legal_representative", label: "Legale rappresentante" },
		],
	};
}

function buildStepTwoPreview(params: StepPreviewParams): StepPreview {
	const companyName = clientCompanyName(params.client);
	const taxYear = textValue(params.formValues.esercizio_fiscale) || String(params.taxYear ?? token("esercizio_fiscale"));
	const legalRepresentative = textValue(params.formValues.legale_rappresentante) ||
		params.client?.legal_representative ||
		token("legal_representative");
	const date = formatDateLong();

	return {
		eyebrow: "Template documento",
		title: "Premessa",
		sections: [
			{
				parts: tokenizeTemplate(`Premessa

Ragione sociale: ${companyName}
Anno di imposta: ${taxYear}
Legale rappresentante: ${legalRepresentative}
Data di redazione: ${date}

Questo documento costituisce Documentazione Idonea atta a fornire la descrizione delle attività rilevanti dell'impresa ${companyName} e delle spese sostenute per il loro svolgimento in relazione all'Esercizio ${taxYear}.

Il sottoscritto ${legalRepresentative}, in qualità di legale rappresentante della società ${companyName}, attesta che le informazioni contenute nella presente premessa sono predisposte sulla base dei dati aziendali disponibili.`),
			},
		],
		tokens: [
			{ key: "company_name", label: "Ragione sociale" },
			{ key: "esercizio_fiscale", label: "Esercizio fiscale" },
			{ key: "legal_representative", label: "Legale rappresentante" },
		],
	};
}

function buildStepThreePreview(params: StepPreviewParams): StepPreview {
	const extractionField = fieldTokens(params.step).find((field) => field.key === "visura_pdf");
	const extracted = params.formValues.visura_pdf;
	const assembled = assembleStruttura(extracted, undefined, clientCompanyName(params.client));
	const preview = assembled.trim() || `SOCI

${token("visura_pdf")} genererà i paragrafi relativi ai soci della società.

PARTECIPATE

${token("visura_pdf")} genererà i paragrafi relativi alle società partecipate, se presenti nella visura.`;

	return {
		eyebrow: "Template documento",
		title: "Struttura partecipativa",
		sections: [{ parts: tokenizeTemplate(preview) }],
		tokens: [
			extractionField ?? { key: "visura_pdf", label: "Visura camerale" },
			{ key: "note_integrative", label: "Note integrative" },
		],
	};
}

function buildStepFourPreview(params: StepPreviewParams): StepPreview {
	const activityLabel = token("activities");
	const contextNote = token("context_note");
	const investorNature = token("investor_nature");
	const associatedOps = token("has_associated_ops");

	return {
		eyebrow: "Schema AI",
		title: "Attività rilevanti",
		sections: [
			{
				title: "Attività rilevanti",
				parts: tokenizeTemplate(`Le attività di ricerca e sviluppo svolte da ${clientCompanyName(params.client)} nel corso dell'esercizio fiscale ${params.taxYear ?? token("tax_year")} saranno descritte a partire da ${activityLabel}. ${contextNote} servirà come contesto generale per collegare le attività alla privativa oggetto di agevolazione.`),
			},
			{
				title: "Natura di investitore",
				parts: tokenizeTemplate(`La natura di investitore dell'impresa sarà descritta usando ${investorNature}. Se il campo resta vuoto, il documento evidenzierà la sezione come da completare.`),
			},
			{
				title: "Operazioni con imprese associate",
				parts: tokenizeTemplate(`La sezione sulle operazioni con imprese associate seguirà la scelta ${associatedOps} e userà la descrizione dedicata quando necessaria.`),
			},
		],
		tokens: fieldTokens(params.step),
	};
}

export function buildStepPreview(params: StepPreviewParams): StepPreview {
	if (params.step?.order === 1) return buildStepOnePreview(params);
	if (params.step?.order === 2) return buildStepTwoPreview(params);
	if (params.step?.order === 3) return buildStepThreePreview(params);
	if (params.step?.order === 4) return buildStepFourPreview(params);

	return {
		eyebrow: "Struttura prevista",
		title: params.step?.title ?? "Step corrente",
		sections: [
			{
				parts: [
					partText("Questo step produrrà un testo usando i dati inseriti nel pannello a destra. Completa le variabili evidenziate per vedere il documento prendere forma."),
				],
			},
		],
		tokens: fieldTokens(params.step),
	};
}
