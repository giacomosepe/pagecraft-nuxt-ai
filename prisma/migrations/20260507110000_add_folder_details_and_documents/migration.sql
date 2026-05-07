ALTER TABLE "folders"
  ADD COLUMN IF NOT EXISTS "tax_year" INTEGER,
  ADD COLUMN IF NOT EXISTS "referente" TEXT;

CREATE TABLE IF NOT EXISTS "folder_documents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "folder_id" UUID NOT NULL REFERENCES "folders"("id") ON DELETE CASCADE,
  "slot" TEXT NOT NULL CHECK ("slot" IN ('contratto', 'additional')),
  "filename" TEXT NOT NULL,
  "file_size_bytes" INTEGER,
  "storage_path" TEXT NOT NULL,
  "uploaded_at" TIMESTAMPTZ DEFAULT NOW(),
  "user_id" UUID REFERENCES auth.users("id"),
  CONSTRAINT "folder_documents_folder_id_slot_key" UNIQUE ("folder_id", "slot")
);

CREATE INDEX IF NOT EXISTS "folder_documents_folder_id_idx"
ON "folder_documents"("folder_id");

CREATE INDEX IF NOT EXISTS "folder_documents_user_id_idx"
ON "folder_documents"("user_id");

ALTER TABLE "folder_documents" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.folder_documents FROM anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.folder_documents
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
      'folder-documents',
      'folder-documents',
      FALSE,
      20971520,
      ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

    EXECUTE 'DROP POLICY IF EXISTS "Users can read own folder document storage objects" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Users can upload own folder document storage objects" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own folder document storage objects" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own folder document storage objects" ON storage.objects';

    EXECUTE $policy$
      CREATE POLICY "Users can read own folder document storage objects"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'folder-documents'
        AND EXISTS (
          SELECT 1
          FROM public.folders f
          WHERE f.id::text = (storage.foldername(name))[1]
            AND f.user_id = auth.uid()
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "Users can upload own folder document storage objects"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'folder-documents'
        AND EXISTS (
          SELECT 1
          FROM public.folders f
          WHERE f.id::text = (storage.foldername(name))[1]
            AND f.user_id = auth.uid()
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "Users can update own folder document storage objects"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'folder-documents'
        AND EXISTS (
          SELECT 1
          FROM public.folders f
          WHERE f.id::text = (storage.foldername(name))[1]
            AND f.user_id = auth.uid()
        )
      )
      WITH CHECK (
        bucket_id = 'folder-documents'
        AND EXISTS (
          SELECT 1
          FROM public.folders f
          WHERE f.id::text = (storage.foldername(name))[1]
            AND f.user_id = auth.uid()
        )
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "Users can delete own folder document storage objects"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'folder-documents'
        AND EXISTS (
          SELECT 1
          FROM public.folders f
          WHERE f.id::text = (storage.foldername(name))[1]
            AND f.user_id = auth.uid()
        )
      )
    $policy$;
  END IF;
END $$;
