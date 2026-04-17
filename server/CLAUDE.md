# PageCraft — Backend Rules
# Loaded automatically when reading/writing files in server/

---

## Auth pattern — every route must start with this

```ts
const client = await serverSupabaseClient(event);
const { data: { user } } = await client.auth.getUser();
if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });
```

Never use `serverSupabaseUser()` — use `serverSupabaseClient` + `auth.getUser()`.
For system operations (reading framework_steps etc.): use `serverSupabaseServiceRole(event)`.

---

## Zod v4 syntax

```ts
z.record(z.string(), z.unknown())   // ✅ v4 — two args required
z.record(z.unknown())               // ❌ breaks silently
import { z } from 'zod'             // ✅ correct — never 'zod/v4'
```

---

## Environment variables

```
NUXT_PUBLIC_SUPABASE_URL  ← mapped in nuxt.config.ts: url: process.env.NUXT_PUBLIC_SUPABASE_URL
NUXT_PUBLIC_SUPABASE_KEY  ← mapped in nuxt.config.ts: key: process.env.NUXT_PUBLIC_SUPABASE_KEY
SUPABASE_SECRET_KEY       ← server only (must equal SUPABASE_SERVICE_KEY)
NUXT_ANTHROPIC_API_KEY    ← server only
DATABASE_URL              ← Prisma pooled (port 6543, pgbouncer=true)
DIRECT_URL                ← Prisma direct for migrations (port 5432)
```

CRITICAL: @nuxtjs/supabase defaults to SUPABASE_URL and SUPABASE_KEY.
This project uses NUXT_PUBLIC_ prefixed names — mapped explicitly in nuxt.config.ts.
Never remove or comment out `supabase: { url, key }` in nuxt.config.ts or Supabase breaks.

---

## Key routes — what they do and what not to touch

- `server/api/db/mutate.post.ts` — generic write route. Whitelisted tables: clients, folders, pages, files, steps, generations. Uses userClient (RLS applies). Do not add tables without reviewing RLS.
- `server/api/pages/create.post.ts` — creates page + snapshots framework_steps into steps rows. Must copy form_schema from framework_steps — do not remove that field from the select.
- `server/api/generations/create.post.ts` — AI streaming. Reads form_data + prior committed steps. Assembles prompt server-side. Do not add userContext back.
- `server/api/export/word.post.ts` — Word export. Accepts { pageId }, returns .docx binary.

---

## Generation pipeline rules

- Request body: `{ stepId, pageId, mode }` only — no userContext
- Server reads form_data and form_schema from the step record
- Prior committed steps injected as cross-step context (ordered, truncated if >24000 chars)
- Empty optional fields omitted from prompt assembly
- Repeatable group items with `ip_linked = No` excluded silently
- One generation call per step — no per-block calls
- `lastPromptUsed` saved on Step record after every generation

---

## useClientFields — cannot use server-side

`app/composables/useClientFields.ts` uses Vue's `computed()` — it cannot be imported in server routes.
Company context for server routes is assembled inline from the clients table join.
See `create.post.ts` for the `formatShareholders()` / `formatSubsidiaries()` pattern.

---

## What NOT to do — backend

- Never use `serverSupabaseUser()` — use `serverSupabaseClient` + `auth.getUser()`
- Never import `useClientFields` in server routes — client-side only
- Never add `userContext` back to the generation request body
- Never remove `supabase: { url, key }` mapping from nuxt.config.ts
- Never use `z.record()` with one argument in Zod v4
