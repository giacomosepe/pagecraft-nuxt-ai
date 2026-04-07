# PageCraft — Project Context for AI Assistants
# Last updated: March 31, 2026
# Paste this at the start of every coding session.
# Update the BUILD STATUS section at the end of every session.

---

## Project documents — read when relevant

These live in Linear. Fetch them when the task requires strategic or design context.
For technical rules, patterns, and schema — everything you need is in this file.

| Document | URL | When to read |
|----------|-----|--------------|
| Visione del Prodotto | https://linear.app/giacomosepe/document/pagecraft-visione-del-prodotto-32a376530d4b | Product purpose and user context |
| Design e Architettura Informativa | https://linear.app/giacomosepe/document/pagecraft-design-e-architettura-informativa-f8f53724c517 | Before building any UI, navigation, or list view |
| Scelte Tecnologiche | https://linear.app/giacomosepe/document/pagecraft-scelte-tecnologiche-c4f677d62d4a | Why the stack was chosen |
| Struttura Dati | https://linear.app/giacomosepe/document/pagecraft-struttura-dati-317a4c9f38f8 | Entity relationships in plain language |
| Linee Guida AI e Prompt | https://linear.app/giacomosepe/document/pagecraft-linee-guida-ai-e-prompt-038aadb57d62 | Before writing or modifying system prompts |

---

## What this app does

PageCraft is an AI-assisted writing tool for structured legal/technical documents.
V1 targets Italian Patent Box documentation — 8 ministry-defined sections per document.
Users create Pages (documents), work through Steps (sections) sequentially, and use
Claude AI to generate or refine content at each step. Final output is a Word document.

---

## Stack — exact versions, pinned

| Layer | Tool | Version | Notes |
|---|---|---|---|
| Framework | Nuxt | ^4.3.0 | compatibilityVersion: 4, app/ directory structure |
| UI | NuxtUI | ^4.5.1 | includes Tailwind v4 and icons |
| CSS | Tailwind | 4.2.2 | via NuxtUI, configured in app/assets/css/main.css |
| Auth + DB | Supabase | 2.0.4 | via @nuxtjs/supabase — auth AND all runtime queries |
| Migrations | Prisma CLI | 7.5.0 | schema + migrations ONLY — Prisma client never used at runtime |
| AI | Vercel AI SDK | 6.0.116 | streaming via server routes |
| AI provider | @ai-sdk/anthropic | 3.0.58 | Claude API |
| Validation | Zod | 4.3.6 | v4 syntax — see critical notes below |
| i18n | @nuxtjs/i18n | ^10.2.3 | Italian + English |
| Hosting | Railway | — | Node server, deploy from GitHub |
| Language | TypeScript | ^5.9.3 | throughout |

---

## Folder structure (Nuxt 4 app/ convention)

```
project-root/
├── app/
│   ├── assets/css/main.css
│   ├── components/
│   │   ├── AppSidebar.vue           ← nav: to be rebuilt in ENGNEER-109
│   │   ├── AppBottomBar.vue
│   │   ├── FrameworkPickerModal.vue  ← reads frameworks table client-side
│   │   └── StepContextModal.vue     ← receives clientData prop (NOT companyProfile)
│   ├── pages/
│   │   ├── dashboard.vue            ← will redirect to /clienti after ENGNEER-110
│   │   ├── login.vue
│   │   ├── confirm.vue              ← Supabase auth callback
│   │   ├── clienti/
│   │   │   └── index.vue            ← NEW in ENGNEER-110 — primary client list
│   │   ├── progetti/
│   │   │   └── index.vue            ← NEW in ENGNEER-111 — primary projects list
│   │   ├── impostazioni/
│   │   │   └── index.vue            ← NEW stub in ENGNEER-109
│   │   ├── clients/
│   │   │   ├── index.vue            ← old client list, leave untouched
│   │   │   ├── new.vue              ← new client (name only, insert via mutate)
│   │   │   └── [id]/
│   │   │       ├── index.vue        ← to be rebuilt in ENGNEER-112
│   │   │       ├── edit.vue         ← edit all client fields — DO NOT TOUCH
│   │   │       └── profiles/
│   │   │           └── new.vue      ← DEAD — redirects to /clients/[id]/edit
│   │   └── pages/
│   │       ├── new.vue              ← new page (framework picker → form)
│   │       └── [id].vue             ← three-panel step editor (core of the app)
│   └── types/
│       └── database.types.ts        ← auto-generated via npm run generate:types
├── server/
│   └── api/
│       ├── db/
│       │   └── mutate.post.ts       ← generic insert/update/delete (production grade)
│       ├── pages/
│       │   └── create.post.ts       ← page creation with step snapshot (production grade)
│       └── generations/
│           └── create.post.ts       ← AI generation with streaming (production grade)
├── prisma/
│   ├── schema.prisma
│   ├── grants.sql                   ← run after every migrate reset (step 4)
│   ├── seed.sql                     ← run after grants (step 5)
│   ├── rls_policies.sql             ← run after seed (step 6)
│   ├── trigger.sql                  ← run after rls (step 7)
│   └── migrations/
└── nuxt.config.ts
```

