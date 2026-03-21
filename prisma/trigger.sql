-- prisma/trigger.sql
-- Run this after every migrate reset, AFTER rls_policies.sql.
-- Execute in Supabase SQL editor.
--
-- This file recreates the auth trigger and backfills any existing users.
-- prisma migrate reset DELETES this trigger — it must be recreated manually.
--
-- Reset procedure (full sequence):
--   1. npx prisma migrate reset --force
--   2. npx prisma migrate dev --name init_v2
--   3. npm run generate:types
--   4. Run prisma/seed.sql          in Supabase SQL editor
--   5. Run prisma/rls_policies.sql  in Supabase SQL editor
--   6. Run prisma/trigger.sql       in Supabase SQL editor  ← this file

-- ─── Step 1: Recreate the trigger function ────────────────────────────────────
-- Fires after every INSERT on auth.users (i.e. every new signup).
-- Copies the new user's id, email and name into public.users.
-- SECURITY DEFINER means it runs with the privileges of the creator (admin),
-- not the user triggering it — necessary because regular users can't write
-- to public.users directly.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    now(),
    now()
  );
  RETURN new;
END;
$$;

-- ─── Step 2: Recreate the trigger ────────────────────────────────────────────
-- DROP first in case a partial version exists from a previous run.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- ─── Step 3: Backfill existing auth users ────────────────────────────────────
-- The trigger only fires for NEW signups going forward.
-- Any users that already exist in auth.users (created before or during the
-- reset) need to be manually inserted into public.users.
-- ON CONFLICT DO NOTHING makes this safe to re-run.

INSERT INTO public.users (id, email, full_name, created_at, updated_at)
SELECT
  id,
  email,
  raw_user_meta_data->>'full_name',
  now(),
  now()
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ─── Verify ───────────────────────────────────────────────────────────────────

-- Confirm trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users';

-- Confirm public.users has rows matching auth.users
SELECT
  (SELECT count(*) FROM auth.users)   AS auth_users,
  (SELECT count(*) FROM public.users) AS public_users;
