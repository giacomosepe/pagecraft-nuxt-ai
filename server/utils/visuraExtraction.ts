export const DEFAULT_VISURA_EXTRACTION_PROMPT = `You are a data extraction assistant specialising in Italian company documents.
You will receive a Visura Camerale Storica (Italian company registry extract) as a PDF document.
Extract shareholder, subsidiary, board, and legal representative data and return it as a single JSON object.
Return ONLY valid JSON — no prose, no markdown, no code fences.

The JSON must match this exact structure:
{
  "soci": [
    {
      "entity_type": "persona_fisica",
      "nome": "string or null",
      "percentuale": number or null,
      "indirizzo": "string or null",
      "cf": "string or null",
      "luogo_nascita": "string or null"
    },
    {
      "entity_type": "persona_giuridica",
      "nome": "string or null",
      "percentuale": number or null,
      "indirizzo": "string or null",
      "cf": "string or null",
      "legale_rappresentante": "string or null"
    }
  ],
  "partecipate": [
    {
      "nome": "string or null",
      "forma_giuridica": "string or null",
      "paese": "string or null",
      "percentuale_detenuta": number or null,
      "indirizzo": "string or null",
      "cf": "string or null",
      "legale_rappresentante": "string or null"
    }
  ],
  "board": [
    {
      "nome": "string or null",
      "ruolo": "string or null"
    }
  ],
  "legale_rappresentante_societa": "string or null"
}

Rules:
- Distinguish soci from partecipate. Soci own shares in the company. Partecipate are companies owned by the company.
- For every socio, set entity_type to either persona_fisica or persona_giuridica.
- For persona_fisica soci, do not include legale_rappresentante.
- For persona_giuridica soci and partecipate, extract legale_rappresentante when available; otherwise use null.
- Use null for any field you cannot find — never invent data.
- percentuale and percentuale_detenuta are numbers between 0 and 100, not strings.
- If no records are found for an array, return an empty array.
- Do not include any text outside the JSON object.`;

function cleanString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	const parsed = Number(String(value ?? "").replace("%", "").replace(",", ".").trim());
	return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeVisuraExtraction(value: unknown) {
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

	const soci = sociSource.map((item) => {
		const socio = item as Record<string, unknown>;
		if (socio.entity_type === "persona_fisica" || socio.type === "persona_fisica") {
			const fallbackName = [socio.first_name, socio.last_name].map(cleanString).filter(Boolean).join(" ");
			const nome = cleanString(socio.nome) ?? (fallbackName || null);
			return {
				entity_type: "persona_fisica",
				nome,
				percentuale: cleanNumber(socio.percentuale ?? socio.quota_pct),
				indirizzo: cleanString(socio.indirizzo ?? socio.address),
				cf: cleanString(socio.cf ?? socio.codice_fiscale),
				luogo_nascita: cleanString(socio.luogo_nascita ?? socio.place_of_birth),
			};
		}

		const fallbackName = [socio.company_name, socio.company_form].map(cleanString).filter(Boolean).join(" ");
		const nome = cleanString(socio.nome) ?? (fallbackName || null);
		return {
			entity_type: "persona_giuridica",
			nome,
			percentuale: cleanNumber(socio.percentuale ?? socio.quota_pct),
			indirizzo: cleanString(socio.indirizzo ?? socio.registered_address),
			cf: cleanString(socio.cf ?? socio.codice_fiscale),
			legale_rappresentante: cleanString(socio.legale_rappresentante ?? socio.legal_rep),
		};
	});

	const partecipate = partecipateSource.map((item) => {
		const partecipata = item as Record<string, unknown>;
		return {
			nome: cleanString(partecipata.nome ?? partecipata.company_name),
			forma_giuridica: cleanString(partecipata.forma_giuridica ?? partecipata.company_form),
			paese: cleanString(partecipata.paese ?? partecipata.country),
			percentuale_detenuta: cleanNumber(partecipata.percentuale_detenuta ?? partecipata.quota_held_pct),
			indirizzo: cleanString(partecipata.indirizzo ?? partecipata.registered_address),
			cf: cleanString(partecipata.cf ?? partecipata.codice_fiscale),
			legale_rappresentante: cleanString(partecipata.legale_rappresentante ?? partecipata.legal_rep),
		};
	});

	const board = boardSource.map((item) => {
		const member = item as Record<string, unknown>;
		return {
			nome: cleanString(member.nome),
			ruolo: cleanString(member.ruolo),
		};
	});

	return {
		soci,
		partecipate,
		board,
		legale_rappresentante_societa: cleanString(obj.legale_rappresentante_societa),
	};
}

export function buildVisuraMissingReport(extracted: ReturnType<typeof normalizeVisuraExtraction>) {
	const missing = {
		soci: [] as { index: number; name: string; missing: string[] }[],
		partecipate: [] as { index: number; name: string; missing: string[] }[],
	};

	extracted.soci.forEach((socio, index) => {
		const fields: string[] = [];
		if (!socio.nome) fields.push("nome");
		if (socio.percentuale === null) fields.push("percentuale");
		if (!socio.cf) fields.push("cf");
		if (socio.entity_type === "persona_fisica" && !socio.luogo_nascita) fields.push("luogo_nascita");
		if (socio.entity_type === "persona_giuridica" && !socio.legale_rappresentante) fields.push("legale_rappresentante");
		if (fields.length) missing.soci.push({ index, name: socio.nome ?? `Socio ${index + 1}`, missing: fields });
	});

	extracted.partecipate.forEach((partecipata, index) => {
		const fields: string[] = [];
		if (!partecipata.nome) fields.push("nome");
		if (partecipata.percentuale_detenuta === null) fields.push("percentuale_detenuta");
		if (!partecipata.cf) fields.push("cf");
		if (!partecipata.legale_rappresentante) fields.push("legale_rappresentante");
		if (fields.length) missing.partecipate.push({ index, name: partecipata.nome ?? `Partecipata ${index + 1}`, missing: fields });
	});

	return {
		...missing,
		shareholders: missing.soci,
		subsidiaries: missing.partecipate,
	};
}
