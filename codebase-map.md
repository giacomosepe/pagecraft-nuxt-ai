# PageCraft — Codebase Map
> Last updated: 2026-04-17 (post ENGNEER-148, ENGNEER-146, ENGNEER-145, ENGNEER-142)
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
├── visura/extract.post.ts
└── extract/document.post.ts
prisma/
├── grants.sql, seed.sql, rls_policies.sql, trigger.sql
```

---

## Key files — current state

### `server/api/generations/create.post.ts` — 258 lines
Main AI generation route. Handles generate and refine modes with streaming.
- Zod schema (line 9): `stepId`, `pageId`, `mode` (generate|refine), `existingOutput` (optional). Note: `userContext` removed — form_data serialization replaces it.
- Step select (lines 54–70): fetches `id, order, title, system_prompt_template, refine_prompt_template, form_data, form_schema` + nested page → client data
- Cross-step context (lines 73–80): fetches all prior committed steps for the same page, ordered by `order`
- `serializeFormData()` (line ~140): serializes form_data using form_schema. Skips file fields, omits empty values, respects `conditional` visibility, handles `repeatable_group` arrays. Items with `ip_linked === "No"` are excluded.
- `buildPriorContext()` (line ~170): concatenates prior committed outputs. Truncates at ~24k chars — keeps first 3 steps + last 3 if over limit.
- User message assembly order: companyContext → priorContext → formDataBlock → existingOutput (refine only) → closing instruction
- Streams response, saves to `generations` table, updates `steps.status = IN_PROGRESS`

### `server/api/export/word.post.ts` — 105 lines
Generates and streams a `.docx` file from all committed steps.
- Accepts `pageId`, verifies ownership, fetches committed steps ordered by `order`
- Builds title page (company name, tax year, date) then one `HEADING_1` per step
- Uses `docx` npm package. Returns buffer with correct MIME type and `Content-Disposition`.

### `server/api/visura/extract.post.ts` — 130 lines
Extracts structured shareholder and subsidiary data from raw visura text.
- Accepts `{ text: string }` (min 100, max 100000 chars) — raw text already extracted from PDF
- Calls Claude API with structured JSON extraction prompt
- Returns `{ shareholders[], subsidiaries[], missing: MissingFieldsReport }`
- Shareholder types: `persona_fisica` (CF, address, birth data) or `persona_giuridica` (company_name, form, address, quota_pct). `legal_rep` is always null for giuridica — not available in visura.
- `MissingFieldsReport` interface defined inline (lines 9–15)

### `server/api/extract/document.post.ts`
Accepts a file upload, extracts raw text, returns cleaned string. Pattern to follow for new extract routes.

### `app/components/feature/page/StepEditor.vue` — ~490 lines
Center panel of the document editor. Renders form fields from `form_schema` and action buttons.
- `FormField` interface (line ~15): supports `text | textarea | select | number | file | multiselect | repeatable_group`
- `isAiStep` computed (line ~155): `true` when `activeStep.system_prompt_template` is present. Controls whether action buttons render.
- Action buttons ("Genera bozza AI" / "Raffina") render only when `isAiStep === true`. No disabled-by-step-type logic yet — ENGNEER-154 pending.
- `select` type renders `USelect` with `:options="field.options ?? []"` — options must be present in form_schema seed or dropdown is empty (ENGNEER-155 pending).
- `file` type: saves filename only to form_data. No upload to server triggered. Step 4 upload lag fix pending (ENGNEER-156).
- `repeatable_group`: collapsible cards, add/remove, auto-collapse at 3+ instances. `ip_linked === "No"` items excluded from serialization server-side.
- System prompt toggle: shows `activeStep.system_prompt_template` in a `<pre>` block. Not scrollable — ENGNEER-157 pending.
- `saveFormField()`: persists to `steps.form_data` via `/api/db/mutate`. Optimistic local update.

### `app/components/feature/page/StepOutput.vue` — 167 lines
Right panel. Displays streamed AI output with commit and discard actions.
- Props: `output`, `isGenerating`, `isCommitting`, `activeStep`. Emits: `commit`, `discard`.
- Has expand modal for full-screen output view.

### `app/components/feature/page/StepNav.vue` — 88 lines
Left sidebar. Step list with completion status and progress bar.
- Props: `steps`, `activeIndex`. Emits: `select(index)`. No data fetching.

### `app/pages/pages/[id].vue` — ~200 lines
Three-panel editor. Thin orchestrator — no business logic.
- Uses `usePage(pageId)` and `useGeneration(...)`. Wires StepNav, StepEditor, StepOutput.
- Word export: `exportWord()` calls `/api/export/word`, triggers browser download. Disabled until `allCommitted` is true.
- `allCommitted` computed: true when every step has a non-null `committed_output`.

### `app/composables/useGeneration.ts` — 165 lines
All AI generation state and actions. Extracted from pages/[id].vue — do not re-add logic there.
- Params: `pageId`, `activeStep` (ComputedRef), `steps` (Ref), `activeStepIndex` (Ref)
- Returns: `{ output, isGenerating, isCommitting, errorMsg, generate, refine, commit, discard }`
- `generate()`: POST to `/api/generations/create` with `{ stepId, pageId, mode: "generate" }`. Streams response into `output`.
- `refine()`: same route, `mode: "refine"`, passes `existingOutput`. Restores previous output on error.
- `commit()`: POSTs to `/api/db/mutate`. Updates local step state optimistically. Advances `activeStepIndex`.

### `app/composables/usePage.ts` — 76 lines
Fetches page + steps + client data. Returns `{ page, steps, clientData, pending, error }`.
- Steps select includes `form_data` and `form_schema`.

### `app/composables/useClientFields.ts` — 232 lines
Client-side only (uses `computed()`). Cannot be imported in server routes.

### `server/api/db/mutate.post.ts` — 115 lines
Generic write route. Whitelisted tables: `clients`, `folders`, `pages`, `files`, `steps`, `generations`. RLS applies via userClient.

### `prisma/seed.sql`
Framework steps seeded here. Uses `ON CONFLICT (step_id) DO UPDATE` pattern — all fields (prompt, form_schema) now included in ON CONFLICT clause (ENGNEER-146 ✅).

---

## Types — `app/types/app.types.ts`
- `StepRecord`: `{ id, order, title, status, user_context, committed_output, system_prompt_template, refine_prompt_template, form_schema, form_data }`
- `PageRecord`: `{ id, title, status, framework_name, client_id, tax_year }`
- Note: `step_type` is NOT on `StepRecord` — it lives on `framework_steps`, not `steps`. Steps inherit `form_schema` at creation time (ENGNEER-148 ✅).

---

## Database
- `steps`: `form_data` (JSONB), `form_schema` (JSONB — snapshotted from framework_steps at page creation), `committed_output` (TEXT), `status` (TEXT), `system_prompt_template`, `order` (int)
- `framework_steps`: `form_schema` (JSONB), `system_prompt_template`, `refine_prompt_template`, `step_type` (TEXT: type_a | type_b | type_c)
- `pages.status`: TEXT CHECK — `in_attesa | in_lavorazione | completato | archiviato` (NOT a Postgres enum)
- `generations`: `id`, `step_id`, `prompt_used`, `output`, `source` (AI_GENERATED|AI_REFINED), `is_committed`, `is_sample`
- `clients`: all company data. `shareholders` and `subsidiaries` are JSONB arrays.
- RLS: no `.eq('user_id')` on browser reads — automatic via RLS policies

---

## Open issues touching this codebase (pending)
- **ENGNEER-154**: Grey out AI buttons on type_a steps (Steps 1 & 2), fix subtitle, merge anno fiscale fields → `StepEditor.vue` + `seed.sql`
- **ENGNEER-155**: Fix empty dropdowns in Steps 4, 5, 6 — options not binding from form_schema → `StepEditor.vue` + `seed.sql`
- **ENGNEER-156**: Step 4 file upload loading indicator → `StepEditor.vue`
- **ENGNEER-157**: System prompt display — make scrollable → `StepEditor.vue`
- **ENGNEER-158**: FPB-3 Step 3 — visura PDF upload + AI generation → new `server/api/extract/visura-pdf.post.ts` + `StepEditor.vue` + `seed.sql`

---

## Known quirks
- `nuxi typecheck` reports `styleText requires Node v20.12+, running v20.9.0` — pre-existing, ignore
- White screen after branch switch: `rm -rf .nuxt && npm run dev`
- `folders.name` legacy column still in DB — removal tracked in ENGNEER-103 (backlog)
- `step_type` is on `framework_steps`, not `steps` — agents needing step type must join or check form_schema structure
