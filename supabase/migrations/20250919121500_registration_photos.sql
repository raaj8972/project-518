-- Migration: registration photos feature
-- Date: 2025-09-19

-- 1) Add optional registration photo controls to events
alter table if exists public.events
  add column if not exists registration_photo_required boolean not null default false,
  add column if not exists registration_photo_label text;

-- 2) Add optional photo_url to registrations to store the uploaded photo reference (public URL or signed path)
alter table if exists public.registrations
  add column if not exists photo_url text;

-- Helpful index for lookups/cleanup by photo_url
create index if not exists registrations_photo_url_idx on public.registrations (photo_url);

-- 3) Ensure a dedicated Storage bucket exists for registration photos
insert into storage.buckets (id, name, public)
values ('registration-photos', 'registration-photos', false)
on conflict (id) do nothing;

-- 4) Storage policies: allow authenticated users (e.g., admins) to manage objects in the bucket
-- Enable fine-grained access for the specific bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'regphotos_select_authenticated'
  ) THEN
    CREATE POLICY "regphotos_select_authenticated"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'registration-photos');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'regphotos_insert_authenticated'
  ) THEN
    CREATE POLICY "regphotos_insert_authenticated"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'registration-photos');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'regphotos_update_authenticated'
  ) THEN
    CREATE POLICY "regphotos_update_authenticated"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'registration-photos')
      WITH CHECK (bucket_id = 'registration-photos');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'regphotos_delete_authenticated'
  ) THEN
    CREATE POLICY "regphotos_delete_authenticated"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'registration-photos');
  END IF;
END
$$;

-- 5) Ask PostgREST to reload schema so new columns are visible
-- (safe to run even if PostgREST isn't listening on this channel in some environments)
DO $$ BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN others THEN
  -- ignore in case of restricted permissions
  NULL;
END $$;