interface PromptStep {
	title: string;
	system_prompt_template: string;
	refine_prompt_template: string;
	form_data?: Record<string, unknown> | null;
	form_schema?: any[] | null;
	page?: any;
}

interface PriorStep {
	order: number;
	title: string;
	committed_output: string | null;
}

export interface BuildGenerationPromptParams {
	step: PromptStep;
	priorSteps: PriorStep[];
	mode: "generate" | "refine";
	existingOutput?: string;
	promptOverride?: string | null;
}

export interface BuiltGenerationPrompt {
	systemPrompt: string;
	userMessage: string;
	promptUsed: string;
}

function formatShareholders(shareholders: any[]): string {
	if (!shareholders?.length) return "Nessun azionista registrato.";
	return shareholders.map((s: any, i: number) => {
		if (s.type === "persona_fisica") {
			return [
				`Azionista ${i + 1} (persona fisica):`,
				`  Nome: ${s.first_name ?? "[N/D]"} ${s.last_name ?? "[N/D]"}`,
				`  Luogo di nascita: ${s.place_of_birth ?? "[N/D]"}`,
				`  Data di nascita: ${s.date_of_birth ?? "[N/D]"}`,
				`  Indirizzo: ${s.address ?? "[N/D]"}`,
				`  Codice fiscale: ${s.codice_fiscale ?? "[N/D]"}`,
				`  Quota: ${s.quota_pct != null ? `${s.quota_pct}%` : "[N/D]"}`,
			].join("\n");
		}

		return [
			`Azionista ${i + 1} (persona giuridica):`,
			`  Denominazione: ${s.company_name ?? "[N/D]"} ${s.company_form ?? ""}`,
			`  Sede legale: ${s.registered_address ?? "[N/D]"}`,
			`  Codice fiscale/P.IVA: ${s.codice_fiscale ?? "[N/D]"}`,
			`  Quota: ${s.quota_pct != null ? `${s.quota_pct}%` : "[N/D]"}`,
			`  Legale rappresentante: ${s.legal_rep ?? "[DA COMPLETARE]"}`,
		].join("\n");
	}).join("\n\n");
}

function normalizeSoci(soci: any[] | null | undefined): any[] {
	if (!soci?.length) return [];
	return soci.map((s) => {
		if (s.tipo === "persona_fisica") {
			return {
				type: "persona_fisica",
				first_name: s.ragione_sociale ?? "",
				last_name: "",
				place_of_birth: "",
				date_of_birth: "",
				address: s.sede ?? "",
				codice_fiscale: s.codice_fiscale ?? "",
				quota_pct: s.quota ?? null,
			};
		}

		return {
			type: "persona_giuridica",
			company_name: s.ragione_sociale ?? "",
			company_form: "",
			registered_address: s.sede ?? "",
			codice_fiscale: s.codice_fiscale ?? "",
			quota_pct: s.quota ?? null,
			legal_rep: s.legale_rappresentante ?? null,
		};
	});
}

function formatSubsidiaries(subsidiaries: any[]): string {
	if (!subsidiaries?.length) return "Nessuna società partecipata registrata.";
	return subsidiaries.map((s: any, i: number) => [
		`Partecipata ${i + 1}:`,
		`  Denominazione: ${s.company_name ?? "[N/D]"} ${s.company_form ?? ""}`,
		`  Paese: ${s.country ?? "Italia"}`,
		`  Quota detenuta: ${s.quota_held_pct != null ? `${s.quota_held_pct}%` : "[N/D]"}`,
		`  Legale rappresentante: ${s.legal_rep ?? "[DA COMPLETARE]"}`,
	].join("\n")).join("\n\n");
}

function normalizePartecipate(partecipate: any[] | null | undefined): any[] {
	if (!partecipate?.length) return [];
	return partecipate.map((p) => ({
		type: p.tipo ?? "persona_giuridica",
		company_name: p.ragione_sociale ?? "",
		company_form: "",
		registered_address: p.sede ?? "",
		country: "Italia",
		codice_fiscale: p.codice_fiscale ?? null,
		quota_held_pct: p.quota ?? null,
		legal_rep: p.legale_rappresentante ?? null,
	}));
}

