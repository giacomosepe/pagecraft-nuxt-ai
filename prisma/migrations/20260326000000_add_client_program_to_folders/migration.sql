-- Add client_id and program_name to folders
-- Folders become program containers scoped to a client.
-- Both columns nullable — no impact on existing folder records.

ALTER TABLE "folders"
  ADD COLUMN IF NOT EXISTS "client_id" UUID REFERENCES "clients"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "program_name" TEXT;
