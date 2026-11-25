-- Restore checks accidentally replaced by the all-portals migration.
BEGIN;
CREATE OR REPLACE FUNCTION public.session_is_current() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM public.revoked_admin_accounts WHERE user_id=auth.uid()::text)
 AND NOT EXISTS(SELECT 1 FROM public.user_session_revocations WHERE user_id=auth.uid() AND revoked_at>=to_timestamp(coalesce((auth.jwt()->>'iat')::bigint,0)))
 AND (coalesce(auth.jwt()->>'aal'='aal2',false) OR NOT EXISTS(SELECT 1 FROM auth.mfa_factors WHERE user_id=auth.uid() AND status='verified'));
$$;
-- Ownership also applies to INSERT/DELETE, even with permissive legacy policies.
DROP POLICY IF EXISTS private_profile_insert_guard ON public.profiles;
CREATE POLICY private_profile_insert_guard ON public.profiles AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK(public.session_is_current() AND ((id=auth.uid() AND NOT coalesce(is_approved,false))
 OR public.admin_can_manage_pages(ARRAY['student-system'],ARRAY['can_registrations'])));
DROP POLICY IF EXISTS private_profile_delete_guard ON public.profiles;
CREATE POLICY private_profile_delete_guard ON public.profiles AS RESTRICTIVE FOR DELETE TO authenticated
 USING(public.admin_can_manage_pages(ARRAY['student-system'],ARRAY['can_registrations']));
-- Sports forms contain private contact data, not public festival content.
-- Restrictive guards prevent older permissive policies from widening access.
DO $$ DECLARE t text; cols text; privilege text; BEGIN
 FOREACH t IN ARRAY ARRAY['sports_registrations','annual_sports_registrations'] LOOP
  IF to_regclass('public.'||t) IS NULL THEN CONTINUE; END IF;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon',t);
  SELECT string_agg(quote_ident(column_name),',') INTO cols FROM information_schema.columns WHERE table_schema='public' AND table_name=t;
  FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','REFERENCES'] LOOP
   EXECUTE format('REVOKE %s(%s) ON public.%I FROM PUBLIC,anon',privilege,cols,t);
  END LOOP;
  EXECUTE format('DROP POLICY IF EXISTS portal_sports_read_guard ON public.%I',t);
  EXECUTE format('CREATE POLICY portal_sports_read_guard ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING(public.session_is_current() AND (user_id=auth.uid() OR public.admin_can_manage_pages(ARRAY[''sports-registrations'',''annual-registrations''],ARRAY[''can_sports'',''can_sports_registrations''])))',t);
  EXECUTE format('DROP POLICY IF EXISTS portal_sports_insert_guard ON public.%I',t);
  EXECUTE format('CREATE POLICY portal_sports_insert_guard ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(public.session_is_current() AND ((user_id=auth.uid() AND coalesce(status,''pending'')=''pending'') OR public.admin_can_manage_pages(ARRAY[''sports-registrations'',''annual-registrations''],ARRAY[''can_sports'',''can_sports_registrations''])))',t);
  EXECUTE format('DROP POLICY IF EXISTS portal_sports_update_guard ON public.%I',t);
  EXECUTE format('CREATE POLICY portal_sports_update_guard ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING(public.admin_can_manage_pages(ARRAY[''sports-registrations'',''annual-registrations''],ARRAY[''can_sports'',''can_sports_registrations''])) WITH CHECK(public.admin_can_manage_pages(ARRAY[''sports-registrations'',''annual-registrations''],ARRAY[''can_sports'',''can_sports_registrations'']))',t);
  EXECUTE format('DROP POLICY IF EXISTS portal_sports_delete_guard ON public.%I',t);
  EXECUTE format('CREATE POLICY portal_sports_delete_guard ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING(public.admin_can_manage_pages(ARRAY[''sports-registrations'',''annual-registrations''],ARRAY[''can_sports'',''can_sports_registrations'']))',t);
 END LOOP;
END $$;
COMMIT;