---

## Database schema

Tables: users, frameworks, framework_steps, clients, folders, pages, steps, generations, files, generation_files

REMOVED: company_profiles — all company data lives directly on clients.

### clients table — all company data lives here
Required at creation: name only.
All other fields filled progressively via /clients/[id]/edit.

Fields: id, user_id, name, company_name, industry_sector, employee_count,
legal_representative, vat_number, codice_fiscale, registered_address,
company_form, board_members (TEXT[]), shareholders (JSONB), subsidiaries (JSONB),
created_at, updated_at

PENDING MIGRATION (ENGNEER-108): status column — values: aperto | completato (manual, set by operator)

### pages table
Fields: id, user_id, folder_id, framework_id, framework_name (snapshot),
client_id (nullable), tax_year (nullable), title, status (TEXT), created_at, updated_at

STATUS VALUES (migrated March 31, 2026 — ENGNEER-107):
  in_attesa      — client has not provided documentation
  in_lavorazione — default on creation, active work
  completato     — operator marks done
  archiviato     — dormant, kept for reference

pages.status is a TEXT column with CHECK constraint — NOT a Postgres enum.
Old enum (page_status) has been dropped.

### folders table — Programmi
Fields: id, user_id, client_id, program_name, created_at, updated_at
NO status column — status is DERIVED from pages in the frontend. Never add status to folders.
Legacy column `name` still exists, NOT NULL constraint dropped. Remove in ENGNEER-103.

### steps table — no user_id, owned through pages
Fields: id, page_id, framework_step_id, order, title, system_prompt_template,
refine_prompt_template, form_schema (JSONB), form_data (JSONB), user_context,
last_prompt_used, committed_output, status (PENDING|IN_PROGRESS|COMMITTED|SKIPPED),
created_at, updated_at

### frameworks + framework_steps — system owned, seeded, read-only for users
Seeded: "Italian Patent Box" (7 steps) + "Relazione Tecnica — Patent Box" (11 steps)
Step types: type_a (form, no AI) | type_b (dynamic form, no AI) | type_c (AI generation)

---

## Information flow — how data moves through the app

### Client data → AI generation pipeline

```
client record (DB)
  ↓
useClientFields(client, taxYear)        ← app/composables/useClientFields.ts
  ↓ produces:
  companyContext  Italian prose block for Claude's user message
  ↓
step input panel — user fills form_data fields
  ↓
/api/generations/create receives { stepId, pageId, mode }
  ↓ server reads form_data from DB, builds full prompt
  ↓
Claude API → streams back → saved to generations table
```

### useClientFields composable — use this everywhere client data is needed

```ts
import { useClientFields } from '~/composables/useClientFields'
const { variableMap, companyContext, substitute } = useClientFields(clientData, taxYear)
```

Single source of truth for formatting client data. Do NOT inline client data formatting.

---

## CRITICAL: reset procedure after prisma migrate reset

