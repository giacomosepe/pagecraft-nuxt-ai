# PageCraft — Codebase Map
> Last updated: 2026-04-18 (post ENGNEER-155, 156, 157, 158, 160, 161, 162)
> Purpose: index of what exists and its current state. Instructions for what to change live in Linear issue spec documents.

---

## Reference docs (repo root)
- **`pagecraft-discovery-1.md`** — step types (type_a/b/c) and 4-level prompt hierarchy. Sprint/issue counts outdated — use Linear.
- **`REFACTOR_PLAN.md`** — historical architecture decisions. Layer rule: zero logic in pages/components; all logic in composables; all data calls in server/api.

---

## App structure
```
app/
├── components/
│   ├── AppSidebar.vue, AppBottomBar.vue  ← layout shells
│   ├── FrameworkPickerModal.vue
│   ├── base/                             ← pure UI, no data
│   └── feature/
│       ├── client/, folder/
│       └── page/  ← StepNav, StepEditor, StepOutput
├── composables/   ← all data fetching + business logic
├── layouts/       ← default.vue (auth), publicLayout.vue (public)
├── middleware/    ← auth.ts
├── pages/         ← thin orchestrators, ~40 lines max
├── types/         ← app.types.ts
└── utils/         ← date.ts, status.ts, folderStatus.ts
server/api/
├── db/mutate.post.ts
├── pages/create.post.ts, create-batch.post.ts
├── generations/create.post.ts
├── export/word.post.ts
├── visura/extract.post.ts       ← accepts raw text, returns structured JSON
└── visura/extract-pdf.post.ts   ← accepts PDF upload, returns structured JSON
prisma/
├── grants.sql, seed.sql, rls_policies.sql, trigger.sql
```

Note: `server/api/extract/` does NOT exist. Any reference to `extract/document.post.ts` is a ghost — ignore.

---

## Key files — current state

### `server/api/generations/create.post.ts` — 258 lines
Main AI generation route. Handles generate and refine modes with streaming.
- Zod schema (line 9): `stepId`, `pageId`, `mode` (generate|refine), `existingOutput` (optional)
- Step select (lines 54–70): fetches `id, order, title, system_prompt_template, refine_prompt_template, form_data, form_schema` + nested page → client data
- `serializeFormData()`: serializes form_data using form_schema. Handles legacy/current upload naming for extraction and generation context, formats extracted shareholder/subsidiary data as Italian prose, skips `repeatable_group` items when `ip_linked=No`, and skips unmet `conditional` fields. Default: `label: value`.
- `buildPriorContext()`: concatenates prior committed outputs. Truncates at ~24k chars — keeps first 3 + last 3 steps.
- User message order: companyContext → priorContext → formDataBlock → existingOutput (refine) → closing instruction

### `server/api/export/word.post.ts` — 105 lines
Generates and streams a `.docx` from all committed steps.
- Accepts `pageId`, fetches committed steps ordered by `order`
- Builds title page + one `HEADING_1` per step. Uses `docx` npm package.

### `server/api/visura/extract.post.ts` — 130 lines
Extracts structured shareholder/subsidiary data from raw text.
- Accepts `{ text: string }` (min 100, max 100000 chars)
- Returns `{ shareholders[], subsidiaries[], missing: MissingFieldsReport }`
- `MissingFieldsReport` interface defined inline (lines 9–15)

### `server/api/visura/extract-pdf.post.ts` — ENGNEER-158 ✅
Accepts PDF upload, sends to Claude as native document, returns same shape as extract.post.ts.
- Accepts `multipart/form-data` with field `file` (PDF, max 10 MB)
- Converts buffer to base64, sends as `type: "document"` — no text extraction needed

### `app/components/feature/page/StepEditor.vue` — ~500 lines
Center panel. Now acts as the step assembler rather than the all-in-one field renderer.
- Reads `activeStep.step_type` + `form_schema`
- Centralizes step behavior in `STEP_TYPE_CONFIG`
- Computes `renderableFields` / `unsupportedFields` from step-type compatibility
- Delegates field rendering to extracted components
- Keeps upload/extraction wiring and AI gating logic
- "Genera bozza AI" is gated by generation state, upload state, and extraction readiness for visible extraction fields
- Transitional compatibility remains in code for legacy field names (`visura_upload`, `file`) and temporary `type_c` + `repeatable_group` support

### `app/components/feature/page/StepFieldShell.vue`
Shared field wrapper for label, hint, and required marker.

### `app/components/feature/page/StepSimpleField.vue`
Renders `text`, `textarea`, `number`, `select`, and `multiselect`.

