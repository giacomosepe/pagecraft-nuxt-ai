// app/types/app.types.ts
//
// Application-level TypeScript types.
// These are UI/domain types — not raw DB row types (those live in database.types.ts)
// and not company-structure types (those live in company.types.ts).
//
// Add to this file whenever a page or component defines a local type
// that is or could be shared with another file.

// ─── Client ───────────────────────────────────────────────────────────────────

export interface ClientListItem {
  id: string;
  name: string;
  company_name: string | null;
  industry_sector: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  folders: { id: string; updated_at: string }[] | null;
}

export interface ClientDetail {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  folders: FolderItem[] | null;
  // edit fields — fetched by useClient so edit.vue can use the same composable
  company_name: string | null;
  industry_sector: string | null;
  employee_count: number | null;
  legal_representative: string | null;
  vat_number: string | null;
  codice_fiscale: string | null;
  registered_address: string | null;
  company_form: string | null;
}

// ─── Folder ───────────────────────────────────────────────────────────────────

export interface PageItem {
  id: string;
  status: string;
  updated_at: string;
}

export interface FolderItem {
  id: string;
  program_name: string | null;
  updated_at: string;
  pages: PageItem[] | null;
}

// ─── Table row (used by the folder table in clients/[id]/index.vue) ───────────

export interface FolderTableRow {
  id: string;
  programName: string;
  documenti: string;
  lastModified: string;
  status: string;
}

// ─── Framework ────────────────────────────────────────────────────────────────

export interface FrameworkItem {
  id: string;
  name: string;
  description: string | null;
}

// ─── Page + Steps ─────────────────────────────────────────────────────────────

export interface StepRecord {
  id: string;
  order: number;
  title: string;
  status: string;
  step_type: string | null;
  user_context: string | null;
  committed_output: string | null;
  system_prompt_template: string | null;
  refine_prompt_template: string | null;
  form_schema: unknown | null;
  form_data: unknown | null;
}

export interface PageRecord {
  id: string;
  title: string;
  status: string;
  framework_name: string | null;
  client_id: string | null;
  tax_year: number | null;
}

export interface PageWithSteps {
  page: PageRecord;
  steps: StepRecord[];
}
