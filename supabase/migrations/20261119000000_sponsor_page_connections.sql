-- Sponsorship brochures and contacts follow the existing Sponsors page permission.
-- Sponsor-only homepage updates are limited to placement/visibility JSON columns.
BEGIN;

CREATE OR REPLACE FUNCTION public.sponsor_homepage_update_allowed(proposed jsonb)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.admin_can_manage_pages(ARRAY['sponsors'], ARRAY['can_sponsors'])
    AND EXISTS (
      SELECT 1 FROM public.homepage_settings original
      WHERE original.id=1 AND (proposed->>'id')::bigint=original.id
        AND (to_jsonb(original) - ARRAY['sponsor_logos','featured_partners_enabled','updated_at'])
          = (proposed - ARRAY['sponsor_logos','featured_partners_enabled','updated_at'])
    );
$$;
REVOKE ALL ON FUNCTION public.sponsor_homepage_update_allowed(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sponsor_homepage_update_allowed(jsonb) TO authenticated,service_role;

DROP POLICY IF EXISTS admin_page_update ON public.homepage_settings;
CREATE POLICY admin_page_update ON public.homepage_settings AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.admin_can_manage_pages(ARRAY['homepage','sponsors'],ARRAY['can_sponsors']))
  WITH CHECK (public.admin_can_manage_pages(ARRAY['homepage'],ARRAY[]::text[]) OR public.sponsor_homepage_update_allowed(to_jsonb(homepage_settings.*)));

DROP POLICY IF EXISTS admin_page_insert ON public.contact_sections;
DROP POLICY IF EXISTS admin_page_update ON public.contact_sections;
DROP POLICY IF EXISTS admin_page_delete ON public.contact_sections;
CREATE POLICY admin_page_insert ON public.contact_sections AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK(public.admin_can_manage_pages(ARRAY['sponsors','homepage'],ARRAY['can_sponsors']));
CREATE POLICY admin_page_update ON public.contact_sections AS RESTRICTIVE FOR UPDATE TO authenticated
  USING(public.admin_can_manage_pages(ARRAY['sponsors','homepage'],ARRAY['can_sponsors']))
  WITH CHECK(public.admin_can_manage_pages(ARRAY['sponsors','homepage'],ARRAY['can_sponsors']));
CREATE POLICY admin_page_delete ON public.contact_sections AS RESTRICTIVE FOR DELETE TO authenticated
  USING(public.admin_can_manage_pages(ARRAY['sponsors','homepage'],ARRAY['can_sponsors']));

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('sponsor-brochures','sponsor-brochures',true,10485760,ARRAY['application/pdf'])
ON CONFLICT(id) DO UPDATE SET public=true,file_size_limit=10485760,allowed_mime_types=ARRAY['application/pdf'];

DROP POLICY IF EXISTS sponsor_brochures_read ON storage.objects;
CREATE POLICY sponsor_brochures_read ON storage.objects FOR SELECT TO anon,authenticated
  USING(bucket_id='sponsor-brochures');
DROP POLICY IF EXISTS sponsor_brochures_manage ON storage.objects;
CREATE POLICY sponsor_brochures_manage ON storage.objects FOR ALL TO authenticated
  USING(bucket_id='sponsor-brochures' AND public.admin_can_manage_pages(ARRAY['sponsors'],ARRAY['can_sponsors']))
  WITH CHECK(bucket_id='sponsor-brochures' AND public.admin_can_manage_pages(ARRAY['sponsors'],ARRAY['can_sponsors']));

-- Existing broad upload policies must not authorize other page admins or visitors.
DO $$
DECLARE operation text; visitor_guard text; admin_guard text;
BEGIN
  visitor_guard := '(bucket_id <> ''sponsor-brochures'')';
  admin_guard := '(bucket_id <> ''sponsor-brochures'' OR public.admin_can_manage_pages(ARRAY[''sponsors''],ARRAY[''can_sponsors'']))';
  FOREACH operation IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects','sponsor_brochures_anon_'||lower(operation));
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects','sponsor_brochures_admin_'||lower(operation));
    IF operation='INSERT' THEN
      EXECUTE format('CREATE POLICY sponsor_brochures_anon_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO anon WITH CHECK(%s)',visitor_guard);
      EXECUTE format('CREATE POLICY sponsor_brochures_admin_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(%s)',admin_guard);
    ELSIF operation='UPDATE' THEN
      EXECUTE format('CREATE POLICY sponsor_brochures_anon_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon USING(%s) WITH CHECK(%s)',visitor_guard,visitor_guard);
      EXECUTE format('CREATE POLICY sponsor_brochures_admin_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING(%s) WITH CHECK(%s)',admin_guard,admin_guard);
    ELSE
      EXECUTE format('CREATE POLICY sponsor_brochures_anon_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO anon USING(%s)',visitor_guard);
      EXECUTE format('CREATE POLICY sponsor_brochures_admin_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING(%s)',admin_guard);
    END IF;
  END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
