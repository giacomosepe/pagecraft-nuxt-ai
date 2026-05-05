# PageCraft — prisma/AGENTS.md
# Last updated: April 22, 2026

Read this file when changing `prisma/`, SQL seeds, RLS, grants, triggers, or migration-related behavior.

---

## What this file owns

This file holds database operating rules for:
- `schema.prisma`
- `migrations/`
- `seed.sql`
- `grants.sql`
- `rls_policies.sql`
- `trigger.sql`

For server route behavior and Supabase auth patterns, read `../server/AGENTS.md`.

---

## Migration discipline

- Never run `prisma migrate dev` against an existing shared database.
- Use the established manual migration flow for existing environments.
- Treat `DATABASE_URL` as the pooled runtime connection and `DIRECT_URL` as the direct migration connection.

If you must rebuild locally from scratch, the reset order is:

```bash
npx prisma migrate reset --force
npx prisma migrate dev --name init_v2
npm run generate:types
```

Then apply SQL in Supabase SQL editor in this order:
1. `prisma/grants.sql`
2. `prisma/seed.sql`
3. `prisma/rls_policies.sql`
4. `prisma/trigger.sql`

`grants.sql` is critical. If it is missing, inserts fail even when the app code looks correct.

---

## Current schema constraints

### `pages.status`
- Stored as `TEXT` with a check constraint.
- Never recreate the old Postgres enum.

### `folders`
- No `status` column.
- Folder status is derived in the app from pages.
- Legacy `name` still exists and is pending cleanup; do not build new logic around it.

### `steps`
- `form_schema` is JSONB and must remain populated for seeded framework-backed steps.
- `framework_step_id` should be present on new rows.
- Old rows may still need title-based backfill logic during repair work.

### `framework_steps`
- System-owned, seeded, read-only for users.
- `form_schema` must carry the full field definition shape expected by the app.

### `clients`
- `company_profiles` is gone.
- Never reintroduce `company_profiles` or `company_profile_id`.

---

## Seed and re-seed rules

- Every `ON CONFLICT ... DO UPDATE SET` block in `seed.sql` must include every mutable field that needs to stay in sync.
- Do not write partial update sets that silently preserve stale prompt templates, schemas, or step types.
- When step schema shape changes, review whether seed/backfill expectations also changed.

---

## RLS and Supabase notes

- Browser reads rely on RLS; do not duplicate user filters unnecessarily just because the old code did.
- The `prisma/migrations` RLS warning in Supabase is intentional and should be ignored.
- Review RLS impact before adding new tables to `server/api/db/mutate.post.ts` or other user-scoped mutation paths.

---

## Step prompt column rule

`type_a` and `type_b` steps that do not use AI generation must have
`system_prompt_template` and `refine_prompt_template` set to `''` in the seed.
Only `type_c` steps carry real prompt content.
A non-empty prompt on a non-generating step is always wrong.

---

## What not to do

- Never add a `status` column to `folders`.
- Never recreate the old `page_status` enum.
- Never reference `company_profiles` or `company_profile_id`.
- Never run `seed.sql` before `grants.sql`.
- Never assume a partial `ON CONFLICT ... DO UPDATE SET` is harmless.
