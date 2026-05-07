# PageCraft — AGENTS.md
# Last updated: May 7, 2026

Read this file fully before starting any task.
Read `codebase-map.md` before opening source files for implementation work.
Read `TODAY.md` only when current frontier or next action matters.

---

## What this app does

PageCraft is an AI-assisted writing tool for structured legal and technical documents.
V0 targets Italian Patent Box documentation with 8 ministry-defined sections per document.
Users move step by step through a document, generate and refine content with AI, and export the final result to Word.

---

## Agent routing

Tasks are scoped and routed by the PM before reaching coding agents.

**Execute directly** when the spec is fully prescriptive: exact file, exact change, no design judgment needed.
**Use a specialist agent** when the task is open-ended, crosses layers, or needs domain judgment.
**Treat the Linear label as a hint**, not a hard instruction.

| Linear label | Subagent | Owns |
|---|---|---|
| `📋 Agent: ui-ux` | `ui-ux` | `app/components/`, `app/pages/`, `app/composables/`, CSS |
| `🤖 Agent: backend` | `backend` | `server/api/`, Zod schemas, server-side logic |
| `🗄️ Agent: database` | `database` | `prisma/`, `seed.sql`, RLS, migrations |
| `🔍 Agent: evaluator` | `evaluator` | Spec compliance, ACs, regression checks |
| `✍️ Agent: prompt-writer` | `prompt-writer` | AI prompt design and review |

Always run evaluator after any issue touching high-risk files or after closing a milestone.
Never run two agents simultaneously on the same repo.

When a Linear issue lists concrete values from source files such as options, field names, or prompts, treat them as hints only and verify against the source before acting.

---

## Stack and execution context

| Layer | Tool | Version |
|---|---|---|
| Framework | Nuxt | ^4.3.0 |
| UI | NuxtUI | ^4.5.1 |
| Auth + DB | Supabase | 2.0.4 |
| Migrations | Prisma CLI | 7.5.0 |
| AI | Vercel AI SDK | 6.0.116 |
| AI provider | `@ai-sdk/anthropic` | 3.0.58 |
| Validation | Zod | 4.3.6 |
| Hosting | Railway | Node server deploy from GitHub |
| Word extraction | mammoth | 1.12.0 |

Pinned dependencies: `zod`, `@nuxtjs/supabase`, `ai`, `@ai-sdk/anthropic`, `prisma`, `mammoth`

`mammoth@1.12.0` is approved for Word document text extraction. Install pinned to this version without asking.

---

## Hard rules — keep for review

- Never run two agents simultaneously on the same repo
- Never update dependencies with `@latest`; pin explicit versions one at a time
- Never add a `status` column to `folders`; status is derived from pages in the frontend
- Never treat `pages.status` as a Postgres enum; it is `TEXT` with a check constraint
- Never re-grant anon access to `page_context_documents` or `framework_step_examples` — anon grants have been intentionally revoked
- `type_a` and `type_b` framework steps must always have `system_prompt_template = ''` and `refine_prompt_template = ''` — prompt columns are only populated for `type_c` steps
- `blocklist` on `framework_step_examples` is stored metadata only — do not implement runtime enforcement in the DB layer; enforcement lives in `server/utils/sanitiseGeneration.ts`
- Prompt injection goes into `userMessage`, not `systemPrompt`. Injection point: after Dati del passaggio, before refine draft / final instruction

---

## Language

All UI strings are written directly in Italian in templates.
Do not introduce i18n or `$t()`.

Code stays in English:
- variable names
- function names
- file names
- database tables and fields
- routes
- comments

---

## Repo-local working rules

- Keep `pages/` thin and orchestration-only when possible.
- Keep business logic in composables or server routes, not in page shells.
- Verify any PageCraft-specific lesson or decision in source files before turning it into code.

---

## Workflow — Linear + GitHub

Branch format: `teamkey-number-short-description`
Example: `engneer-92-step-type-aware-input`

Fetch the intended branch name from the Linear issue before starting work.

| GitHub event | Linear issue moves to |
|---|---|
| Branch created | In Progress |
| PR opened | In Review |
| PR merged | Done |

After completing a feature, leave a summary comment on the Linear issue describing what was built and what to check in the preview.

---

## Linear issue writing

When writing or revising Linear issues, read `~/Claude/_skills/linear-issue-writer/SKILL.md` first.

Repo-local issue-writing context:
- codebase map filename: `codebase-map.md`
- issue prefix: `ENGNEER`
- track prefixes: `A = composables`, `B = UI components`, `C = cleanup`, `FPB = framework steps`
- do-not-touch defaults: `server/`, `prisma/`, `app/composables/` unless explicitly in scope

---

## Known issues

- white screen after branch switch: `rm -rf .nuxt && npm run dev`
- `folders.name` is a legacy column still pending cleanup
- prompts and field content were not rewritten during the restyling sweep
- `mammoth` is approved but not yet added to `package.json` — must be added before ENGNEER-337 feature build

---

## Database tables (as of May 7, 2026)

| Table | Purpose | Notes |
|---|---|---|
| `frameworks` | Document framework definitions | |
| `framework_steps` | Step templates per framework | `step_type`: `type_a`, `type_b`, `type_c` |
| `framework_step_examples` | Per-step example outputs for prompt injection | `blocklist` column = stored metadata only; anon grants revoked |
| `steps` | Per-document step instances (snapshot of framework_steps) | |
| `pages` | Documents (one page = one document) | `status` is TEXT with check constraint, not enum |
| `folders` | Folder groupings | No `status` column — derived in frontend |
| `clients` | Client company records | |
| `generations` | AI generation records per step | |
| `page_context_documents` | Uploaded context docs scoped to a document (page) | `page_id → pages.id`; storage bucket `page-context-documents`; anon grants revoked |
| `page_step_figures` | Figure captions per step, injected as text markers at generation | V1: text markers only, no file upload |

## Storage buckets

| Bucket | Access | Purpose |
|---|---|---|
| `page-context-documents` | Private | Word/PDF context documents uploaded per document (page) |

## Server utilities (server/utils/)

| File | Purpose |
|---|---|
| `getProjectContext.ts` | Assembles context document text for a page+step combination; abstraction boundary for future RAG swap |
| `extractDocumentText.ts` | Extracts plain text from uploaded Word docs via mammoth |
| `sanitiseGeneration.ts` | Post-generation blocklist enforcement; checks AI output against `framework_step_examples.blocklist` |
| `getFrameworkStepExample.ts` | Fetches the active example for a given step (newest active wins) |
| `getStepFigureCaptions.ts` | Fetches figure captions for a step from `page_step_figures` |
| `contextDocuments.ts` | Supporting helpers for context document upload/retrieval flow |
| `generationPrompt.ts` | Prompt assembly helpers |
| `buildPremessa.ts` | Assembles Step 2 normative preamble text |
| `initialStepFormData.ts` | Initialises form data for new step instances |
| `renderTemplate.ts` | Template rendering helpers |
| `visuraExtraction.ts` | Visura PDF extraction helpers |
