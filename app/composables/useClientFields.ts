// app/composables/useClientFields.ts
//
// Converts a client record into two things:
//
// 1. A flat variable map for template substitution and form pre-population:
//    { "legal_representative": "Mario Rossi", "shareholders.0.full_name": "Luigi Bianchi", ... }
//
// 2. A formatted Italian prose context string for Claude's user message.
//    This replaces the inline formatting previously done in create.post.ts.
//
// No Claude involved. Pure deterministic data transformation.
// The same map is used by:
//   - StepContextModal: to pre-populate form fields when the step has a formSchema
//   - create.post.ts: to build the companyContext string
//   - Future Word export: to substitute {{variables}} in document templates

import type { Shareholder, Subsidiary } from "~/types/company.types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientRecord {
  id?: string;
  name?: string | null;
  company_name?: string | null;
  company_form?: string | null;
  industry_sector?: string | null;
  employee_count?: number | null;
  legal_representative?: string | null;
  vat_number?: string | null;
  codice_fiscale?: string | null;
  registered_address?: string | null;
  board_members?: string[] | null;
  shareholders?: Shareholder[] | null;
  subsidiaries?: Subsidiary[] | null;
}

export interface ClientVariableMap {
  [key: string]: string;
}

// ─── Main composable ──────────────────────────────────────────────────────────

export function useClientFields(client: ClientRecord | null | undefined, taxYear?: number | null) {

  // ─── Variable map ───────────────────────────────────────────────────────────
  // Flat key → value pairs. Used to pre-fill form fields and for substitution.
  // Keys use dot notation for nested entities: "shareholders.0.full_name"
  const variableMap = computed((): ClientVariableMap => {
    if (!client) return {};

    const map: ClientVariableMap = {};

    // Top-level scalar fields
    const displayName = client.company_name ?? client.name ?? "";
    const fullName = client.company_form
      ? `${displayName} ${client.company_form}`.trim()
      : displayName;

    map["company_name"]         = displayName;
    map["company_full_name"]    = fullName;       // "Acme S.r.l."
    map["company_form"]         = client.company_form ?? "";
    map["industry_sector"]      = client.industry_sector ?? "";
    map["employee_count"]       = client.employee_count?.toString() ?? "";
    map["legal_representative"] = client.legal_representative ?? "";
    map["vat_number"]           = client.vat_number ?? "";
    map["codice_fiscale"]       = client.codice_fiscale ?? "";
    map["registered_address"]   = client.registered_address ?? "";
    map["tax_year"]             = taxYear?.toString() ?? "";

    // Board members — flat list and indexed
    const board = client.board_members ?? [];
    map["board_members"] = board.join(", ");
    board.forEach((m, i) => { map[`board_members.${i}`] = m; });

    // Shareholders — indexed, with shorthand helpers
    const shareholders = (client.shareholders ?? []) as Shareholder[];
    shareholders.forEach((s, i) => {
      const prefix = `shareholders.${i}`;
      map[`${prefix}.type`] = s.type;
      map[`${prefix}.quota_pct`] = s.quota_pct?.toString() ?? "";

      if (s.type === "persona_fisica") {
        const fullName = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim();
        map[`${prefix}.full_name`]     = fullName;
        map[`${prefix}.first_name`]    = s.first_name ?? "";
        map[`${prefix}.last_name`]     = s.last_name ?? "";
        map[`${prefix}.place_of_birth`] = s.place_of_birth ?? "";
        map[`${prefix}.date_of_birth`]  = s.date_of_birth ?? "";
        map[`${prefix}.address`]        = s.address ?? "";
        map[`${prefix}.codice_fiscale`] = s.codice_fiscale ?? "";
        // Convenience: "Mario Rossi, nato a Milano, CF RSSMRA..."
        map[`${prefix}.legal_description`] = buildPersonDescription(s);
      } else {
        const co = `${s.company_name ?? ""} ${s.company_form ?? ""}`.trim();
        map[`${prefix}.full_name`]          = co;
        map[`${prefix}.company_name`]       = s.company_name ?? "";
        map[`${prefix}.company_form`]       = s.company_form ?? "";
        map[`${prefix}.registered_address`] = s.registered_address ?? "";
        map[`${prefix}.codice_fiscale`]     = s.codice_fiscale ?? "";
        map[`${prefix}.legal_rep`]          = s.legal_rep ?? "";
        map[`${prefix}.legal_description`]  = buildCompanyDescription(s, "azionista");
      }
    });

    // Subsidiaries — same pattern
    const subsidiaries = (client.subsidiaries ?? []) as Subsidiary[];
    subsidiaries.forEach((s, i) => {
      const prefix = `subsidiaries.${i}`;
      if (s.type === "persona_fisica") {
        const fullName = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim();
        map[`${prefix}.type`]       = "persona_fisica";
        map[`${prefix}.full_name`]  = fullName;
        map[`${prefix}.country`]    = s.country ?? "";
        map[`${prefix}.quota_held_pct`] = s.quota_held_pct?.toString() ?? "";
      } else {
        const co = `${s.company_name ?? ""} ${s.company_form ?? ""}`.trim();
        map[`${prefix}.type`]               = "persona_giuridica";
        map[`${prefix}.full_name`]          = co;
        map[`${prefix}.company_name`]       = s.company_name ?? "";
        map[`${prefix}.company_form`]       = s.company_form ?? "";
        map[`${prefix}.registered_address`] = s.registered_address ?? "";
        map[`${prefix}.country`]            = s.country ?? "";
        map[`${prefix}.codice_fiscale`]     = s.codice_fiscale ?? "";
        map[`${prefix}.quota_held_pct`]     = s.quota_held_pct?.toString() ?? "";
        map[`${prefix}.legal_rep`]          = s.legal_rep ?? "";
        map[`${prefix}.legal_description`]  = buildCompanyDescription(s, "partecipata");
      }
    });

    return map;
  });

  // ─── Prose context for Claude ───────────────────────────────────────────────
  // This is the structured Italian text block injected into the user message.
  // Claude reads it and writes the narrative — it never invents names or numbers.
  const companyContext = computed((): string => {
    if (!client) return "";
    const vm = variableMap.value;
    const lines: string[] = [];

    if (vm.company_full_name) lines.push(`Ragione sociale: ${vm.company_full_name}`);
    if (vm.industry_sector)   lines.push(`Settore: ${vm.industry_sector}`);
    if (vm.employee_count)    lines.push(`Dipendenti: ${vm.employee_count}`);
    if (vm.tax_year)          lines.push(`Anno fiscale: ${vm.tax_year}`);
    if (vm.legal_representative) lines.push(`Legale rappresentante: ${vm.legal_representative}`);
    if (vm.vat_number)        lines.push(`P.IVA: ${vm.vat_number}`);
    if (vm.codice_fiscale)    lines.push(`Codice fiscale: ${vm.codice_fiscale}`);
    if (vm.registered_address) lines.push(`Sede legale: ${vm.registered_address}`);
    if (vm.board_members)     lines.push(`Membri CdA: ${vm.board_members}`);

    const shareholders = (client.shareholders ?? []) as Shareholder[];
    if (shareholders.length) {
      lines.push("\nAzionisti:");
      shareholders.forEach((s, i) => {
        const prefix = `shareholders.${i}`;
        const vm2 = variableMap.value;
        lines.push(
          `  Azionista ${i + 1}: ${vm2[`${prefix}.legal_description`] ?? vm2[`${prefix}.full_name`]}` +
          (vm2[`${prefix}.quota_pct`] ? ` — quota ${vm2[`${prefix}.quota_pct`]}%` : "")
        );
      });
    }

    const subsidiaries = (client.subsidiaries ?? []) as Subsidiary[];
    if (subsidiaries.length) {
      lines.push("\nSocietà partecipate:");
      subsidiaries.forEach((s, i) => {
        const prefix = `subsidiaries.${i}`;
        const vm2 = variableMap.value;
        lines.push(
          `  Partecipata ${i + 1}: ${vm2[`${prefix}.legal_description`] ?? vm2[`${prefix}.full_name`]}` +
          (vm2[`${prefix}.quota_held_pct`] ? ` — quota detenuta ${vm2[`${prefix}.quota_held_pct`]}%` : "")
        );
      });
    }

    return lines.join("\n");
  });

  // ─── Template substitution ──────────────────────────────────────────────────
  // Replace {{variable_name}} placeholders in any string.
  // Used for future Word export and for fixed-template steps like Premessa.
  function substitute(template: string): string {
    const vm = variableMap.value;
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      return vm[key.trim()] ?? match; // leave unresolved variables as-is
    });
  }

  return {
    variableMap,
    companyContext,
    substitute,
  };
}

