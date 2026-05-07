CREATE TABLE IF NOT EXISTS "page_context_documents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "page_id" UUID NOT NULL REFERENCES "pages"("id") ON DELETE CASCADE,
  "slot" TEXT NOT NULL CHECK ("slot" IN ('technical_presentation', 'financial_notes', 'additional_docs')),
  "filename" TEXT NOT NULL,
  "file_size_bytes" INTEGER,
  "storage_path" TEXT NOT NULL,
  "extracted_text" TEXT,
  "extracted_at" TIMESTAMPTZ,
  "uploaded_at" TIMESTAMPTZ DEFAULT NOW(),
  "user_id" UUID REFERENCES auth.users("id"),
  CONSTRAINT "page_context_documents_page_id_slot_key" UNIQUE ("page_id", "slot")
);

CREATE INDEX IF NOT EXISTS "page_context_documents_page_id_idx"
ON "page_context_documents"("page_id");

CREATE INDEX IF NOT EXISTS "page_context_documents_user_id_idx"
ON "page_context_documents"("user_id");

CREATE TABLE IF NOT EXISTS "framework_step_examples" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "framework_step_id" UUID NOT NULL REFERENCES "framework_steps"("id") ON DELETE CASCADE,
  "label" TEXT NOT NULL,
  "sector" TEXT,
  "content" TEXT NOT NULL,
  "blocklist" TEXT[] DEFAULT '{}',
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "framework_step_examples_lookup_idx"
ON "framework_step_examples"("framework_step_id", "is_active", "created_at" DESC);

COMMENT ON COLUMN "framework_step_examples"."blocklist" IS
'Stored metadata for seeded few-shot examples. Runtime enforcement belongs to generation sanitisation, not this schema migration.';

ALTER TABLE "page_context_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "framework_step_examples" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.page_context_documents FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.framework_step_examples FROM anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.page_context_documents
TO authenticated, service_role;

GRANT SELECT
ON TABLE public.framework_step_examples
TO authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.schemata
    WHERE schema_name = 'storage'
  ) THEN
    INSERT INTO storage.buckets (
      id,
      name,
      public,
      file_size_limit,
      allowed_mime_types
    )
    VALUES (
      'page-context-documents',
      'page-context-documents',
      FALSE,
      20971520,
      ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

    EXECUTE 'DROP POLICY IF EXISTS "Users can read own page context storage objects" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Users can upload own page context storage objects" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own page context storage objects" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own page context storage objects" ON storage.objects';

    EXECUTE $policy$
      CREATE POLICY "Users can read own page context storage objects"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'page-context-documents'
        AND EXISTS (
          SELECT 1
          FROM public.pages p
          WHERE p.id::text = (storage.foldername(name))[1]
            AND p.user_id = auth.uid()
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "Users can upload own page context storage objects"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'page-context-documents'
        AND EXISTS (
          SELECT 1
          FROM public.pages p
          WHERE p.id::text = (storage.foldername(name))[1]
            AND p.user_id = auth.uid()
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "Users can update own page context storage objects"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'page-context-documents'
        AND EXISTS (
          SELECT 1
          FROM public.pages p
          WHERE p.id::text = (storage.foldername(name))[1]
            AND p.user_id = auth.uid()
        )
      )
      WITH CHECK (
        bucket_id = 'page-context-documents'
        AND EXISTS (
          SELECT 1
          FROM public.pages p
          WHERE p.id::text = (storage.foldername(name))[1]
            AND p.user_id = auth.uid()
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "Users can delete own page context storage objects"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'page-context-documents'
        AND EXISTS (
          SELECT 1
          FROM public.pages p
          WHERE p.id::text = (storage.foldername(name))[1]
            AND p.user_id = auth.uid()
        )
      )
    $policy$;
  END IF;
END $$;