```
1. npx prisma migrate reset --force
2. npx prisma migrate dev --name init_v2
3. npm run generate:types
4. Run prisma/grants.sql
5. Run prisma/seed.sql
6. Run prisma/rls_policies.sql
7. Run prisma/trigger.sql
```

grants.sql is the most critical step. Without it every insert fails.

---

## CRITICAL: data query patterns

### Browser reads
```ts
const supabase = useSupabaseClient();
const { data } = await useAsyncData("key", async () => {
  const { data, error } = await supabase.from("clients").select("id, name").order("name");
  if (error) throw error;
  return data;
}, { server: false });
```
No .eq("user_id", ...) needed — RLS handles it automatically.

### Server writes
```ts
await $fetch("/api/db/mutate", {
  method: "POST",
  body: { table: "clients", operation: "insert", data: { name: "Acme" } },
});
```

### Server routes — auth pattern
```ts
const client = await serverSupabaseClient(event);
const { data: { user } } = await client.auth.getUser();
if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });
```

---

## CRITICAL: Zod v4 syntax

```ts
z.record(z.string(), z.unknown())   // ✅ v4 — two args required
z.record(z.unknown())               // ❌ breaks
import { z } from 'zod'             // ✅ correct — not 'zod/v4'
```

---

## Environment variables

```
SUPABASE_URL           ← read by @nuxtjs/supabase module directly
SUPABASE_KEY           ← publishable key — safe in browser
SUPABASE_SECRET_KEY    ← secret key — server only
NUXT_ANTHROPIC_API_KEY ← Claude API — server only
DATABASE_URL           ← Prisma pooled (port 6543, pgbouncer=true)
DIRECT_URL             ← Prisma direct for migrations (port 5432)
```

---

## Design system

- Font: Geist
- Primary: brand (OKLCH ~264 indigo), Neutral: zinc
- Defined in: app/assets/css/main.css
- NuxtUI: app.config.ts → `primary: 'brand', neutral: 'zinc'`
- CSS in nuxt.config: `css: ['./assets/css/main.css']` (relative — NOT ~/assets)

---

## What NOT to do

- Never import from '@prisma/client' anywhere in the app
- Never use ~/assets in nuxt.config.ts CSS paths (use ./assets)
- Never add @nuxt/icon separately (NuxtUI includes it)
- Never use z.record() with one argument in Zod v4
- Never use serverSupabaseUser() in server routes (use serverSupabaseClient instead)
- Never add .eq("user_id", user.value!.id) to browser reads (RLS handles it)
- Never query company_profiles (table deleted)
- Never reference company_profile_id on pages (column deleted)
- Never update dependencies with @latest — explicit version, one at a time
- Never add status column to folders — status is derived from pages in the frontend
- Never use old page status values (DRAFT/IN_PROGRESS/COMPLETED/ARCHIVED) — use new values
- Never treat pages.status as an enum — it is a TEXT column with CHECK constraint

---

## Dependency pinning policy

Pinned (never auto-update): zod, @nuxtjs/supabase, ai, @ai-sdk/anthropic, prisma, @prisma/client
Loose (caret ok): nuxt, vue, @nuxt/ui, tailwindcss, @nuxtjs/i18n, @nuxtjs/sitemap

---

## BUILD STATUS

### Working ✅
- Auth (login, signup, confirm, session middleware)
- Clients — list, create, detail (with pages), edit
- Pages — create (with framework picker + client selector), view
- Step editor — three panel layout, step navigation, generate, refine, commit, discard
- /api/db/mutate — insert/update/delete, production grade security
- /api/pages/create — page + step snapshot, production grade security
- /api/generations/create — Claude streaming + save after stream, production grade security
- RLS policies — all tables, verified working

### Done and merged ✅ (March 31, 2026)
- ENGNEER-107: page status migration complete
  pages.status is now TEXT with CHECK constraint: in_attesa | in_lavorazione | completato | archiviato
  PageStatus enum dropped from Postgres and schema.prisma
  All frontend badges updated to Italian labels and NuxtUI colours

