-- Rico Family only: keep profiles when a department is removed, enforce visibility,
-- and restrict writes to its two photo buckets to the existing page administrators.
BEGIN;

-- The UI promises that deleting a department leaves its people unassigned.
DO $$
DECLARE existing_fk record;
BEGIN
  FOR existing_fk IN
    SELECT c.conname FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
    WHERE c.conrelid='public.core_team_members'::regclass AND c.contype='f'
      AND a.attname='committee_id' AND c.confrelid='public.core_committees'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.core_team_members DROP CONSTRAINT %I',existing_fk.conname);
  END LOOP;
  ALTER TABLE public.core_team_members ADD CONSTRAINT core_team_members_committee_id_fkey
    FOREIGN KEY (committee_id) REFERENCES public.core_committees(id) ON DELETE SET NULL;
END $$;

-- Restrictive policies also guard against older permissive "read all" policies.
DO $$
DECLARE target text; visibility text;
BEGIN
  FOREACH target IN ARRAY ARRAY['faculty_heads','core_committees','core_team_members'] LOOP
    visibility := CASE WHEN target='core_team_members' THEN
      '(enabled = true AND (committee_id IS NULL OR is_council = true OR EXISTS (SELECT 1 FROM public.core_committees department WHERE department.id = core_team_members.committee_id AND department.enabled = true)))'
      ELSE '(enabled = true)' END;
    EXECUTE format('DROP POLICY IF EXISTS rico_family_visitor_visibility ON public.%I',target);
    EXECUTE format('CREATE POLICY rico_family_visitor_visibility ON public.%I AS RESTRICTIVE FOR SELECT TO anon USING (%s)',target,visibility);
    EXECUTE format('DROP POLICY IF EXISTS rico_family_signed_in_visibility ON public.%I',target);
    EXECUTE format('CREATE POLICY rico_family_signed_in_visibility ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (%s OR public.admin_can_manage_pages(ARRAY[''rico-family''], ARRAY[''can_core_team'',''can_faculty'']))',target,visibility);
  END LOOP;
END $$;

-- Existing buckets are preserved; a fresh deployment creates only missing ones.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES
 ('team-images','team-images',true,83886080,ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']),
 ('faculty-images','faculty-images',true,83886080,ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'])
ON CONFLICT(id) DO NOTHING;

-- These AND guards leave all unrelated buckets and their policies unchanged.
DO $$
DECLARE action text; visitor_guard text; admin_guard text;
BEGIN
  visitor_guard := '(bucket_id NOT IN (''team-images'',''faculty-images''))';
  admin_guard := '(bucket_id NOT IN (''team-images'',''faculty-images'') OR public.admin_can_manage_pages(ARRAY[''rico-family''], ARRAY[''can_core_team'',''can_faculty'']))';
  FOREACH action IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects','rico_family_anon_'||lower(action));
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects','rico_family_admin_'||lower(action));
    IF action='INSERT' THEN
      EXECUTE format('CREATE POLICY %I ON storage.objects AS RESTRICTIVE FOR INSERT TO anon WITH CHECK (%s)','rico_family_anon_insert',visitor_guard);
      EXECUTE format('CREATE POLICY %I ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (%s)','rico_family_admin_insert',admin_guard);
    ELSIF action='UPDATE' THEN
      EXECUTE format('CREATE POLICY %I ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon USING (%s) WITH CHECK (%s)','rico_family_anon_update',visitor_guard,visitor_guard);
      EXECUTE format('CREATE POLICY %I ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)','rico_family_admin_update',admin_guard,admin_guard);
    ELSE
      EXECUTE format('CREATE POLICY %I ON storage.objects AS RESTRICTIVE FOR DELETE TO anon USING (%s)','rico_family_anon_delete',visitor_guard);
      EXECUTE format('CREATE POLICY %I ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING (%s)','rico_family_admin_delete',admin_guard);
    END IF;
  END LOOP;
END $$;
COMMIT;
