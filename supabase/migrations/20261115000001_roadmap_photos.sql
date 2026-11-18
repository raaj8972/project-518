-- Multiple ordered photos per timeline year; no existing history is replaced.
BEGIN;
ALTER TABLE public.roadmap_milestones
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}';

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('roadmap-images','roadmap-images',true,83886080,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'])
ON CONFLICT(id) DO NOTHING;

DROP POLICY IF EXISTS roadmap_photos_read ON storage.objects;
CREATE POLICY roadmap_photos_read ON storage.objects FOR SELECT TO anon,authenticated
  USING (bucket_id='roadmap-images');
DROP POLICY IF EXISTS roadmap_photos_manage ON storage.objects;
CREATE POLICY roadmap_photos_manage ON storage.objects FOR ALL TO authenticated
  USING (bucket_id='roadmap-images' AND public.admin_can_manage_pages(ARRAY['roadmap'],ARRAY[]::text[]))
  WITH CHECK (bucket_id='roadmap-images' AND public.admin_can_manage_pages(ARRAY['roadmap'],ARRAY[]::text[]));

-- Older permissive upload policies cannot authorize a visitor or another page's admin.
-- The guards deliberately leave every unrelated bucket unchanged.
DO $$
DECLARE operation text; visitor_guard text; admin_guard text;
BEGIN
  visitor_guard := '(bucket_id <> ''roadmap-images'')';
  admin_guard := '(bucket_id <> ''roadmap-images'' OR public.admin_can_manage_pages(ARRAY[''roadmap''],ARRAY[]::text[]))';
  FOREACH operation IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects','roadmap_photos_anon_'||lower(operation));
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects','roadmap_photos_admin_'||lower(operation));
    IF operation='INSERT' THEN
      EXECUTE format('CREATE POLICY roadmap_photos_anon_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO anon WITH CHECK (%s)',visitor_guard);
      EXECUTE format('CREATE POLICY roadmap_photos_admin_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (%s)',admin_guard);
    ELSIF operation='UPDATE' THEN
      EXECUTE format('CREATE POLICY roadmap_photos_anon_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon USING (%s) WITH CHECK (%s)',visitor_guard,visitor_guard);
      EXECUTE format('CREATE POLICY roadmap_photos_admin_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',admin_guard,admin_guard);
    ELSE
      EXECUTE format('CREATE POLICY roadmap_photos_anon_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO anon USING (%s)',visitor_guard);
      EXECUTE format('CREATE POLICY roadmap_photos_admin_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING (%s)',admin_guard);
    END IF;
  END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
