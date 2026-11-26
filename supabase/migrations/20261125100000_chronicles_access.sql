-- Chronicles writes require the same page access in the table and storage.
-- Existing history and unrelated bucket permissions are preserved.
BEGIN;
-- Match the editor’s 30 MB source-image limit and accept modern raster formats.
UPDATE storage.buckets SET public=true,file_size_limit=31457280,
 allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif']
 WHERE id='roadmap-images';
ALTER TABLE public.roadmap_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chronicles_manage ON public.roadmap_milestones;
CREATE POLICY chronicles_manage ON public.roadmap_milestones FOR ALL TO authenticated
 USING(public.admin_can_manage_pages(ARRAY['roadmap'],ARRAY[]::text[]))
 WITH CHECK(public.admin_can_manage_pages(ARRAY['roadmap'],ARRAY[]::text[]));
DO $policies$ DECLARE operation text; guard text; BEGIN
 guard:='public.admin_can_manage_pages(ARRAY[''roadmap''],ARRAY[]::text[])';
 FOREACH operation IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.roadmap_milestones','chronicles_scope_'||lower(operation));
  EXECUTE format('CREATE POLICY %I ON public.roadmap_milestones AS RESTRICTIVE FOR %s TO anon,authenticated %s',
   'chronicles_scope_'||lower(operation),operation,
   CASE operation WHEN 'INSERT' THEN 'WITH CHECK('||guard||')'
    WHEN 'UPDATE' THEN 'USING('||guard||') WITH CHECK('||guard||')'
    ELSE 'USING('||guard||')' END);
 END LOOP;
END $policies$;

-- Integrate with the existing restrictive prelaunch storage guard. Branch only
-- for this new bucket; retain the complete existing helper for every other one.
CREATE OR REPLACE FUNCTION public.can_write_storage_object(p_bucket text,p_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
 SELECT public.session_is_current() AND (
  CASE WHEN p_bucket='roadmap-images'
   THEN public.admin_can_manage_pages(ARRAY['roadmap'],ARRAY[]::text[])
   ELSE public.can_manage_storage_bucket(p_bucket) OR
    (p_bucket=ANY(ARRAY['avatars','registration-photos']) AND
     (split_part(p_name,'/',1)=auth.uid()::text OR (p_bucket='avatars' AND left(p_name,37)=auth.uid()::text||'-'))) OR
    (p_bucket='team-branding' AND EXISTS(SELECT 1 FROM public.student_groups g WHERE g.owner_id=auth.uid() AND split_part(p_name,'/',1)=g.id::text))
  END)
$fn$;
REVOKE ALL ON FUNCTION public.can_write_storage_object(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_write_storage_object(text,text) TO anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
