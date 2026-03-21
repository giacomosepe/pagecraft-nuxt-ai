# PageCraft — Project Context for AI Assistants
# Last updated: March 21, 2026
# Paste this at the start of every coding session.
# Update the BUILD STATUS section at the end of every session.

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
│   │   ├── AppSidebar.vue           ← nav: Pages + Clients only (no /folders or /settings)
│   │   ├── AppBottomBar.vue
│   │   ├── FrameworkPickerModal.vue  ← reads frameworks table client-side
│   │   └── StepContextModal.vue     ← receives clientData prop (NOT companyProfile)
│   ├── pages/
│   │   ├── dashboard.vue            ← pages list
│   │   ├── login.vue
│   │   ├── confirm.vue              ← Supabase auth callback
│   │   ├── clients/
│   │   │   ├── index.vue            ← clients list
│   │   │   ├── new.vue              ← new client (name only, insert via mutate)
│   │   │   └── [id]/
│   │   │       ├── index.vue        ← client detail + pages list for that client
│   │   │       ├── edit.vue         ← edit all client fields (update via mutate)
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

### pages table
Fields: id, user_id, folder_id, framework_id, framework_name (snapshot),
client_id (nullable), tax_year (nullable — belongs to the document not the company),
title, status (DRAFT|IN_PROGRESS|COMPLETED|ARCHIVED), created_at, updated_at

### steps table — no user_id, owned through pages
Fields: id, page_id, framework_step_id, order, title, system_prompt_template,
refine_prompt_template, form_schema (JSONB), form_data (JSONB), user_context,
last_prompt_used, committed_output, status (PENDING|IN_PROGRESS|COMMITTED|SKIPPED),
created_at, updated_at

### frameworks + framework_steps — system owned, seeded, read-only for users
Seeded: "Italian Patent Box" (8 steps in order):
1. Intestazione  2. Premessa  3. Struttura Partecipativa  4. Attività Rilevanti
5. Attività Commissionate a Terzi  6. Modello Organizzativo
7. Relazione Tecnica  8. Funzioni, Rischi e Beni

---

## Information flow — how data moves through the app

This section is critical for UI work. Understanding the data flow prevents
rebuilding things that already exist.

### Client data → AI generation pipeline

```
client record (DB)
  ↓
useClientFields(client, taxYear)        ← app/composables/useClientFields.ts
  ↓ produces two things:
  variableMap   { "legal_representative": "Mario Rossi", "shareholders.0.full_name": "..." }
  companyContext  Italian prose block for Claude's user message
  substitute()    {{variable}} template replacement function
  ↓
StepContextModal receives clientData prop
  ↓ user fills in step-specific fields
  assembles userContext string
  ↓
/api/generations/create receives { stepId, pageId, userContext, mode }
  ↓ server builds full prompt:
  systemPrompt (from step.system_prompt_template)
  + companyContext (built inline from client join)
  + userContext (from the modal or typed by user)
  ↓
Claude API → streams back → saved to generations table
```

### useClientFields composable — use this everywhere client data is needed

```ts
// In any Vue component that needs client data formatted:
import { useClientFields } from '~/composables/useClientFields'

const { variableMap, companyContext, substitute } = useClientFields(clientData, taxYear)

// variableMap: flat key→value map, e.g. variableMap.value['legal_representative']
// companyContext: formatted Italian prose for Claude
// substitute: replace {{placeholders}} in template strings
```

This composable is the single source of truth for formatting client data.
Do NOT inline client data formatting in components or server routes.
The server route (generations/create.post.ts) currently has its own inline
formatting — this should eventually be migrated to use the composable logic,
but for now both exist and produce consistent output.

### State that lives in each page

- dashboard.vue: reads pages list, no cross-page state
- clients/index.vue: reads clients list, no cross-page state
- clients/[id]/index.vue: reads one client + its pages, loads fresh each visit
- clients/[id]/edit.vue: loads client, saves via mutate, redirects back
- pages/new.vue: receives frameworkId + frameworkName via query params from dashboard
- pages/[id].vue: owns all step editor state — activeStepIndex, userContext,
  output, isGenerating, isCommitting. This state is local and NOT persisted
  until commit() is called. clientData loaded lazily after page loads.

### How pages/[id].vue gets client data

```ts
// page record has client_id
// clientData loaded lazily via watch after page loads
const clientData = ref(null)
watch(data, async (val) => {
  if (!val?.page?.client_id) return
  const { data: c } = await supabase.from('clients').select('...').eq('id', clientId).single()
  clientData.value = c
}, { once: true })
// clientData then passed to StepContextModal as :client-data="clientData"
```

### StepContextModal prop contract

```ts
// Receives:
props: {
  stepOrder: number          // 1–8, determines which form fields to show
  stepTitle: string          // display only
  clientData: ClientRecord | null  // from clients table — NOT companyProfile
}
// Emits:
emit('confirm', assembledContext: string)   // all steps except step 2
emit('confirmPremessa', { taxYearStart, taxYearEnd })  // step 2 only
emit('cancel')
```

### form_schema + form_data on steps (not yet fully wired)

Each step has form_schema (JSONB from framework_steps snapshot) that defines
guided form fields, and form_data (JSONB) that stores what the user entered.
These drive the StepContextModal fields. Currently the modal has hardcoded
fields per step order — migrating to dynamic form_schema rendering is future work.

