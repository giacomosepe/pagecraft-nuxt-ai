export interface Socio {
	entity_type: "persona_fisica" | "persona_giuridica";
	nome: string | null;
	percentuale: number | null;
	indirizzo: string | null;
	cf: string | null;
	legale_rappresentante?: string | null;
	luogo_nascita?: string | null;
}

export interface Partecipata {
	nome: string | null;
	forma_giuridica: string | null;
	paese: string | null;
	percentuale_detenuta: number | null;
	indirizzo: string | null;
	cf: string | null;
	legale_rappresentante: string | null;
}

export interface BoardMember {
	nome: string | null;
	ruolo: string | null;
}

export interface ExtractionResult {
	soci: Socio[];
	partecipate: Partecipata[];
	board: BoardMember[];
	legale_rappresentante_societa: string | null;
	missing?: {
		soci?: { index: number; name: string; missing: string[] }[];
		partecipate?: { index: number; name: string; missing: string[] }[];
		shareholders?: { index: number; name: string; missing: string[] }[];
		subsidiaries?: { index: number; name: string; missing: string[] }[];
	};
}

function cleanString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	const parsed = Number(String(value ?? "").replace("%", "").replace(",", ".").trim());
	return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLegacyShareholder(value: Record<string, unknown>): Socio {
	if (value.type === "persona_fisica") {
		const nome = [value.first_name, value.last_name]
			.map(cleanString)
			.filter(Boolean)
			.join(" ");
		return {
			entity_type: "persona_fisica",
			nome: nome || cleanString(value.nome),
			percentuale: cleanNumber(value.quota_pct ?? value.percentuale),
			indirizzo: cleanString(value.address ?? value.indirizzo),
			cf: cleanString(value.codice_fiscale ?? value.cf),
			luogo_nascita: cleanString(value.place_of_birth ?? value.luogo_nascita),
		};
	}

	const nome = [value.company_name, value.company_form]
		.map(cleanString)
		.filter(Boolean)
		.join(" ");
	return {
		entity_type: "persona_giuridica",
		nome: nome || cleanString(value.nome),
		percentuale: cleanNumber(value.quota_pct ?? value.percentuale),
		indirizzo: cleanString(value.registered_address ?? value.indirizzo),
		cf: cleanString(value.codice_fiscale ?? value.cf),
		legale_rappresentante: cleanString(value.legal_rep ?? value.legale_rappresentante),
	};
}

function normalizeLegacySubsidiary(value: Record<string, unknown>): Partecipata {
	return {
		nome: cleanString(value.company_name ?? value.nome),
		forma_giuridica: cleanString(value.company_form ?? value.forma_giuridica),
		paese: cleanString(value.country ?? value.paese),
		percentuale_detenuta: cleanNumber(value.quota_held_pct ?? value.percentuale_detenuta),
		indirizzo: cleanString(value.registered_address ?? value.indirizzo),
		cf: cleanString(value.codice_fiscale ?? value.cf),
		legale_rappresentante: cleanString(value.legal_rep ?? value.legale_rappresentante),
	};
}

export function normalizeExtractionResult(value: unknown): ExtractionResult {
	const obj = value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
	const sociSource = Array.isArray(obj.soci)
		? obj.soci
		: Array.isArray(obj.shareholders)
			? obj.shareholders
			: [];
	const partecipateSource = Array.isArray(obj.partecipate)
		? obj.partecipate
		: Array.isArray(obj.subsidiaries)
			? obj.subsidiaries
			: [];
	const boardSource = Array.isArray(obj.board) ? obj.board : [];

	return {
		soci: sociSource.map((item) => normalizeLegacyShareholder(item as Record<string, unknown>)),
		partecipate: partecipateSource.map((item) => normalizeLegacySubsidiary(item as Record<string, unknown>)),
		board: boardSource.map((item) => {
			const member = item as Record<string, unknown>;
			return {
				nome: cleanString(member.nome),
				ruolo: cleanString(member.ruolo),
			};
		}),
		legale_rappresentante_societa: cleanString(obj.legale_rappresentante_societa),
		missing: obj.missing as ExtractionResult["missing"],
	};
}
