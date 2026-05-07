# PageCraft — Codebase Map
> Last updated: 2026-05-07
> Purpose: structural map of the current codebase, key modules, and current architecture shape.

---

## App structure

```text
app/
├── components/
│   ├── AppSidebar.vue, AppBottomBar.vue
│   ├── FrameworkPickerModal.vue
│   ├── base/              shared UI primitives, no data fetching
│   └── feature/
│       ├── client/, document/, folder/, project/
│       └── page/          StepNav, StepEditor, StepOutput and field components
├── composables/           client-side orchestration and business logic
├── layouts/               default.vue, publicLayout.vue
├── middleware/            auth.ts
├── pages/                 thin route orchestrators
├── types/                 shared app types
└── utils/                 shared helpers

server/api/
├── db/mutate.post.ts
├── db/delete.post.ts
├── clients/
├── pages/create.post.ts
├── pages/create-batch.post.ts
├── generations/create.post.ts
├── export/word.post.ts
├── steps/
├── page-context-documents/upload.post.ts
├── page-context-documents/index.get.ts
├── page-context-documents/delete.post.ts
├── visura/extract.post.ts
└── visura/extract-pdf.post.ts

server/utils/
├── getProjectContext.ts        assembles context doc text for prompt injection (page+step scoped)
├── extractDocumentText.ts      extracts plain text from Word docs via mammoth
├── sanitiseGeneration.ts       post-generation blocklist enforcement
├── getFrameworkStepExample.ts  fetches active example for a step (newest active wins)
├── getStepFigureCaptions.ts    fetches figure captions from page_step_figures
├── contextDocuments.ts         helpers for context document upload/retrieval
├── generationPrompt.ts         prompt assembly helpers
├── buildPremessa.ts            Step 2 normative preamble assembly
├── initialStepFormData.ts      initialises form data for new step instances
├── renderTemplate.ts           template rendering helpers
└── visuraExtraction.ts         visura PDF extraction helpers

prisma/
├── grants.sql
├── seed.sql
├── rls_policies.sql
└── trigger.sql
```

---

## Current architecture shape

- `pages/` currently act as route-level shells.
- `composables/` currently own most client-side orchestration, state, and business logic.
- `server/api/` currently owns persistence, mutations, AI routes, and export logic.
- `app/components/base/` contains reusable UI/state primitives.
- `app/components/feature/` contains feature-level UI.

---

## Key modules

### `app/pages/pages/[id].vue`
Three-panel document editor route.
Uses `usePage()` and `useGeneration()` and hosts the restyled editor shell.

### `app/composables/usePage.ts`
Loads page, steps, client data, and joins `framework_steps.step_type` into the UI `StepRecord`.

### `app/composables/useStepForm.ts`
Owns step form state and persistence, including repeatable-group behavior and guarded save sequencing.

### `app/composables/useGeneration.ts`
Owns generation/refine/commit/discard state for the AI output panel.
Also exposes `generatePremessa(pageId, taxYearStart, taxYearEnd)` for the step 2 non-AI route call.
Exposes `commitSuccess` ref — pulses true/false on successful commit so the page layer can trigger a toast without coupling the composable to UI.

### `app/components/feature/page/StepEditor.vue`
State-driven step assembler.
Uses `STEP_TYPE_CONFIG`, extracted field components, upload/extraction wiring, and generation gating.
Contains a hardcoded **Configurazione panel** (not a framework_step row) for document-level context document uploads.

### `app/components/feature/page/StepOutput.vue`
Displays streamed output and commit/discard controls.

### `app/components/feature/page/StepNav.vue`
Left sidebar step navigation and completion state.

### `server/api/generations/create.post.ts`
Main AI generation route.
Handles generate/refine, form-data serialization, prior-step context assembly, and streaming output.
Injects context documents via `getProjectContext(pageId, stepNumber)` into `userMessage` after Dati del passaggio.
Injects active step example via `getFrameworkStepExample()` into `userMessage`.
Injects figure captions via `getStepFigureCaptions()` when present.
Runs `sanitiseGeneration()` post-stream to enforce blocklist.

### `app/utils/buildIntestazione.ts` _(new — 2026-04-28)_
Pure function. Assembles the step 1 (Intestazione) heading text from form data and page context. No side effects. Input: `{ programTitle, legalCitation, companyName, legalForm, taxYear }`. Missing fields render as `[DA COMPLETARE]`.

