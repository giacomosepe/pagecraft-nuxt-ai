-- prisma/rls_policies.sql
-- Run this after every migrate reset, AFTER seed.sql.
-- Execute in Supabase SQL editor or via psql.
--
-- This file defines all Row Level Security policies for the app.
-- RLS is enabled on all tables by default in Supabase.
-- These policies ensure users can only access their own data.
--
-- Reset procedure:
--   1. npx prisma migrate reset --force
--   2. npx prisma migrate dev --name init_v2
--   3. npm run generate:types
--   4. Run prisma/seed.sql in Supabase SQL editor
--   5. Run prisma/rls_policies.sql in Supabase SQL editor

-- ─── Drop existing policies (safe to re-run) ─────────────────────────────────

DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN (
      'frameworks', 'framework_steps', 'clients', 'pages',
      'folders', 'steps', 'generations', 'files', 'generation_files'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ─── frameworks (read only — system owned, no user_id) ────────────────────────

CREATE POLICY "Public frameworks are readable by all authenticated users"
ON frameworks FOR SELECT TO authenticated
USING (is_public = true AND deprecated_at IS NULL);

-- ─── framework_steps (read only — system owned) ──────────────────────────────

CREATE POLICY "Framework steps are readable by all authenticated users"
ON framework_steps FOR SELECT TO authenticated
USING (true);

-- ─── clients ──────────────────────────────────────────────────────────────────

CREATE POLICY "Users can read their own clients"
ON clients FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own clients"
ON clients FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own clients"
ON clients FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own clients"
ON clients FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ─── pages ────────────────────────────────────────────────────────────────────

CREATE POLICY "Users can read their own pages"
ON pages FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own pages"
ON pages FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own pages"
ON pages FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own pages"
ON pages FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ─── folders ──────────────────────────────────────────────────────────────────

CREATE POLICY "Users can read their own folders"
ON folders FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own folders"
ON folders FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own folders"
ON folders FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own folders"
ON folders FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ─── steps (owned through pages — no user_id directly on row) ────────────────

CREATE POLICY "Users can read steps of their own pages"
ON steps FOR SELECT TO authenticated
USING (page_id IN (SELECT id FROM pages WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert steps on their own pages"
ON steps FOR INSERT TO authenticated
WITH CHECK (page_id IN (SELECT id FROM pages WHERE user_id = auth.uid()));

CREATE POLICY "Users can update steps on their own pages"
ON steps FOR UPDATE TO authenticated
USING (page_id IN (SELECT id FROM pages WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete steps on their own pages"
ON steps FOR DELETE TO authenticated
USING (page_id IN (SELECT id FROM pages WHERE user_id = auth.uid()));

-- ─── generations (owned through steps → pages) ───────────────────────────────

CREATE POLICY "Users can read their own generations"
ON generations FOR SELECT TO authenticated
USING (step_id IN (
  SELECT s.id FROM steps s
  JOIN pages p ON p.id = s.page_id
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own generations"
ON generations FOR INSERT TO authenticated
WITH CHECK (step_id IN (
  SELECT s.id FROM steps s
  JOIN pages p ON p.id = s.page_id
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Users can update their own generations"
ON generations FOR UPDATE TO authenticated
USING (step_id IN (
  SELECT s.id FROM steps s
  JOIN pages p ON p.id = s.page_id
  WHERE p.user_id = auth.uid()
));

-- ─── files ────────────────────────────────────────────────────────────────────

CREATE POLICY "Users can read their own files"
ON files FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own files"
ON files FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own files"
ON files FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own files"
ON files FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ─── generation_files (owned through generations → steps → pages) ─────────────

CREATE POLICY "Users can read their own generation files"
ON generation_files FOR SELECT TO authenticated
USING (generation_id IN (
  SELECT g.id FROM generations g
  JOIN steps s ON s.id = g.step_id
  JOIN pages p ON p.id = s.page_id
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own generation files"
ON generation_files FOR INSERT TO authenticated
WITH CHECK (generation_id IN (
  SELECT g.id FROM generations g
  JOIN steps s ON s.id = g.step_id
  JOIN pages p ON p.id = s.page_id
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own generation files"
ON generation_files FOR DELETE TO authenticated
USING (generation_id IN (
  SELECT g.id FROM generations g
  JOIN steps s ON s.id = g.step_id
  JOIN pages p ON p.id = s.page_id
  WHERE p.user_id = auth.uid()
));

-- ─── users (read own row only) ────────────────────────────────────────────────
-- The users table mirrors auth.users — Supabase manages it via trigger.
-- Users should only be able to read their own row.

CREATE POLICY "Users can read their own user record"
ON users FOR SELECT TO authenticated
USING (id = auth.uid());

-- ─── Verify ───────────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
