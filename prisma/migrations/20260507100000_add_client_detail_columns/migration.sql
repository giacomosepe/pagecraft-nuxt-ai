-- Migration: add client detail columns for ENGNEER-325, 326, 327, 328
-- Columns already in schema (do not re-add):
--   company_name, codice_fiscale, vat_number, employee_count, legal_representative,
--   registered_address, company_form, industry_sector

-- ENGNEER-325: Anagrafica — structured address
ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "street_address" TEXT,
  ADD COLUMN IF NOT EXISTS "city"           TEXT,
  ADD COLUMN IF NOT EXISTS "provincia"      TEXT,
  ADD COLUMN IF NOT EXISTS "cap"            TEXT;

-- ENGNEER-326: Dati aziendali — revenue
ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "revenue" NUMERIC;

-- ENGNEER-327: Legale rappresentante — split from old single-text legal_representative
ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "legal_rep_name" TEXT,
  ADD COLUMN IF NOT EXISTS "legal_rep_cf"   TEXT,
  ADD COLUMN IF NOT EXISTS "legal_rep_dob"  DATE;

-- Backfill: copy existing legal_representative value into legal_rep_name where set
UPDATE "clients"
SET "legal_rep_name" = "legal_representative"
WHERE "legal_representative" IS NOT NULL
  AND "legal_rep_name" IS NULL;

-- legal_representative is now deprecated — kept nullable, no longer written to

-- ENGNEER-328: Referente — client contact person
ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "contact_name"  TEXT,
  ADD COLUMN IF NOT EXISTS "contact_email" TEXT,
  ADD COLUMN IF NOT EXISTS "contact_phone" TEXT;
