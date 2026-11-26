-- Logo management follows the same Sponsors page permission as sponsor records.
-- Restrictive guards also cover legacy permissive upload policies.
BEGIN;
-- The global storage guard must recognize the PDF bucket as well. Preserve all
-- existing bucket mappings instead of replacing the shared authorization body.
DO $$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.can_manage_storage_bucket(text)'::regprocedure) INTO definition;
  IF position('sponsor-brochures' IN definition)=0 THEN
    IF position('''sponsors'',''sponsor-logos'',''documents'',''pdf''' IN definition)=0 THEN
      RAISE EXCEPTION 'Review the Sponsors bucket mapping before applying this migration';
    END IF;
    EXECUTE replace(definition,'''sponsors'',''sponsor-logos'',''documents'',''pdf''','''sponsors'',''sponsor-logos'',''sponsor-brochures'',''documents'',''pdf''');
  END IF;
END $$;
DROP POLICY IF EXISTS sponsor_logos_manage ON storage.objects;
CREATE POLICY sponsor_logos_manage ON storage.objects FOR ALL TO authenticated
  USING(bucket_id='sponsor-logos' AND public.admin_can_manage_pages(ARRAY['sponsors'],ARRAY['can_sponsors']))
  WITH CHECK(bucket_id='sponsor-logos' AND public.admin_can_manage_pages(ARRAY['sponsors'],ARRAY['can_sponsors']));
DO $$
DECLARE operation text;
BEGIN
  FOREACH operation IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects','sponsor_logos_anon_'||lower(operation));
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects','sponsor_logos_admin_'||lower(operation));
    IF operation='INSERT' THEN
      CREATE POLICY sponsor_logos_anon_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO anon WITH CHECK(bucket_id<>'sponsor-logos');
      CREATE POLICY sponsor_logos_admin_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(bucket_id<>'sponsor-logos' OR public.admin_can_manage_pages(ARRAY['sponsors'],ARRAY['can_sponsors']));
    ELSIF operation='UPDATE' THEN
      CREATE POLICY sponsor_logos_anon_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon USING(bucket_id<>'sponsor-logos') WITH CHECK(bucket_id<>'sponsor-logos');
      CREATE POLICY sponsor_logos_admin_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING(bucket_id<>'sponsor-logos' OR public.admin_can_manage_pages(ARRAY['sponsors'],ARRAY['can_sponsors'])) WITH CHECK(bucket_id<>'sponsor-logos' OR public.admin_can_manage_pages(ARRAY['sponsors'],ARRAY['can_sponsors']));
    ELSE
      CREATE POLICY sponsor_logos_anon_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO anon USING(bucket_id<>'sponsor-logos');
      CREATE POLICY sponsor_logos_admin_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING(bucket_id<>'sponsor-logos' OR public.admin_can_manage_pages(ARRAY['sponsors'],ARRAY['can_sponsors']));
    END IF;
  END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
