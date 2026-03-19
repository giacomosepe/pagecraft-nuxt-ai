// ─── Shareholder ──────────────────────────────────────────────────────────────

export type ShareholderType = "persona_fisica" | "persona_giuridica";

export interface ShareholderPerson {
  type: "persona_fisica";
  first_name: string;
  last_name: string;
  place_of_birth: string; // Comune e provincia
  date_of_birth: string; // ISO date string YYYY-MM-DD
  address: string; // Via, numero, CAP, Comune, Provincia
  codice_fiscale: string;
  quota_pct: number | null;
}

export interface ShareholderCompany {
  type: "persona_giuridica";
  company_name: string;
  company_form: string; // "S.r.l.", "S.p.A.", "S.a.s.", etc.
  registered_address: string; // Sede legale completa
  codice_fiscale: string; // Partita IVA or CF
  quota_pct: number | null;
  legal_rep: string | null; // NULLABLE — highlight for user if missing
  legal_rep_missing: boolean; // flag to drive UI highlight
}

export type Shareholder = ShareholderPerson | ShareholderCompany;

// ─── Subsidiary (Partecipata) ─────────────────────────────────────────────────
// Same structure — a partecipata is almost always a company, but a person
// holding a participation is technically possible. Mirror the pattern.

export interface SubsidiaryCompany {
  type: "persona_giuridica";
  company_name: string;
  company_form: string;
  registered_address: string;
  country: string;
  codice_fiscale: string | null;
  quota_held_pct: number | null; // % held BY the main company
  legal_rep: string | null;
  legal_rep_missing: boolean;
}

export interface SubsidiaryPerson {
  type: "persona_fisica";
  first_name: string;
  last_name: string;
  country: string;
  quota_held_pct: number | null;
}

export type Subsidiary = SubsidiaryCompany | SubsidiaryPerson;

// ─── Missing fields audit ─────────────────────────────────────────────────────
// Produced after extraction or save — tells the UI what to highlight.

export interface MissingFieldsReport {
  shareholders: {
    index: number;
    name: string;
    missing: string[]; // e.g. ["legal_rep", "codice_fiscale"]
  }[];
  subsidiaries: {
    index: number;
    name: string;
    missing: string[];
  }[];
}
