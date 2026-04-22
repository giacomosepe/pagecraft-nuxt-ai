# PageCraft — server/AGENTS.md
# Last updated: April 22, 2026

Read this file when changing `server/` routes or server-side helpers.

---

## What this file owns

This file holds backend operating rules for:
- `server/api/`
- server-side Supabase auth and service-role usage
- Zod validation in routes
- generation, export, visura extraction, and destructive mutation flows

It is not the DB schema source of truth.
For migrations, RLS, seeds, and schema constraints, read `../prisma/AGENTS.md`.

---

## Auth pattern

Every user-scoped route must start from `serverSupabaseClient(event)` and `auth.getUser()`.

```ts
const client = await serverSupabaseClient(event);
const { data: { user } } = await client.auth.getUser();
if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });
```

- Never use `serverSupabaseUser()`.
- Use `serverSupabaseServiceRole(event)` only for system-owned reads or writes that must bypass RLS.

---

## Route ownership

- `server/api/db/mutate.post.ts`
  Generic whitelisted write route. RLS applies. Do not add tables casually; review RLS and client-side call sites first.
- `server/api/db/delete.post.ts`
  Canonical destructive orchestration route for cascaded entity deletion.
  Do not recreate delete logic ad hoc in feature routes unless the flow is genuinely new.
- `server/api/pages/create.post.ts`
  Single page creation route.
  Must keep snapshotting `framework_steps` into `steps`, including `form_schema`.
- `server/api/pages/create-batch.post.ts`
  Batch page creation path.
  When fixing creation behavior, verify both create routes before closing the task.
- `server/api/generations/create.post.ts`
  Canonical generation/refine streaming route.
  Assembles prompt context server-side from current step data and prior committed steps.
- `server/api/export/word.post.ts`
  Word export route. Treat it as the single export contract unless the issue explicitly changes export architecture.
- `server/api/visura/*.post.ts`
  Upload/extraction flow for visura parsing. Keep legacy compatibility paths only when needed for existing clients.

---

## Generation pipeline rules

- Request body stays narrow: `{ stepId, pageId, mode }`.
- Do not add `userContext` back into the request body.
- Server prompt assembly reads from stored `form_data`, `form_schema`, and prior committed steps.
- Prior-step context is ordered and truncated server-side.
- Empty optional fields are omitted during prompt assembly.
- Repeatable-group entries with `ip_linked = No` are skipped silently.
- Save `lastPromptUsed` after each generation/refine call.

---

## Zod and server typing

- Use Zod v4 syntax: `z.record(z.string(), z.unknown())`.
- Never use one-argument `z.record(...)` in this repo.
- Import from `zod`, never `zod/v4`.
- Keep server route payload validation close to the route; do not hide it behind loose helper layers unless reused by multiple routes.

---

## Supabase and environment notes

- `@nuxtjs/supabase` is mapped in `nuxt.config.ts` from `NUXT_PUBLIC_SUPABASE_URL` and `NUXT_PUBLIC_SUPABASE_KEY`.
- Do not remove or comment out the explicit `supabase: { url, key }` mapping in `nuxt.config.ts`.
- `SUPABASE_SECRET_KEY` is server-only and must align with the service role secret.
- `NUXT_ANTHROPIC_API_KEY` is server-only.

---

## Server-side caveats

- `app/composables/useClientFields.ts` is client-side only; do not import it into server routes.
- Server routes that need company context should assemble it inline from the joined client data.
- Treat legacy upload field names such as `visura_upload` and `file` as compatibility paths, not preferred names.
- If a spec lists field names, prompts, or options, verify them in the live source before editing routes.

---

## What not to do

- Never use `serverSupabaseUser()`.
- Never import client composables into `server/api/`.
- Never add `userContext` back to the generation request contract.
- Never remove `form_schema` from the framework-step snapshot during page creation.
- Never split destructive deletion logic across multiple ad hoc routes when `db/delete.post.ts` already owns the cascade.
