# PageCraft — AGENTS.md
# Last updated: April 22, 2026

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

Pinned dependencies: `zod`, `@nuxtjs/supabase`, `ai`, `@ai-sdk/anthropic`, `prisma`

---

## Hard rules — keep for review

- Never run two agents simultaneously on the same repo
- Never update dependencies with `@latest`; pin explicit versions one at a time
- Never add a `status` column to `folders`; status is derived from pages in the frontend
- Never treat `pages.status` as a Postgres enum; it is `TEXT` with a check constraint

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
