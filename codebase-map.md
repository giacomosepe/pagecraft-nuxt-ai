# PageCraft — Codebase Map
> Last updated: 2026-04-14 (post ENGNEER-92 merge)
> Purpose: index of what exists and its current state. Instructions for what to change live in Linear issue spec documents.

---

## Reference docs (repo root)
- **`pagecraft-discovery-1.md`** (341 lines) — step types (type_a/b/c) and 4-level prompt hierarchy. Sprint/issue count is outdated — use Linear.
- **`REFACTOR_PLAN.md`** (256 lines) — historical architecture decisions. Layer rule: zero logic in pages/components; all logic in composables; all data calls in server/api.
- **`TODAY.md`** — session log. Check for merges since last map update.

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
```

---

## Key files — current state

### `server/api/generations/create.post.ts` — 258 lines
Pending changes from ENGNEER-93 (not yet merged).
- Zod schema (line 9): stepId, pageId, userContext (string, optional), mode, existingOutput
- Step select (lines 54–70): id, title, system_prompt_template, refine_prompt_template — order/form_data/form_schema not yet included
- Company context (lines 82–135): formatShareholders() + formatSubsidiaries() inline — useClientFields not usable server-side
- User message (lines 143–152): companyContext + existingOutput + userContext + closing instruction
- Streaming + save (lines 186–256): accumulates fullOutput → saves to generations → sets steps.status = IN_PROGRESS

### `app/composables/useGeneration.ts` — 165 lines
Pending changes from ENGNEER-93 (not yet merged).
- UseGenerationParams interface (line 13): pageId, activeStep, userContext: Ref\<string\>, steps, activeStepIndex
- generate() (line 34): sends { stepId, pageId, userContext.value, mode: "generate" }
- refine() (line 72): sends { stepId, pageId, userContext.value, mode: "refine", existingOutput }
- commit() (line 112): saves { committed_output, user_context: userContext.value, status: "COMMITTED" }; advances activeStepIndex
- Returns: { output, isGenerating, isCommitting, errorMsg, generate, refine, commit, discard }

### `app/pages/pages/[id].vue` — ~200 lines
- userContext ref removed (ENGNEER-92 ✅)
- StepContextModal removed (ENGNEER-92 ✅)
- Export button: disabled hardcoded, no handler, no isExporting state (ENGNEER-87 pending)
- useGeneration call still passes userContext (ENGNEER-93 pending)

### `app/components/feature/page/StepEditor.vue` — >267 lines
- FormField interface: file, multiselect, repeatable_group, conditional, hint, required, accept, minItems, addLabel, fields (all added ENGNEER-92 ✅)
- repeatable_group renderer: bordered collapsible cards, add/remove, collapse at 3+ (ENGNEER-92 ✅)
- userContext textarea and "Usa modulo guidato" button removed (ENGNEER-92 ✅)
- formValues ref + saveFormField(): persists to steps.form_data via /api/db/mutate
- System prompt toggle present

### `app/components/feature/page/StepNav.vue` — 88 lines
- Props: steps, activeIndex. Emits: select(index). Progress bar + step bubbles.

### `app/components/feature/page/StepOutput.vue` — 167 lines
- Props: output, isGenerating, isCommitting, activeStep. Emits: commit, discard. Has expand modal.

### `app/composables/usePage.ts` — 76 lines
- Returns: { page, steps, clientData, pending, error }. form_data and form_schema included in steps select.

### `app/composables/useClientFields.ts` — 232 lines
- Client-side only (uses computed()). Cannot import in server routes.

### `server/api/db/mutate.post.ts` — 115 lines
- Generic write route. Whitelisted tables: clients, folders, pages, files, steps, generations. Uses userClient (RLS applies).

### `server/api/generations/premessa.post.ts`
- Premessa template substitution. No AI call.

### `server/api/export/word.post.ts`
- Does not exist yet. Planned in ENGNEER-87.

### `prisma/seed.sql`
- Framework steps seeded here. Uses ON CONFLICT (step_id) DO UPDATE pattern.

---

## Types — `app/types/app.types.ts`
- StepRecord: { id, order, title, status, user_context, committed_output, system_prompt_template, refine_prompt_template, form_schema, form_data }
- PageRecord: { id, title, status, framework_name, client_id, tax_year }
- Note: step_type is NOT on StepRecord — it lives on framework_steps

---

## Database
- `steps`: form_data (JSONB), committed_output (TEXT), status (TEXT), system_prompt_template, order (int)
- `framework_steps`: form_schema (JSONB), system_prompt_template, refine_prompt_template, step_type
- `pages.status`: TEXT CHECK — in_attesa | in_lavorazione | completato | archiviato (NOT a Postgres enum)
- `generations`: id, step_id, prompt_used, output, source (AI_GENERATED|AI_REFINED), is_committed, is_sample
- `clients`: all company data. company_profiles deleted.
- RLS: no .eq('user_id') on browser reads — automatic

---

## Known quirks
- `nuxi typecheck` reports `styleText requires Node v20.12+, running v20.9.0` — pre-existing, ignore in exit criteria