---

## CRITICAL: reset procedure after prisma migrate reset

prisma migrate reset destroys triggers, grants, and seeded data. Full sequence:

```
1. npx prisma migrate reset --force
2. npx prisma migrate dev --name init_v2
3. npm run generate:types
4. Run prisma/grants.sql        ← schema permissions + column defaults
5. Run prisma/seed.sql          ← framework data
6. Run prisma/rls_policies.sql  ← all RLS policies (drop + recreate)
7. Run prisma/trigger.sql       ← auth trigger + backfill existing users
```

grants.sql is the most critical step. Without it every insert fails with:
- "permission denied for schema public" (code 42501)
- "null value in column id" (code 23502)
- "null value in column updated_at" (code 23502)

These errors appear even though RLS policies look correct. The fix is always grants.sql.

---

## CRITICAL: data query patterns

ALL runtime data access uses Supabase JS client. Prisma is NEVER used at runtime.

### Browser reads — user client, RLS handles scoping automatically
```ts
// No .eq("user_id", user.value!.id) needed — RLS filters automatically
// Always use { server: false } for reads that need the user session
const supabase = useSupabaseClient();
const { data } = await useAsyncData("key", async () => {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return data;
}, { server: false });
```

### Server writes — mutate route
```ts
// All inserts, updates, deletes go through /api/db/mutate
await $fetch("/api/db/mutate", {
  method: "POST",
  body: {
    table: "clients",         // must be in Zod enum
    operation: "insert",      // insert | update | delete
    data: { name: "Acme" },   // user_id injected server-side on insert
    where: { id: clientId },  // only for update/delete
  },
});
```

### Server routes — auth pattern
```ts
const client = await serverSupabaseClient(event);
const { data: { user } } = await client.auth.getUser();
if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });
// user.id is now verified — safe to use
```

---

## CRITICAL: security architecture (production grade as of March 21, 2026)

Three layers of protection on every write:

1. Authentication: serverSupabaseClient + auth.getUser() — 401 if no valid session
2. Input validation: Zod schema — table whitelist, operation whitelist, WHERE key whitelist
3. Ownership: user_id injected server-side on insert; .eq("user_id") on update/delete
   for tables with user_id directly; RLS through parent chain for steps/generations

Tables with user_id directly: clients, folders, pages, files
Tables protected via parent chain: steps (via page_id), generations (via step_id)

Service role (serverSupabaseServiceRole) used ONLY in server routes, ONLY after
ownership is verified via the user client first.

White-screen symptom = uncaught async error in useAsyncData. Always check:
- Is a deleted table being queried?
- Is a deleted column being selected?

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
SUPABASE_KEY           ← publishable key (sb_publishable_...) — safe in browser
SUPABASE_SECRET_KEY    ← secret key (sb_secret_...) — server only, never expose
NUXT_ANTHROPIC_API_KEY ← Claude API — server only
DATABASE_URL           ← Prisma pooled connection (port 6543, pgbouncer=true)
DIRECT_URL             ← Prisma direct connection for migrations (port 5432)
```

Do NOT add NUXT_PUBLIC_ prefix to Supabase vars — breaks auth.
Do NOT add SUPABASE_SERVICE_KEY — SUPABASE_SECRET_KEY is sufficient and correct.
These are the new asymmetric JWT keys (sb_publishable_ / sb_secret_), not the old anon/service_role keys.

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

---

## Dependency pinning policy

Pinned (never auto-update): zod, @nuxtjs/supabase, ai, @ai-sdk/anthropic, prisma, @prisma/client
Loose (caret ok): nuxt, vue, @nuxt/ui, tailwindcss, @nuxtjs/i18n, @nuxtjs/sitemap

---

## BUILD STATUS

### Working ✅
- Auth (login, signup, confirm, session middleware)
- Dashboard — pages list
- Clients — list, create, detail (with pages), edit
- Pages — create (with framework picker + client selector), view
- Step editor — three panel layout, step navigation, generate, refine, commit, discard
- /api/db/mutate — insert/update/delete, production grade security
- /api/pages/create — page + step snapshot, production grade security
- /api/generations/create — Claude streaming + save after stream, production grade security
- RLS policies — all tables, verified working
- Auth trigger — recreated in trigger.sql, backfills existing users
- grants.sql — documents and fixes all post-reset breakage

### In progress 🔨
- StepContextModal — clientData prop wired, guided forms work, step 3 shareholder
  data not yet pulling from client record (needs connecting)
- AI generation — premessa template route (/api/generations/premessa) not yet built

### Not started yet ⬜
- Word document export
- File upload and text extraction
- /settings page
- /folders page
- Payments (Stripe) — v2
- Framework recommender — v2

### Known issues / decisions
- prisma/migrations table RLS warning in Supabase dashboard → intentional, ignore
- app/pages/clients/[id]/profiles/ → dead route, redirects to edit, can be deleted
- SUPABASE_SECRET_KEY and SUPABASE_SERVICE_KEY must both be set to same value
- Column defaults (id, updated_at) not set by Prisma migrations — grants.sql fixes this
- White screen after navigation = stale schema reference in useAsyncData — check query
