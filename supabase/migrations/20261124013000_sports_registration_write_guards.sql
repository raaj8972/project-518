-- An authenticated student may submit their own pending registration, never
-- choose another user, approve themselves, or edit somebody else's entry.
BEGIN;
DO $guards$ DECLARE t text;page text;staff text; BEGIN
 FOREACH t IN ARRAY ARRAY['sports_registrations','annual_sports_registrations'] LOOP
  page:=CASE t WHEN 'sports_registrations' THEN 'sports-registrations' ELSE 'annual-registrations' END;
  staff:=format('public.admin_can_manage_pages(ARRAY[%L],ARRAY[''can_sports''])',page);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE INSERT,UPDATE,DELETE ON public.%I FROM PUBLIC,anon',t);
  EXECUTE format('DROP POLICY IF EXISTS prelaunch_registration_insert ON public.%I',t);
  EXECUTE format('DROP POLICY IF EXISTS prelaunch_registration_update ON public.%I',t);
  EXECUTE format('DROP POLICY IF EXISTS prelaunch_registration_delete ON public.%I',t);
  EXECUTE format('CREATE POLICY prelaunch_registration_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(%s OR (public.session_is_current() AND user_id=auth.uid() AND lower(coalesce(to_jsonb(%I)->>''status'',''pending''))=''pending'' AND coalesce((to_jsonb(%I)->>''is_active'')::boolean,false)=false))',t,staff,t,t);
  EXECUTE format('CREATE POLICY prelaunch_registration_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING(%s) WITH CHECK(%s)',t,staff,staff);
  EXECUTE format('CREATE POLICY prelaunch_registration_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING(%s)',t,staff);
 END LOOP;
END $guards$;
COMMIT;
