# PageCraft — Codebase Map
> Last updated: 2026-04-18 (post ENGNEER-154)
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
- `serializeFormData()`: serializes form_data using form_schema. Handles: `file` (skip), `visura_upload` (format shareholders/subsidiaries as Italian prose), `repeatable_group` (skip if ip_linked=No), `conditional` (skip if condition not met). Default: `label: value`.
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

### `app/components/feature/page/StepEditor.vue` — ~520 lines
Center panel. Renders form fields from `form_schema` and action buttons.
- `FormField` interface: `text | textarea | select | number | file | multiselect | repeatable_group | visura_upload`
- `isTypeAStep` computed: `true` when `activeStep.step_type === 'type_a'`. Buttons disabled + greyed, subtitle swapped to template-fill text. ✅ ENGNEER-154
- `visura_upload` type: PDF upload → calls `/api/visura/extract-pdf` → stores result in `form_data[field.key]`. Shows loading/success/error state.
- `isVisuraReady` computed: `true` when no `visura_upload` field exists, OR when `form_data[field.key]` is non-null. Non-null check handles previous-session uploads.
- "Genera bozza AI" disabled when `!isVisuraReady || isGenerating || isTypeAStep`
- `select` type: uses `:items="field.options ?? []"` (NuxtUI v4 — not `:options`)
- `repeatable_group`: collapsible cards, add/remove, auto-collapse at 3+
- System prompt toggle: scrollable (`max-h-64 overflow-y-auto`), `whitespace-pre-wrap font-mono text-xs` ✅ ENGNEER-157
- `saveFormField()`: persists to `steps.form_data` via `/api/db/mutate`. Logs errors, re-throws. ✅ ENGNEER-159

### `app/components/feature/page/StepOutput.vue` — 167 lines
Right panel. Displays streamed AI output with commit/discard. Has expand modal.

### `app/components/feature/page/StepNav.vue` — 88 lines
Left sidebar. Step list with completion status and progress bar. Props-in, emits-out only.

### `app/pages/pages/[id].vue` — ~200 lines
Three-panel editor. Thin orchestrator. Uses `usePage` + `useGeneration`. Word export via `/api/export/word`.

### `app/composables/useGeneration.ts` — 165 lines
All AI generation state. Returns `{ output, isGenerating, isCommitting, errorMsg, generate, refine, commit, discard }`.

### `app/composables/usePage.ts` — 76 lines
Returns `{ page, steps, clientData, pending, error }`. Steps include `form_data`, `form_schema`, and `step_type` (joined from `framework_steps`).

### `app/composables/useClientFields.ts` — 232 lines
Client-side only. Cannot be imported in server routes.

### `server/api/db/mutate.post.ts` — 115 lines
Generic write route. Whitelisted tables: `clients`, `folders`, `pages`, `files`, `steps`, `generations`. RLS applies.

### `prisma/seed.sql`
All 7 Patent Box steps + all 11 Relazione Tecnica steps fully seeded with prompts and form_schemas.
`ON CONFLICT DO UPDATE` includes all fields. Step 3 has `visura_upload` + `note_integrative` fields. ✅

---

## Types — `app/types/app.types.ts`
- `StepRecord`: `{ id, order, title, status, step_type, user_context, committed_output, system_prompt_template, refine_prompt_template, form_schema, form_data }`
- `step_type` IS on StepRecord and IS fetched by usePage via join on framework_steps. ✅ ENGNEER-154

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
- **ENGNEER-159**: Fix silent catch in `saveFormField()` → already fixed in ENGNEER-154 merge, verify and close

---

## Known quirks
- `nuxi typecheck`: `styleText requires Node v20.12+` — pre-existing, ignore
- White screen after branch switch: `rm -rf .nuxt && npm run dev`
- `folders.name` legacy column — tracked in ENGNEER-103 (backlog)
- NuxtUI v4: USelect uses `:items`, not `:options`
- `visura_upload` disable logic checks both in-memory extraction ref AND `formValues[field.key]` — the latter handles previous-session uploads that persisted to DB
- type_b steps (Step 3) correctly show active AI buttons — generation is the point of that step type
