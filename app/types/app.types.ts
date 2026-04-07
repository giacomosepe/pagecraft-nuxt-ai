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
  created_at: string;
}

export interface ClientDetail {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  folders: FolderItem[] | null;
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

// ─── Page + Steps ─────────────────────────────────────────────────────────────

export interface StepRecord {
  id: string;
  order: number;
  title: string;
  status: string;
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