// ─── Helpers — build standard Italian legal descriptions ─────────────────────
// These produce the consistent phrasing used throughout the document.
// e.g. "Mario Rossi, nato a Milano (MI) il 01/01/1970, C.F. RSSMRA..."

function buildPersonDescription(s: Extract<Shareholder, { type: "persona_fisica" }>): string {
  const parts: string[] = [];
  const name = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim();
  if (name) parts.push(name);
  if (s.place_of_birth && s.date_of_birth) {
    parts.push(`nato/a a ${s.place_of_birth} il ${formatDate(s.date_of_birth)}`);
  } else if (s.place_of_birth) {
    parts.push(`nato/a a ${s.place_of_birth}`);
  }
  if (s.address) parts.push(`residente in ${s.address}`);
  if (s.codice_fiscale) parts.push(`C.F. ${s.codice_fiscale}`);
  return parts.join(", ");
}

function buildCompanyDescription(
  s: Extract<Shareholder, { type: "persona_giuridica" }> | Extract<Subsidiary, { type: "persona_giuridica" }>,
  role: "azionista" | "partecipata"
): string {
  const parts: string[] = [];
  const name = `${s.company_name ?? ""} ${s.company_form ?? ""}`.trim();
  if (name) parts.push(name);
  if (s.registered_address) parts.push(`con sede in ${s.registered_address}`);
  if (s.codice_fiscale) parts.push(`P.IVA/C.F. ${s.codice_fiscale}`);
  if ("legal_rep" in s && s.legal_rep) {
    parts.push(`in persona del legale rappresentante ${s.legal_rep}`);
  }
  return parts.join(", ");
}

function formatDate(isoDate: string): string {
  // "1970-01-01" → "01/01/1970"
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
