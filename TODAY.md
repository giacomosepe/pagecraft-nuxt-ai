# PageCraft — Today
Last updated: 2026-05-07

This file tracks the current frontier only.
Rewrite or remove any note as soon as it no longer changes the next session's behavior.

---

## Current phase

Sprint completed: schema, seed data, server utilities, and prompt content for Steps 4–7.
Now moving to implement the remaining feature code for the issues completed at DB/seed level.

## Recently completed (this sprint)

**Schema and DB (already applied in Supabase):**
- ENGNEER-337 — `page_context_documents` table, storage bucket `page-context-documents`, RLS, storage RLS. `mammoth@1.12.0` approved and must be added to `package.json`.
- ENGNEER-338 — `framework_step_examples` table, Saco Combimar seed data for steps 4–7, `blocklist` column. Anon grants revoked.
- ENGNEER-339 — `sanitiseGeneration` utility built at `server/utils/sanitiseGeneration.ts`, blocklist enforcement post-generation

**Prompt seeds (applied to DB via migration — steps 4–7 for Patent Box framework):**
- ENGNEER-333 to 336 — `system_prompt_template`, `refine_prompt_template`, and `form_schema` for steps 4, 5, 6, 7
- Step IDs: 4=`11111111-0000-0000-0000-000000000004`, 5=`11111111-0000-0000-0000-000000000005`, 6=`11111111-0000-0000-0000-000000000006`, 7=`11111111-0000-0000-0000-000000000008`

**Server utilities built (not yet wired to routes):**
- `server/utils/getProjectContext.ts` — assembles context document text for prompt injection
- `server/utils/extractDocumentText.ts` — extracts text from uploaded Word docs via mammoth
- `server/utils/sanitiseGeneration.ts` — post-generation blocklist enforcement
- `server/utils/getFrameworkStepExample.ts` — fetches active example for a step
- `server/utils/getStepFigureCaptions.ts` — fetches figure captions for a step
- `server/utils/contextDocuments.ts` — supporting helpers for context document flow
- `server/api/page-context-documents/` — upload, index, delete routes

## Active frontier — features to implement next

These issues have DB/seed work done but feature code not yet built:

- **ENGNEER-337** — `getProjectContext` wiring into generation route; `extractDocumentText` helper; Configurazione panel UI in document editor; prompt injection into `userMessage` (after Dati del passaggio, before refine/final instruction)
- **ENGNEER-338** — fetch active example in generation route via `getFrameworkStepExample`; inject into `userMessage` (newest active wins)
- **ENGNEER-339** — post-generation sanitisation call using blocklist from `framework_step_examples`
- **ENGNEER-340** — `page_step_figures` table (DB not yet created); File tab UI with repeatable caption inputs; figure block injection into `userMessage`
- **ENGNEER-341 to 344** — figure marker placement instruction added to Steps 4–7 system prompts (runtime injection; no DB changes; currently in Approve & Plan)
- **ENGNEER-324 to 332** — client detail page and project detail page (full build, not yet started)

## Key architectural decisions (record for agents)

- `pages` = documents (not projects). A project contains multiple pages/documents.
- Context documents are document-scoped: `page_context_documents.page_id → pages.id`
- Configurazione panel is hardcoded in the document editor — not a `framework_step` row, not a new step type
- Prompt injection goes into `userMessage`, not `systemPrompt`. Injection point: after Dati del passaggio, before refine draft / final instruction
- `getProjectContext(pageId, stepNumber)` is the abstraction boundary for context injection — internals swappable for RAG later
- Step-to-slot mapping: step 4 → [technical_presentation, additional_docs], step 5 → [technical_presentation], step 6 → [technical_presentation, additional_docs], step 7 → [financial_notes, technical_presentation]
- `mammoth@1.12.0` approved for Word extraction — install without asking, pin to this version
- Storage bucket: `page-context-documents`, private
- Figure markers format: `[INSERIRE FIGURA: {caption}]` — V1 is text-marker only, no file upload yet
- Anon grants have been revoked from `page_context_documents` and `framework_step_examples` — do not re-grant
- `blocklist` on `framework_step_examples` is stored metadata only — enforcement is at generation time in `sanitiseGeneration`, not at DB level

## Pending verification

- Steps 4–7 prompts correct in live Supabase (run verify query in seed.sql)
- Saco Combimar examples present in `framework_step_examples` for steps 4–7
- `sanitiseGeneration` is imported and called after every streamed generation (not yet wired)
- `mammoth` not yet in `package.json` — must be added before ENGNEER-337 feature build

## Blockers / open threads

- `prisma/AGENTS.md` and `prisma/CLAUDE.md` still need the prompt column rule: `type_a` and `type_b` steps must have `system_prompt_template = ''` and `refine_prompt_template = ''`
- seed.sql may be missing the `framework_step_examples` Saco seed block — verify before next DB reset
