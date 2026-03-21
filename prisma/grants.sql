-- prisma/grants.sql
-- Run this after every migrate reset, BEFORE seed.sql.
-- Execute in Supabase SQL editor.
--
-- prisma migrate reset wipes all Postgres grants and column defaults.
-- This file restores everything the app needs to function.
--
-- Reset procedure (full sequence):
--   1. npx prisma migrate reset --force
--   2. npx prisma migrate dev --name init_v2
--   3. npm run generate:types
--   4. Run prisma/grants.sql         in Supabase SQL editor  ← this file
--   5. Run prisma/seed.sql           in Supabase SQL editor
--   6. Run prisma/rls_policies.sql   in Supabase SQL editor
--   7. Run prisma/trigger.sql        in Supabase SQL editor

-- ─── Schema access for all roles ─────────────────────────────────────────────
-- Postgres requires explicit USAGE on the schema before any table access.
-- All three roles need it: anon (unauthenticated), authenticated (logged-in
-- users), and service_role (server-side admin via serverSupabaseServiceRole).

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Apply to any tables created in the future as well
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- ─── Column defaults ──────────────────────────────────────────────────────────
-- Prisma's @default(uuid()) and @updatedAt are handled in Prisma client code,
-- NOT at the database level. Since we use the Supabase JS client directly
-- (which bypasses Prisma), we must add database-level defaults manually.
-- Without these, inserts that don't explicitly set id or updated_at will fail
-- with a NOT NULL constraint violation.

-- UUIDs
ALTER TABLE public.clients          ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.folders          ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.pages            ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.steps            ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.generations      ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.files            ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.generation_files ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- updated_at timestamps
ALTER TABLE public.clients          ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.folders          ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.pages            ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.steps            ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.generations      ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.frameworks       ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.framework_steps  ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.users            ALTER COLUMN updated_at SET DEFAULT now();

-- ─── Verify ───────────────────────────────────────────────────────────────────
SELECT table_name, column_name, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name IN ('id', 'updated_at')
AND column_default IS NOT NULL
ORDER BY table_name, column_name;
