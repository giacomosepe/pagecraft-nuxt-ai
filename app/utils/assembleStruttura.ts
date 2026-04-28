// app/utils/assembleStruttura.ts
//
// Assembles Struttura Partecipativa text blocks from visura extraction data.
// Pure function — no Vue, no side effects, no API calls.
// Types mirror server/api/visura/extract-pdf.post.ts exactly.

import { formatISODate } from "~/utils/date";

const DA_COMPLETARE = "[DA COMPLETARE]";

function val(v: string | number | null | undefined): string {
  return v != null && v !== "" ? String(v) : DA_COMPLETARE;
}

// ─── Types — mirror extract-pdf.post.ts ──────────────────────────────────────

export interface ShareholderFisica {
  type: "persona_fisica";
  first_name: string | null;
  last_name: string | null;
  place_of_birth: string | null;
  date_of_birth: string | null;
  address: string | null;
  codice_fiscale: string | null;
  quota_pct: number | null;
}

export interface ShareholderGiuridica {
  type: "persona_giuridica";
  company_name: string;
  company_form: string;
  registered_address: string | null;
  codice_fiscale: string | null;
  quota_pct: number | null;
  legal_rep: null;
  legal_rep_missing: true;
}

export type Shareholder = ShareholderFisica | ShareholderGiuridica;

export interface Subsidiary {
  type: "persona_giuridica";
  company_name: string;
  company_form: string | null;
  registered_address: string | null;
  country: string | null;
  codice_fiscale: string | null;
  quota_held_pct: number | null;
  legal_rep: null;
  legal_rep_missing: true;
}

// ─── Renderers ────────────────────────────────────────────────────────────────

function renderShareholder(s: Shareholder): string {
  if (s.type === "persona_fisica") {
    const name = `${val(s.first_name)} ${val(s.last_name)}`.trim();
    const dob = s.date_of_birth ? formatISODate(s.date_of_birth) : DA_COMPLETARE;
    return `${name} è socio della società con una quota pari al ${val(s.quota_pct)}%, nato/a a ${val(s.place_of_birth)} il ${dob}, residente in ${val(s.address)}, codice fiscale ${val(s.codice_fiscale)}.`;
  }

  const company = `${val(s.company_name)} ${val(s.company_form)}`.trim();
  return `${company} detiene una quota pari al ${val(s.quota_pct)}% del capitale sociale, con sede legale in ${val(s.registered_address)}, codice fiscale / P.IVA ${val(s.codice_fiscale)}. Il legale rappresentante risulta ${DA_COMPLETARE}.`;
}

function renderSubsidiary(s: Subsidiary): string {
  const company = `${val(s.company_name)} ${s.company_form ? val(s.company_form) : ""}`.trim();
  return `${company}, con sede in ${val(s.registered_address)} (${val(s.country)}), è partecipata dalla società con una quota pari al ${val(s.quota_held_pct)}%. Il legale rappresentante risulta ${DA_COMPLETARE}.`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function assembleStruttura(
  shareholders: Shareholder[],
  subsidiaries: Subsidiary[],
): string {
  const sections: string[] = [];

  if (shareholders.length > 0) {
    sections.push("SOCI\n\n" + shareholders.map(renderShareholder).join("\n\n"));
  }

  if (subsidiaries.length > 0) {
    sections.push("PARTECIPATE\n\n" + subsidiaries.map(renderSubsidiary).join("\n\n"));
  }

  return sections.join("\n\n");
}
