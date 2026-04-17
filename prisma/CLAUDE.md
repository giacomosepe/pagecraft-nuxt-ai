# PageCraft — Database Rules
# Loaded automatically when reading/writing files in prisma/

---

## Reset procedure — run in this exact order

```bash
npx prisma migrate reset --force
npx prisma migrate dev --name init_v2
npm run generate:types
```

Then in Supabase SQL editor, in this order:
1. `prisma/grants.sql` ← MOST CRITICAL — without it every insert fails
2. `prisma/seed.sql`
3. `prisma/rls_policies.sql`
4. `prisma/trigger.sql`

Never use `prisma migrate dev` on an existing DB — manual migration pattern only.

---

## Schema — key tables and constraints

### pages.status
TEXT with CHECK constraint — NOT a Postgres enum.
Values: `in_attesa | in_lavorazione | completato | archiviato`
Old enum `page_status` has been dropped. Never recreate it.

### folders
No `status` column — derived from pages in the frontend. Never add it.
Legacy `name` column still exists (NOT NULL dropped) — remove in ENGNEER-103.

### steps
- `form_schema` (JSONB) — copied from framework_steps at page creation. Must not be null.
- `framework_step_id` — foreign key to framework_steps. Always populated on new pages.
- Old pages (created before April 2026) may have null `framework_step_id` — use title-based join for backfills.

### framework_steps
System-owned, seeded, read-only for users.
`form_schema` must include all field definitions — `conditional`, `hint`, `placeholder`, `required`, `defaultValue` — never omit them.

### clients
`company_profiles` table deleted — all company data lives on `clients`.
Never reference `company_profiles` or `company_profile_id`.

---

## seed.sql rules

- Every `ON CONFLICT (id) DO UPDATE SET` block must include all mutable fields:
  `system_prompt_template, refine_prompt_template, form_schema, step_type, updated_at`
- Never use a partial SET clause — fields not listed are silently skipped on re-seed

---

## RLS

- No `.eq("user_id", ...)` needed on browser reads — RLS handles it automatically
- `prisma/migrations` table RLS warning in Supabase dashboard → intentional, ignore

---

## What NOT to do — database

- Never use `prisma migrate dev` on an existing DB
- Never add `status` column to `folders`
- Never recreate the `page_status` Postgres enum
- Never reference `company_profiles` or `company_profile_id`
- Never write a partial `ON CONFLICT DO UPDATE SET` in seed.sql
- Never run seed.sql before grants.sql
