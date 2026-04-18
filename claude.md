# PageCraft — CLAUDE.md
# Last updated: April 18, 2026
# Read this file fully before starting any task.
# Subdirectory CLAUDE.md files load automatically — do not @import them here.
# For history and decisions: ~/Claude/_projects/pagecraft/changelog.md

---

## What this app does

PageCraft is an AI-assisted writing tool for structured legal/technical documents.
V0 targets Italian Patent Box documentation — 8 ministry-defined sections per document.
Users work through Steps sequentially, use Claude AI to generate content, export to Word.
Key user benefit: significant time saving and better information organisation.

---

## Codebase map
Read `codebase-map.md` in the repo root before opening any source file.

---

## Agent rules

Tasks are scoped and routed by the PM before reaching Claude Code.

**Execute directly** when the spec is fully prescriptive — exact file, exact change, no design judgment needed.
**Spawn a subagent** when the task is open-ended, crosses multiple layers, or requires domain judgment.
**Use the label as a hint**, not a hard instruction — if the task is simple and prescriptive, execute directly regardless of label.

| Linear label | Subagent | Owns |
|---|---|---|
| `📋 Agent: ui-ux` | `ui-ux` | `app/components/`, `app/pages/`, `app/composables/`, CSS |
| `🤖 Agent: backend` | `backend` | `server/api/`, Zod schemas, server-side logic |
| `🗄️ Agent: database` | `database` | `prisma/`, `seed.sql`, RLS, migrations |
| `🔍 Agent: evaluator` | `evaluator` | Spec compliance, ACs, regression checks |
| `✍️ Agent: prompt-writer` | `prompt-writer` | AI prompt design and review |

Always run evaluator after any issue touching high-risk files or closing a milestone.
Never run two agents simultaneously on the same repo.

**When a Linear issue lists concrete values from source files (options, field names, prompts),
treat them as hints only — always verify against the source file before acting.**

---

## Stack

| Layer | Tool | Version |
|---|---|---|
| Framework | Nuxt | ^4.3.0 — compatibilityVersion: 4, app/ directory |
| UI | NuxtUI | ^4.5.1 — includes Tailwind v4 and icons |
| Auth + DB | Supabase | 2.0.4 — via @nuxtjs/supabase |
| Migrations | Prisma CLI | 7.5.0 — schema + migrations ONLY, never at runtime |
| AI | Vercel AI SDK | 6.0.116 — streaming via server routes |
| AI provider | @ai-sdk/anthropic | 3.0.58 |
| Validation | Zod | 4.3.6 — v4 syntax |
| Hosting | Railway | — Node server, deploy from GitHub |

Pinned (never auto-update): `zod`, `@nuxtjs/supabase`, `ai`, `@ai-sdk/anthropic`, `prisma`
Loose (caret ok): `nuxt`, `vue`, `@nuxt/ui`, `tailwindcss`

---

## Folder structure

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
├── pages/         ← thin orchestrators, ~40 lines max
├── types/         ← app.types.ts
└── utils/         ← date.ts, status.ts, folderStatus.ts
server/api/
├── db/mutate.post.ts
├── pages/create.post.ts
├── generations/create.post.ts
└── export/word.post.ts
prisma/
├── grants.sql, seed.sql, rls_policies.sql, trigger.sql
```

---

## Hard rules — no exceptions

- Never run two agents simultaneously on the same repo
- Never update dependencies with `@latest` — explicit version, one at a time
- Never add `status` column to `folders` — status is derived from pages in the frontend
- Never treat `pages.status` as a Postgres enum — it is TEXT with CHECK constraint

---

## Language

All UI strings written directly in Italian in templates. No i18n module, no `$t()`.
Code stays in English: variable names, functions, files, DB tables, routes, comments.

---

## Workflow — Linear + GitHub

Branch format: `teamkey-number-short-description` (e.g. `engneer-92-step-type-aware-input`)
Always fetch branch name from Linear issue via MCP before starting work.

| GitHub event | Linear issue moves to |
|---|---|
| Branch created | In Progress |
| PR opened | In Review |
| PR merged | Done |

After completing a feature: leave a summary comment on the Linear issue describing what was built and what to check in the Vercel preview.

---

## Linear issue writing

When writing or revising Linear issues, read `~/Claude/_skills/linear-issue-writer/SKILL.md` first.

- Codebase map: `codebase-map.md`
- Issue prefix: `ENGNEER`
- Track prefixes: A = composables, B = UI components, C = cleanup, FPB = framework steps
- Do-not-touch defaults: `server/`, `prisma/`, `app/composables/` unless explicitly in scope

---

## BUILD STATUS — April 18, 2026

| Area | Status |
|---|---|
| Auth, clients, folders, pages | ✅ Full CRUD |
| Step editor (3-panel, generate, refine, commit) | ✅ Working |
| Generation pipeline (form_data + cross-step context) | ✅ ENGNEER-93 |
| Word export | ✅ ENGNEER-87 |
| Step 3 visura upload + generation | ✅ ENGNEER-158, 160, 162 |
| V0 exit test | ⬅️ ENGNEER-98 — next |

**Known issues:**
- `prisma/migrations` RLS warning in Supabase → intentional, ignore
- White screen after branch switch → `rm -rf .nuxt && npm run dev`
- `folders.name` legacy column → remove in ENGNEER-103 (backlog)