### `app/components/feature/page/StepRepeatableGroupField.vue`
Renders `repeatable_group` with add/remove, collapse, and nested field rendering.

### `app/components/feature/page/StepExtractionUploadField.vue`
Renders extraction upload UI (`visura_upload` / `file_upload_extraction`).
- PDF upload → `/api/visura/extract-pdf`
- Persists structured extraction result in `form_data[field.key]`
- Shows loading, success, missing-data summary, and prior saved-state notice

### `app/components/feature/page/StepGenerationUploadField.vue`
Renders generation-supporting upload UI (`file` / `file_upload_generation`).
- Saves selected filename into `steps.form_data`
- Used as AI prompt context, not document output

### `app/components/feature/page/StepOutput.vue` — 167 lines
Right panel. Displays streamed AI output with commit/discard. Has expand modal.

### `app/components/feature/page/StepNav.vue` — 88 lines
Left sidebar. Step list with completion status and progress bar. Props-in, emits-out only.

### `app/pages/pages/[id].vue` — ~200 lines
Three-panel editor. Thin orchestrator. Uses `usePage` + `useGeneration`. Word export via `/api/export/word`.

### `app/composables/useGeneration.ts` — 165 lines
All AI generation state. Returns `{ output, isGenerating, isCommitting, errorMsg, generate, refine, commit, discard }`.

### `app/composables/useStepForm.ts`
Owns form state and persistence for `StepEditor`.
- normalizes `form_data`
- preloads empty instances for `repeatable_group` when `minItems >= 1`
- serializes `steps.form_data` saves through a promise queue to avoid stale overwrites
- exposes repeatable-group helpers and shared field visibility logic
- surfaces save errors through `formSaveError`

### `app/composables/usePage.ts` — 76 lines
Returns `{ page, steps, clientData, pending, error }`.
- joins `framework_steps!framework_step_id(step_type)`
- maps `step_type` onto each returned `StepRecord`
- steps include `form_data` and `form_schema`

### `app/composables/useClientFields.ts` — 232 lines
Client-side only. Cannot be imported in server routes.

### `server/api/db/mutate.post.ts` — 115 lines
Generic write route. Whitelisted tables: `clients`, `folders`, `pages`, `files`, `steps`, `generations`. RLS applies.

### `prisma/seed.sql`
Framework steps seeded here. `ON CONFLICT DO UPDATE` includes all fields (ENGNEER-146 ✅).
- Patent Box Step 3 now uses `file_upload_extraction`
- Patent Box Step 4 reference document now uses `file_upload_generation`
- Includes backfill SQL to align existing `steps.form_schema` rows with those schema-name changes
- Also seeds the `Relazione Tecnica — Patent Box` framework with a required `slug`

---

## Types — `app/types/app.types.ts`
- `StepType`: `type_a | type_b | type_c`
- `StepFieldType`: shared field-type union used by `StepEditor` and extracted field components
- `StepFormField`: shared schema shape for `form_schema`
- `StepRecord`: includes `step_type`, `form_schema`, and `form_data`
- `step_type` still lives in `framework_steps` at the DB level, but `usePage()` joins and maps it onto the UI `StepRecord`

---

## Database
- `steps`: `form_data` (JSONB), `form_schema` (JSONB), `committed_output` (TEXT), `status` (TEXT), `system_prompt_template`, `order` (int)
- `framework_steps`: `form_schema` (JSONB), `system_prompt_template`, `refine_prompt_template`, `step_type` (TEXT: type_a | type_b | type_c)
- `pages.status`: TEXT CHECK — `in_attesa | in_lavorazione | completato | archiviato` (NOT enum)
- `generations`: `id`, `step_id`, `prompt_used`, `output`, `source`, `is_committed`, `is_sample`
- `clients`: all company data. `shareholders` and `subsidiaries` are JSONB arrays.
- RLS: no `.eq('user_id')` on browser reads — automatic

---

## Open issues (pending)
- Keep this section light and verify in Linear before relying on it; the issue tracker is the source of truth for active work.

---

## Known quirks
- `nuxi typecheck`: `styleText requires Node v20.12+` — pre-existing, ignore
- White screen after branch switch: `rm -rf .nuxt && npm run dev`
- `folders.name` legacy column — tracked in ENGNEER-103 (backlog)
- `step_type` is on `framework_steps`, not `steps`; UI gets it via the join in `usePage.ts`
- NuxtUI v4: USelect uses `:items`, not `:options`
- extraction readiness checks both in-memory extraction results and persisted `form_data`, so previous-session uploads remain valid across reloads
- code still supports legacy upload field names (`visura_upload`, `file`) for compatibility during the step-assembly transition