### `app/utils/assembleStruttura.ts` _(new — 2026-04-28)_
Pure function. Assembles step 3 (Struttura Partecipativa) structured text blocks from extracted `shareholders[]` and `subsidiaries[]` arrays. No LLM call. Missing fields render as `[DA COMPLETARE]`. Omits SOCI/PARTECIPATE sections if the respective array is empty.

### `server/utils/getProjectContext.ts` _(new — 2026-05-07)_
Assembles context document text for a given `pageId` and `stepNumber`.
Abstraction boundary — internals are swappable for RAG in a future iteration.
Step-to-slot mapping: step 4 → [technical_presentation, additional_docs], step 5 → [technical_presentation], step 6 → [technical_presentation, additional_docs], step 7 → [financial_notes, technical_presentation].

### `server/utils/extractDocumentText.ts` _(new — 2026-05-07)_
Extracts plain text from uploaded Word (.docx) files using mammoth.
Used by `getProjectContext` and the context document upload route.

### `server/utils/sanitiseGeneration.ts` _(new — 2026-05-07)_
Post-generation blocklist enforcement. Reads `blocklist` from `framework_step_examples` for the current step and checks AI output against it.
Called after every streamed generation — not at DB level.

### `server/utils/getFrameworkStepExample.ts` _(new — 2026-05-07)_
Fetches the active example output for a given framework step from `framework_step_examples`. Newest active row wins.

### `server/utils/getStepFigureCaptions.ts` _(new — 2026-05-07)_
Fetches figure captions for a given page+step from `page_step_figures`.
Returns structured list for injection as `[INSERIRE FIGURA: {caption}]` markers in `userMessage`.

### `server/api/page-context-documents/` _(new — 2026-05-07)_
Three routes: `upload.post.ts`, `index.get.ts`, `delete.post.ts`.
Manages context documents uploaded per document (page). Storage bucket: `page-context-documents` (private).

### `server/api/export/word.post.ts`
Builds and streams the `.docx` export from committed steps.

### `server/api/db/mutate.post.ts`
Generic whitelisted write route.

### `server/api/db/delete.post.ts`
Delete orchestration route for destructive entity-removal flows requiring cascades.

### `prisma/seed.sql`
Seeds framework steps and backfills step schemas when seed shape changes.

### `server/AGENTS.md`
Backend operating rules for server routes, generation/export flows, Supabase auth patterns, and route-level caveats.

### `prisma/AGENTS.md`
Database operating rules for migrations, seeds, grants, triggers, RLS, and schema constraints.

---

## Types and data shape

- `StepType`: `type_a | type_b | type_c`
- `StepFieldType`: shared union for supported form field types
- `StepFormField`: shared schema shape for `form_schema`
- `StepRecord`: UI step shape including `step_type`, `form_schema`, and `form_data`

Database notes:
- `pages.status` is `TEXT` with a check constraint
- `framework_steps.step_type` lives in the DB and is joined into UI state by `usePage()`
- some foreign-key paths still use `ON DELETE SET NULL`, so UI delete flows rely on `server/api/db/delete.post.ts`

---

## Structural caveats

- `server/api/extract/` does not exist; any reference to `extract/document.post.ts` is a ghost
- `step_type` is stored on `framework_steps`, not `steps`; the UI receives it via the `usePage.ts` join
- some old flows still depend on `framework_step_id` backfills or title-based matching when working with legacy rows
- `system_prompt_template` on `framework_steps` contains an AI prose prompt for `type_c` steps — it is **not** a `{{variable}}` substitution template. For `type_a` and `type_b` steps the column is `''` (empty string); output is assembled by dedicated `buildX()` utility functions or deterministic extraction
- `server/api/visura/extract.post.ts` is legacy (text extraction); the current extraction route is `server/api/visura/extract-pdf.post.ts` (structured JSON returning typed `shareholders[]` and `subsidiaries[]`)
- `framework_step_examples.blocklist` is stored metadata only — runtime enforcement is in `sanitiseGeneration.ts`, not in the DB
- anon grants have been revoked from `page_context_documents` and `framework_step_examples` — never re-grant
- `page_step_figures` stores figure captions only (V1); actual figure file upload is a V2 concern
- The Configurazione panel in the document editor is hardcoded UI — it is not a `framework_step` row and not a new step type