function serializeFormData(
	formData: Record<string, unknown>,
	formSchema: any[],
): string {
	const lines: string[] = [];
	for (const field of formSchema) {
		const value = formData[field.key];
		if (value === null || value === undefined || value === "") continue;
		if (field.type === "file") continue;
		if (field.type === "visura_upload") {
			const visura = value as {
				filename?: string;
				shareholders?: any[];
				subsidiaries?: any[];
				missing?: unknown;
			};
			lines.push(
				[
					"Struttura societaria estratta dalla visura camerale:",
					"",
					"Azionisti:",
					formatShareholders(visura.shareholders ?? []),
					"",
					"Società partecipate:",
					formatSubsidiaries(visura.subsidiaries ?? []),
				].join("\n"),
			);
			continue;
		}
		if (field.type === "repeatable_group" && Array.isArray(value)) {
			(value as Record<string, unknown>[]).forEach((item, i) => {
				if (item.ip_linked === "No") return;
				const parts: string[] = [`${field.label ?? field.key} ${i + 1}:`];
				for (const sub of field.fields ?? []) {
					const sv = item[sub.key];
					if (sv === null || sv === undefined || sv === "") continue;
					parts.push(`  ${sub.label ?? sub.key}: ${sv}`);
				}
				lines.push(parts.join("\n"));
			});
			continue;
		}
		if (field.conditional) {
			const condVal = formData[field.conditional.key];
			if (condVal !== field.conditional.value) continue;
		}
		lines.push(`${field.label ?? field.key}: ${value}`);
	}
	return lines.join("\n\n");
}

function buildPriorContext(prior: PriorStep[]): string {
	const blocks = prior
		.filter((s) => s.committed_output)
		.map((s) => `--- Sezione ${s.order} — ${s.title} ---\n${s.committed_output}`);
	const full = blocks.join("\n\n");
	if (full.length <= 24000) return full;
	const anchor = prior.filter((s) => s.order <= 3 && s.committed_output);
	const rest = prior.filter((s) => s.order > 3 && s.committed_output).slice(-3);
	return [...anchor, ...rest]
		.map((s) => `--- Sezione ${s.order} — ${s.title} ---\n${s.committed_output}`)
		.join("\n\n");
}

export function buildGenerationPrompt({
	step,
	priorSteps,
	mode,
	existingOutput = "",
	promptOverride = null,
}: BuildGenerationPromptParams): BuiltGenerationPrompt {
	const page = step.page;
	const c = page?.client;
	const taxYear = page?.tax_year;
	const shareholders = c?.soci?.length ? normalizeSoci(c.soci) : c?.shareholders;
	const subsidiaries = c?.partecipate?.length ? normalizePartecipate(c.partecipate) : c?.subsidiaries;
	const companyContext = c
		? [
			`Ragione sociale: ${c.company_name ?? c.name ?? "N/D"} ${c.company_form ?? ""}`.trim(),
			c.industry_sector ? `Settore: ${c.industry_sector}` : null,
			c.employee_count ? `Dipendenti: ${c.employee_count}` : null,
			taxYear ? `Anno fiscale: ${taxYear}` : null,
			page?.referente ? `Referente progetto: ${page.referente}` : null,
			c.legal_representative ? `Legale rappresentante: ${c.legal_representative}` : null,
			c.vat_number ? `P.IVA: ${c.vat_number}` : null,
			c.codice_fiscale ? `Codice fiscale: ${c.codice_fiscale}` : null,
			c.registered_address ? `Sede legale: ${c.registered_address}` : null,
			c.board_members?.length
				? `Membri CdA: ${(c.board_members as string[]).join(", ")}`
				: null,
			`\nAzionisti:\n${formatShareholders(shareholders)}`,
			`\nSocietà partecipate:\n${formatSubsidiaries(subsidiaries)}`,
		].filter(Boolean).join("\n")
		: "";

	const defaultSystemPrompt =
		mode === "generate" ? step.system_prompt_template : step.refine_prompt_template;
	const systemPrompt = promptOverride?.trim() ? promptOverride : defaultSystemPrompt;
	const formDataBlock =
		step.form_data && step.form_schema
			? serializeFormData(step.form_data, step.form_schema)
			: "";
	const priorContext = buildPriorContext(priorSteps);
	const userMessage = [
		companyContext ? `Informazioni aziendali:\n${companyContext}` : "",
		priorContext ? `Sezioni precedenti già redatte:\n${priorContext}` : "",
		formDataBlock ? `Dati del passaggio:\n${formDataBlock}` : "",
		mode === "refine" && existingOutput
			? `Bozza esistente da raffinare:\n${existingOutput}`
			: "",
		`Si prega di ${mode === "generate" ? "scrivere" : "raffinare"} la sezione "${step.title}" ora.`,
	]
		.filter(Boolean)
		.join("\n\n");

	return {
		systemPrompt,
		userMessage,
		promptUsed: `${systemPrompt}\n\n---\n\n${userMessage}`,
	};
}

export function splitPromptUsed(promptUsed: string): BuiltGenerationPrompt {
	const separator = "\n\n---\n\n";
	const index = promptUsed.indexOf(separator);
	if (index === -1) {
		return {
			systemPrompt: promptUsed,
			userMessage: "Esegui la regola di generazione fornita.",
			promptUsed,
		};
	}

	const systemPrompt = promptUsed.slice(0, index);
	const userMessage = promptUsed.slice(index + separator.length);
	return {
		systemPrompt,
		userMessage,
		promptUsed,
	};
}
