// app/utils/assembleStruttura.ts
//
// Assembles Step 3 (Struttura Partecipativa) from normalized visura extraction
// data. Missing fields render as [DA COMPLETARE].

import type { ExtractionResult, Partecipata, Socio } from "~/utils/visuraExtraction";
import { normalizeExtractionResult } from "~/utils/visuraExtraction";

const DA_COMPLETARE = "[DA COMPLETARE]";

export interface StrutturaRule {
	intro: string;
	bloccoSociPersonaFisica: string;
	bloccoSociPersonaGiuridica: string;
	bloccoPartecipate: string;
}

export const DEFAULT_STRUTTURA_RULE: StrutturaRule = {
	intro: "",
	bloccoSociPersonaFisica:
		"[NOME SOCIO] detiene una quota pari al [PERCENTUALE]% del capitale sociale, nato/a a [LUOGO DI NASCITA], codice fiscale [CF].",
	bloccoSociPersonaGiuridica:
		"[NOME SOCIO] detiene una quota pari al [PERCENTUALE]% del capitale sociale, con sede legale in [INDIRIZZO], codice fiscale / P.IVA [CF]. Il legale rappresentante è [LEGALE RAPPRESENTANTE].",
	bloccoPartecipate:
		"[NOME CLIENTE] detiene una quota pari al [PERCENTUALE]% del capitale sociale di [NOME PARTECIPATA] ([FORMA GIURIDICA]), con sede legale in [INDIRIZZO], codice fiscale / P.IVA [CF]. Il legale rappresentante è [LEGALE RAPPRESENTANTE].",
};

function val(value: string | number | null | undefined): string {
	return value !== null && value !== undefined && value !== "" ? String(value) : DA_COMPLETARE;
}

function renderPattern(
	pattern: string,
	values: Record<string, string | number | null | undefined>,
): string {
	return Object.entries(values).reduce(
		(text, [key, value]) => text.replaceAll(`[${key}]`, val(value)),
		pattern,
	);
}

function renderSocio(socio: Socio, rule: StrutturaRule): string {
	if (socio.entity_type === "persona_fisica") {
		return renderPattern(rule.bloccoSociPersonaFisica, {
			"NOME SOCIO": socio.nome,
			PERCENTUALE: socio.percentuale,
			"LUOGO DI NASCITA": socio.luogo_nascita,
			CF: socio.cf,
			INDIRIZZO: socio.indirizzo,
		});
	}

	return renderPattern(rule.bloccoSociPersonaGiuridica, {
		"NOME SOCIO": socio.nome,
		PERCENTUALE: socio.percentuale,
		INDIRIZZO: socio.indirizzo,
		CF: socio.cf,
		"LEGALE RAPPRESENTANTE": socio.legale_rappresentante,
	});
}

function renderPartecipata(partecipata: Partecipata, rule: StrutturaRule, clientName?: string | null): string {
	return renderPattern(rule.bloccoPartecipate, {
		"NOME CLIENTE": clientName,
		PERCENTUALE: partecipata.percentuale_detenuta,
		"NOME PARTECIPATA": partecipata.nome,
		"FORMA GIURIDICA": partecipata.forma_giuridica,
		INDIRIZZO: partecipata.indirizzo,
		CF: partecipata.cf,
		"LEGALE RAPPRESENTANTE": partecipata.legale_rappresentante,
		PAESE: partecipata.paese,
	});
}

export function assembleStruttura(
	extraction: ExtractionResult | unknown,
	rule: StrutturaRule = DEFAULT_STRUTTURA_RULE,
	clientName?: string | null,
): string {
	const data = normalizeExtractionResult(extraction);
	const sections: string[] = [];

	if (rule.intro.trim()) {
		sections.push(rule.intro.trim());
	}

	if (data.soci.length > 0) {
		sections.push("SOCI\n\n" + data.soci.map((socio) => renderSocio(socio, rule)).join("\n\n"));
	}

	if (data.partecipate.length > 0) {
		sections.push(
			"PARTECIPATE\n\n" +
			data.partecipate.map((partecipata) => renderPartecipata(partecipata, rule, clientName)).join("\n\n"),
		);
	}

	return sections.join("\n\n");
}