### Done ✅ (April 1, 2026)
- ENGNEER-108: clients.status column added (aperto | completato)
- ENGNEER-109: AppSidebar rebuilt — three sections: Clienti (/clienti), Progetti (/progetti), Impostazioni (/impostazioni, bottom). NuxtUI UButton ghost/neutral, active state via route prefix match, sign-out button retained.
- ENGNEER-113: AppSidebar sub-navigation — Clienti/Progetti are now non-interactive section labels; 7 sub-links with route+query active state (isSubActive). Clienti: Aperti/Completati/Tutti. Progetti: In attesa/In lavorazione/Completati/Archiviati.
- ENGNEER-110: /clienti/index.vue — rebuilt as UTable with columns: Cliente, Programmi (folder count), Documenti, Ultima modifica, Stato. Status filtering via ?status query param, client-side search, filter chips (Tutti view), + Nuovo cliente button (hidden on completato). dashboard.vue redirects to /clienti.
- ENGNEER-111: /progetti/index.vue — UTable of all folders with columns: Progetto, Cliente, Documenti (X/Y completed), Ultima modifica, Stato (derived from pages). Derived status logic: in_attesa|in_lavorazione|completato|archiviato. Search by program_name and client name.
- ENGNEER-112: /clients/[id]/index.vue rebuilt — flat Programmi UTable (Programma, Documenti, Ultima modifica, Stato, Apri →), client status USelect (updates via /api/db/mutate), header with meta line and action buttons.

### Navigation redesign in progress ⚙️ (ENGNEER-106)
Parent: ENGNEER-106. Read Design e Architettura Informativa before touching any nav or list view.

| Issue | What | Status |
|-------|------|--------|
| ENGNEER-108 | clients.status column | ✅ Done |
| ENGNEER-109 | Sidebar rebuild | ✅ Done |
| ENGNEER-110 | /clienti list views | ✅ Done |
| ENGNEER-111 | /progetti list views | ✅ Done |
| ENGNEER-112 | Client page rebuild | ✅ Done |
| ENGNEER-105 | Page card improvements | ✅ Done |

### Post-navigation V0 blockers ⬜
- ENGNEER-92: step-type-aware input panel
- ENGNEER-93: generation pipeline — use form_data not userContext
- ENGNEER-87: Word export (.docx) — primary V0 deliverable
- ENGNEER-86: step 3 dynamic form (Struttura Partecipativa)
- ENGNEER-98: V0 exit test — gate issue

### Known issues / decisions
- prisma/migrations table RLS warning in Supabase dashboard → intentional, ignore
- app/pages/clients/[id]/profiles/ → dead route, redirects to edit, can be deleted
- SUPABASE_SECRET_KEY and SUPABASE_SERVICE_KEY must both be set to same value
- White screen / 504 after branch switch → run: rm -rf .nuxt && npm run dev
- prisma migrate dev causes drift errors — never use it. Manual migration pattern only.
- folders.name column still exists, NOT NULL dropped — remove in ENGNEER-103
- dashboard.vue now redirects to /clienti (done in ENGNEER-110)

### Shared utilities — always use, never inline
- `~/utils/status.ts` — all status→colour and status→label maps. Never define `statusColor` or `statusLabel` inline in a component or page.
- `~/utils/date.ts` — all date formatting. Never inline `formatDate` or `formatISODate`.
- `~/utils/folderStatus.ts` — `deriveFolderStatus()`. Never inline this logic.
- `~/types/app.types.ts` — all shared TypeScript types. Never define shared types inline in pages.
- Rule: if two files could ever need the same function or map, it lives in utils. Not in the component.

### Language
- PageCraft is an Italian-only product. pagecraft.it is the domain. Users are Italian professionals.
- All UI strings are written directly in Italian in templates. No i18n module. No `$t()`. No translation keys.
- Code stays in English: variable names, function names, file names, DB tables, routes, comments.
- Status labels in `~/utils/status.ts` are already in Italian — keep them that way.
- If an international version is ever built, it will be a separate product fork, not a translation layer added to this codebase.
