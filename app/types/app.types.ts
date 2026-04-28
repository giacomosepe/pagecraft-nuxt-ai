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
  folders: {
    id: string;
    updated_at: string;
    pages?: {
      id: string;
      updated_at: string;
    }[] | null;
  }[] | null;
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

export interface ProjectListItem {
  id: string;
  program_name: string | null;
  updated_at: string;
  client_id: string | null;
  clients: { id: string; name: string } | null;
  pages: PageItem[] | null;
}

export interface DocumentListItem {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  framework_name: string | null;
  folder_id: string | null;
  client_id: string | null;
  folders: { id: string; program_name: string | null } | null;
  clients: { id: string; name: string } | null;
}

// ─── Framework ────────────────────────────────────────────────────────────────

export interface FrameworkItem {
  id: string;
  name: string;
  description: string | null;
}

// ─── Page + Steps ─────────────────────────────────────────────────────────────

export type StepType = "type_a" | "type_b" | "type_c";
export type StepFieldType =
  | "text"
  | "textarea"
  | "select"
  | "number"
  | "file"
  | "file_upload_generation"
  | "multiselect"
  | "repeatable_group"
  | "visura_upload"
  | "file_upload_extraction";

export interface StepFormField {
  key: string;
  label: string;
  type: StepFieldType;
  options?: string[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string;
  accept?: string[];
  conditional?: { key: string; value: string };
  minItems?: number;
  addLabel?: string;
  fields?: StepFormField[];
}

export interface StepRecord {
  id: string;
  order: number;
  title: string;
  status: string;
  step_type: StepType | null;
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
