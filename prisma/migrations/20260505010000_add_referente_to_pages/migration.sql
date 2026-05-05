ALTER TABLE "pages"
  ADD COLUMN IF NOT EXISTS "referente" TEXT;

UPDATE "framework_steps"
SET
  "system_prompt_template" = '',
  "refine_prompt_template" = '',
  "form_schema" = '[
  {"key": "program_title", "label": "Titolo del programma", "type": "project_detail", "placeholder": "es. Nuovo Patent Box 2025", "required": true, "hint": "Collegato al titolo del documento."},
  {"key": "company_name", "label": "Ragione sociale", "type": "client_detail", "placeholder": "es. Acme S.r.l.", "required": true, "hint": "Collegato alla scheda cliente."},
  {"key": "tax_year", "label": "Anno di imposta", "type": "project_detail", "placeholder": "es. 2026", "required": true, "hint": "Collegato ai dettagli progetto."},
  {"key": "legal_representative", "label": "Legale rappresentante", "type": "client_detail", "placeholder": "es. Mario Rossi", "required": true, "hint": "Collegato alla scheda cliente."}
]'::jsonb,
  "updated_at" = NOW()
WHERE "id" = '11111111-0000-0000-0000-000000000001';

UPDATE "steps" s
SET "form_schema" = fs."form_schema"
FROM "framework_steps" fs
WHERE fs."id" = s."framework_step_id"
  AND fs."id" = '11111111-0000-0000-0000-000000000001'
  AND s."form_schema" IS DISTINCT FROM fs."form_schema";
