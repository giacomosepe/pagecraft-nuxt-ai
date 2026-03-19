# PageCraft — Project Context for AI Assistants
# Last updated: March 19, 2026
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
| UI | NuxtUI | ^4.5.1 | includes Tailwind v4 and icons — do NOT add @nuxt/icon separately |
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
│   ├── assets/css/main.css      ← CSS path is ./assets NOT ~/assets
│   ├── components/
│   ├── composables/
│   ├── pages/
│   │   ├── index.vue            ← dashboard / library
│   │   ├── login.vue
│   │   ├── confirm.vue          ← Supabase auth callback
│   │   ├── clients/
│   │   │   ├── index.vue        ← clients list
│   │   │   ├── new.vue          ← new client form
│   │   │   └── [id].vue         ← client detail
│   │   └── pages/
│   │       ├── new.vue          ← new page creation
│   │       └── [id]/
│   │           └── index.vue    ← step editor (core of the app)
│   ├── types/
│   │   └── database.types.ts    ← auto-generated, never edit manually
│   └── app.config.ts
├── server/
│   ├── api/
│   │   ├── db/
│   │   │   └── mutate.post.ts   ← generic insert/update/delete route
│   │   └── generations/
│   │       └── create.post.ts   ← AI generation with streaming
│   └── utils/                   ← NO prisma.ts here — was deleted
├── i18n/
│   ├── i18n.config.ts           ← at project root NOT inside app/
│   └── locales/
│       ├── en.json
│       └── it.json
├── prisma/
│   ├── schema.prisma
│   └── migrations/              ← dated migration folders live here
├── CLAUDE.md                    ← this file
└── nuxt.config.ts
```

---

## Database schema (Supabase / PostgreSQL)

Tables: users, folders, clients, company_profiles, pages, files, steps, generations, frameworks, framework_steps

Key relationships:
- users → folders → pages
- users → clients → company_profiles
- pages → files (uploaded reference docs)
- pages → steps → generations
- framework_steps drives step UI dynamically (seeded, not user-created)

Seeded framework: "Italian Patent Box" (slug: italian-patent-box)
8 framework_steps in order:
1. Intestazione
2. Premessa
3. Struttura Partecipativa
4. Attività Rilevanti
5. Attività Commissionate a Terzi
6. Modello Organizzativo
7. Relazione Tecnica
8. Funzioni, Rischi e Beni

---

## CRITICAL: database query pattern

ALL runtime data access uses the Supabase client. Prisma is NEVER used at runtime.

```ts
// In components / composables:
const client = useSupabaseClient<Database>()
const user = useSupabaseUser()

const { data, error } = await client
  .from('clients')
  .select('*, company_profiles(*), pages(*)')
  .eq('user_id', user.value!.id)
if (error) throw error

// In server routes:
const client = await serverSupabaseClient(event)  // NOT serverSupabaseUser
const { data: { user } } = await client.auth.getUser()
if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })
```

Types live at: app/types/database.types.ts
Regenerate after every schema change: `npm run generate:types`

---

## CRITICAL: Zod v4 syntax rules

Zod 4.3.6 is installed. These are breaking differences from v3:

```ts
// z.record() REQUIRES two arguments in v4 — key type AND value type
z.record(z.string(), z.unknown())   // ✅ correct
z.record(z.unknown())               // ❌ breaks with _zod undefined error

// Import is standard
import { z } from 'zod'             // ✅ correct — do not use 'zod/v4'
```

---

## CRITICAL: server route patterns

```ts
// Generic mutate route — used for all insert/update/delete from the UI
// Lives at: server/api/db/mutate.post.ts
// Call from components via $fetch('/api/db/mutate', { method: 'POST', body: {...} })

// Whitelist pattern — all WHERE keys validated against ALLOWED_WHERE_KEYS
// Zod schema validates table name, operation, data, where

