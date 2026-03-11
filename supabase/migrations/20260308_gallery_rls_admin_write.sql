-- Ensure authenticated users can perform all CRUD on gallery tables
-- Required for the switch from Firestore to Supabase for gallery data

-- ═══════════════════════════════════════════════════
-- gallery_images: full CRUD for authenticated users
-- ═══════════════════════════════════════════════════

-- INSERT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gallery_images' AND policyname = 'gallery_images_auth_insert'
  ) THEN
    CREATE POLICY gallery_images_auth_insert
      ON public.gallery_images FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- UPDATE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gallery_images' AND policyname = 'gallery_images_auth_update'
  ) THEN
    CREATE POLICY gallery_images_auth_update
      ON public.gallery_images FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- DELETE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gallery_images' AND policyname = 'gallery_images_auth_delete'
  ) THEN
    CREATE POLICY gallery_images_auth_delete
      ON public.gallery_images FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════
-- gallery_settings: INSERT for authenticated (UPDATE already exists)
-- ═══════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gallery_settings' AND policyname = 'gallery_settings_auth_insert'
  ) THEN
    CREATE POLICY gallery_settings_auth_insert
      ON public.gallery_settings FOR INSERT
      TO authenticated
      WITH CHECK (id = 1);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════
-- gallery_faces: full CRUD for authenticated users
-- ═══════════════════════════════════════════════════

-- RLS enable (idempotent)
ALTER TABLE IF EXISTS public.gallery_faces ENABLE ROW LEVEL SECURITY;

-- SELECT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gallery_faces' AND policyname = 'gallery_faces_public_read'
  ) THEN
    CREATE POLICY gallery_faces_public_read
      ON public.gallery_faces FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- INSERT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gallery_faces' AND policyname = 'gallery_faces_auth_insert'
  ) THEN
    CREATE POLICY gallery_faces_auth_insert
      ON public.gallery_faces FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- UPDATE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gallery_faces' AND policyname = 'gallery_faces_auth_update'
  ) THEN
    CREATE POLICY gallery_faces_auth_update
      ON public.gallery_faces FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- DELETE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gallery_faces' AND policyname = 'gallery_faces_auth_delete'
  ) THEN
    CREATE POLICY gallery_faces_auth_delete
      ON public.gallery_faces FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;
