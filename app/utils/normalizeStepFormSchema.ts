import type { StepFormField } from "~/types/app.types";

const STEP_ONE_FRAMEWORK_FIELDS: StepFormField[] = [
	{
		key: "program_title",
		label: "Titolo del programma",
		type: "project_detail",
		placeholder: "es. Nuovo Patent Box 2025",
		required: true,
		hint: "Collegato al titolo del documento.",
	},
	{
		key: "company_name",
		label: "Ragione sociale",
		type: "client_detail",
		placeholder: "es. Acme S.r.l.",
		required: true,
		hint: "Collegato alla scheda cliente.",
	},
	{
		key: "tax_year",
		label: "Anno di imposta",
		type: "project_detail",
		placeholder: "es. 2026",
		required: true,
		hint: "Collegato ai dettagli progetto.",
	},
	{
		key: "legal_representative",
		label: "Legale rappresentante",
		type: "client_detail",
		placeholder: "es. Mario Rossi",
		required: true,
		hint: "Collegato alla scheda cliente.",
	},
];

const STEP_TWO_FRAMEWORK_FIELDS: StepFormField[] = [
	{
		key: "tax_year",
		label: "Anno di imposta",
		type: "project_detail",
		placeholder: "es. 2026",
		required: true,
		hint: "Collegato ai dettagli progetto.",
	},
	{
		key: "legal_representative",
		label: "Legale rappresentante",
		type: "client_detail",
		placeholder: "es. Mario Rossi",
		required: true,
		hint: "Collegato alla scheda cliente.",
	},
];

const STEP_THREE_DOCUMENT_REFERENCE_FIELD: StepFormField = {
	key: "document_reference",
	label: "Documento di riferimento",
	type: "document_reference",
	hint: "Collegamento a un documento di riferimento. La visualizzazione del link verrà gestita in un passaggio successivo.",
	required: false,
};

export function normalizeStepFormSchema(
	fields: StepFormField[],
	stepOrder: number,
): StepFormField[] {
	const fieldKeys = new Set(fields.map((field) => field.key));
	const fieldTypes = new Set(fields.map((field) => field.type));

	if (
		stepOrder === 1 &&
		(fieldKeys.has("legal_citation") ||
			fieldKeys.has("ragione_sociale") ||
			!fieldTypes.has("client_detail") ||
			!fieldTypes.has("project_detail"))
	) {
		return STEP_ONE_FRAMEWORK_FIELDS;
	}

	if (
		stepOrder === 2 &&
		(fieldKeys.has("esercizio_fiscale") ||
			fieldKeys.has("legale_rappresentante") ||
			!fieldTypes.has("client_detail") ||
			!fieldTypes.has("project_detail"))
	) {
		return STEP_TWO_FRAMEWORK_FIELDS;
	}

	if (stepOrder === 3 && !fieldKeys.has("document_reference")) {
		return [STEP_THREE_DOCUMENT_REFERENCE_FIELD, ...fields];
	}

	return fields;
}