// Service role for cross-table writes:
const adminClient = await serverSupabaseServiceClient(event)
```

---

## RLS status

RLS is LIVE on all tables EXCEPT _prisma_migrations.
The _prisma_migrations warning in Supabase dashboard is intentional — ignore it.
Prisma needs service_role access to that table. Service_role bypasses RLS anyway.

---

## Design system

- Font: Geist (loaded from fonts.vercel.com)
- Primary color: brand ramp (OKLCH, hue ~264 indigo)
- Defined in: app/assets/css/main.css under @theme static
- NuxtUI config in app.config.ts: `primary: 'brand', neutral: 'zinc'`
- CSS path in nuxt.config.ts: `css: ['./assets/css/main.css']`
  (relative path — NOT ~/assets which resolves incorrectly in Nuxt 4)

---

## i18n setup

- Config: i18n/i18n.config.ts (project root, NOT inside app/)
- Locales: i18n/locales/en.json and i18n/locales/it.json
- nuxt.config.ts i18n block: no langDir or vueI18n needed
- Special characters (@) in JSON values: use vue-i18n escape {'you@example.com'}
- JSON must be valid — missing commas cause cryptic parse errors

---

## Environment variables

Supabase vars use NO Nuxt prefix — this is intentional, required by @nuxtjs/supabase
module which reads them directly. Adding NUXT_ prefix breaks Supabase auth.

```
SUPABASE_URL                    → public, safe in browser
SUPABASE_KEY                    → anon key, safe in browser
SUPABASE_SECRET_KEY             → service role key, server-side ONLY
NUXT_ANTHROPIC_API_KEY          → Claude API key, server-side ONLY
DATABASE_URL                    → Prisma pooled connection (port 6543)
DIRECT_URL                      → Prisma direct connection for migrations (port 5432)
```

---

## Schema change protocol

If a schema change is needed during a UI build session:
1. STOP — do not work around it in application code
2. Take it to the backend/DB chat
3. Flow: schema.prisma → prisma migrate dev → npm run generate:types → back to UI chat

---

## What NOT to do

- Never import from '@prisma/client' in components, composables, or server routes
- Never use ~/assets in CSS paths in nuxt.config.ts (use ./assets)
- Never add @nuxt/icon as a separate dependency (NuxtUI includes it)
- Never use z.record() with one argument in Zod v4
- Never use serverSupabaseUser() in server routes to get user.id (can be null — use serverSupabaseClient instead)
- Never update dependencies with @latest — always use explicit version numbers
- Never update multiple dependencies at once — one at a time, test after each

---

## Dependency pinning policy

Pinned (no caret — never auto-update):
- zod, @nuxtjs/supabase, ai, @ai-sdk/anthropic, @prisma/client, prisma

Loose (caret ok — follow Nuxt ecosystem):
- nuxt, vue, @nuxt/ui, tailwindcss, @nuxtjs/i18n, @nuxtjs/sitemap

To update a pinned package: `npm install package@x.x.x` (explicit version, one at a time)
To check what's outdated: `npm outdated`

---

## BUILD STATUS — update this every session

### Working ✅
- Auth (login, signup, confirm, middleware protection)
- Dashboard / library page
- Clients list, new client form, client detail
- Company profile form (with dynamic shareholders, board members, subsidiaries)
- /api/db/mutate route (insert, update, delete with Zod validation + whitelist)
- AI generation server route with streaming
- Step editor page ([id]/index.vue) — three panel layout, streaming generation, commit

### In progress 🔨
- Step editor — back button, prompt template wiring

### Not started yet ⬜
- Prompt templates management
- File upload and extraction
- Word document export
- Payments (Stripe) — v2
- Framework recommender — v2

### Known issues / decisions
- _prisma_migrations RLS warning in Supabase → intentional, ignore
- server/utils/prisma.ts deleted March 19 2026 — was orphan file, nothing used it
- Zod v4 z.record() requires two args — fixed in mutate.post.ts March 19 2026
