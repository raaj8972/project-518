-- Fix: Ensure registration-photos bucket exists (private) with correct policies
-- Safe/idempotent migration. Run in Supabase SQL editor or via CLI.

BEGIN;

-- 1) Ensure bucket exists and is private with reasonable limits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'registration-photos'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'registration-photos',
      'registration-photos',
      false,               -- private bucket
      5242880,             -- 5 MB default limit per object
      ARRAY['image/png','image/jpeg','image/jpg','image/webp']
    );
  ELSE
    -- Normalize existing bucket to private; preserve existing limits if set
    UPDATE storage.buckets
    SET public = false,
        file_size_limit = COALESCE(file_size_limit, 5242880),
        allowed_mime_types = COALESCE(allowed_mime_types, ARRAY['image/png','image/jpeg','image/jpg','image/webp'])
    WHERE id = 'registration-photos';
  END IF;
END $$;

-- 2) Remove any legacy public policies if they exist
DROP POLICY IF EXISTS "Public read registration-photos" ON storage.objects;
DROP POLICY IF EXISTS "Anon insert registration-photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth update registration-photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete registration-photos" ON storage.objects;

-- 2b) Remove any conflicting fallback policies to avoid over-broad access
-- These may have been created by earlier iterations/migrations.
DROP POLICY IF EXISTS regphotos_select_authenticated ON storage.objects;
DROP POLICY IF EXISTS regphotos_insert_authenticated ON storage.objects;
DROP POLICY IF EXISTS regphotos_update_authenticated ON storage.objects;
DROP POLICY IF EXISTS regphotos_delete_authenticated ON storage.objects;
DROP POLICY IF EXISTS regphotos_select_anon ON storage.objects;

-- Also drop any helper-based policies if they exist, since this project
-- doesn't include public.is_owner()/public.has_permission()
DROP POLICY IF EXISTS sel_reg_photos ON storage.objects;
DROP POLICY IF EXISTS ins_reg_photos ON storage.objects;
DROP POLICY IF EXISTS upd_reg_photos ON storage.objects;
DROP POLICY IF EXISTS del_reg_photos ON storage.objects;

-- 3) Create authenticated-only policies (no anon) for the private bucket
-- This avoids reliance on helper functions. Tighten later if you add helper functions.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='regphotos_select_authenticated'
  ) THEN
    CREATE POLICY regphotos_select_authenticated
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'registration-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='regphotos_insert_authenticated'
  ) THEN
    CREATE POLICY regphotos_insert_authenticated
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'registration-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='regphotos_update_authenticated'
  ) THEN
    CREATE POLICY regphotos_update_authenticated
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'registration-photos')
      WITH CHECK (bucket_id = 'registration-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='regphotos_delete_authenticated'
  ) THEN
    CREATE POLICY regphotos_delete_authenticated
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'registration-photos');
  END IF;
END $$;

-- 4) Reload PostgREST schema so new objects are visible to the API
DO $$ BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN others THEN
  -- ignore if notify not permitted
  NULL;
END $$;

COMMIT;
