-- Standalone security repair. Run the entire file in the intended Supabase project's SQL Editor.
-- Existing records are retained. Required helpers are defined here, not assumed from older migrations.
BEGIN;

-- Establish private session/permission prerequisites before compiling any policies.
CREATE TABLE IF NOT EXISTS public.user_session_revocations (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 revoked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.revoked_admin_accounts (
 user_id text PRIMARY KEY,
 email text NOT NULL,
 revoked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_session_revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revoked_admin_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_session_revocations,public.revoked_admin_accounts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.user_session_revocations,public.revoked_admin_accounts TO service_role;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;
ALTER TABLE public.admin_permissions ADD COLUMN IF NOT EXISTS allowed_pages text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.admin_permissions ADD COLUMN IF NOT EXISTS page_access_configured boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.session_is_current() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM public.revoked_admin_accounts WHERE user_id=auth.uid()::text)
 AND NOT EXISTS(SELECT 1 FROM public.user_session_revocations WHERE user_id=auth.uid() AND revoked_at>=to_timestamp(coalesce((auth.jwt()->>'iat')::bigint,0)))
 AND (auth.jwt()->>'aal'='aal2' OR NOT EXISTS(SELECT 1 FROM auth.mfa_factors WHERE user_id=auth.uid() AND status='verified'));
$$;
CREATE OR REPLACE FUNCTION public.current_admin_access() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.session_is_current() AND EXISTS(SELECT 1 FROM public.admin_users WHERE user_id::text=auth.uid()::text AND role::text IN ('admin','owner'));
$$;
CREATE OR REPLACE FUNCTION public.admin_is_owner() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.session_is_current() AND EXISTS(SELECT 1 FROM public.admin_users WHERE user_id::text=auth.uid()::text AND (role::text='owner' OR is_primary));
$$;
CREATE OR REPLACE FUNCTION public.admin_can_manage_pages(p_pages text[],p_flags text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.session_is_current() AND (public.admin_is_owner() OR EXISTS(
  SELECT 1 FROM public.admin_permissions p JOIN public.admin_users a ON a.user_id::text=p.user_id::text
  WHERE p.user_id::text=auth.uid()::text AND a.role::text='admin'
  AND ((p.page_access_configured AND p.allowed_pages && p_pages)
   OR (NOT p.page_access_configured AND EXISTS(
    SELECT 1 FROM unnest(p_flags) flag WHERE coalesce((to_jsonb(p)->>flag)::boolean,false))))
 ));
$$;
-- These two helpers were absent on the live schema that reported SQL error 42883.
CREATE OR REPLACE FUNCTION public.coordinates_event(p_event_id text) RETURNS boolean
LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT public.session_is_current()
 AND coalesce(auth.jwt()->'app_metadata'->>'role'='coordinator',false)
 AND coalesce(auth.jwt()->'app_metadata'->>'coordinator_event_id'=p_event_id,false);
$$;
CREATE OR REPLACE FUNCTION public.is_security_staff() RETURNS boolean
LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT public.session_is_current() AND (
  coalesce(auth.jwt()->'app_metadata'->>'role'='security',false)
  OR public.admin_can_manage_pages(ARRAY['student-passes','security-passes'],ARRAY['can_security_passes']));
$$;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.current_admin_access() $$;
CREATE OR REPLACE FUNCTION public.is_admin_or_owner() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.current_admin_access() $$;
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT uid=auth.uid() AND public.current_admin_access() $$;
CREATE OR REPLACE FUNCTION public.is_owner() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.admin_is_owner() $$;
REVOKE ALL ON FUNCTION public.session_is_current(),public.current_admin_access(),public.admin_is_owner(),public.admin_can_manage_pages(text[],text[]),public.coordinates_event(text),public.is_security_staff(),public.is_admin(),public.is_admin_or_owner(),public.is_admin_or_owner(uuid),public.is_owner() FROM PUBLIC,anon;
-- Public-page policies may call these predicates too. Anonymous callers receive false;
-- this does not grant table access or let a caller supply a different signed identity.
GRANT EXECUTE ON FUNCTION public.session_is_current(),public.current_admin_access(),public.admin_is_owner(),public.admin_can_manage_pages(text[],text[]),public.coordinates_event(text),public.is_security_staff(),public.is_admin(),public.is_admin_or_owner(),public.is_admin_or_owner(uuid),public.is_owner() TO anon,authenticated,service_role;

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
 key text PRIMARY KEY,hits integer NOT NULL,expires_at timestamptz NOT NULL
);
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_rate_limits FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.api_rate_limits TO service_role;
CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(p_key text,p_limit integer,p_window integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE current_hits integer;
BEGIN
 IF length(p_key)<>64 OR p_limit NOT BETWEEN 1 AND 1000 OR p_window NOT BETWEEN 1 AND 3600 THEN RAISE EXCEPTION 'Invalid rate limit'; END IF;
 INSERT INTO api_rate_limits(key,hits,expires_at) VALUES(p_key,1,clock_timestamp()+make_interval(secs=>p_window))
 ON CONFLICT(key) DO UPDATE SET
  hits=CASE WHEN api_rate_limits.expires_at<=clock_timestamp() THEN 1 ELSE api_rate_limits.hits+1 END,
  expires_at=CASE WHEN api_rate_limits.expires_at<=clock_timestamp() THEN clock_timestamp()+make_interval(secs=>p_window) ELSE api_rate_limits.expires_at END
 RETURNING hits INTO current_hits;
 IF random()<0.01 THEN DELETE FROM api_rate_limits WHERE expires_at<clock_timestamp()-interval '1 hour'; END IF;
 RETURN current_hits<=p_limit;
END $$;
REVOKE ALL ON FUNCTION public.consume_api_rate_limit(text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(text,integer,integer) TO service_role;
-- Preserve old credentials for review, but require fresh authenticated enrollment.
ALTER TABLE public.passkeys ADD COLUMN IF NOT EXISTS verified_enrollment boolean NOT NULL DEFAULT false;

-- Remove table AND column grants; older permissive policies cannot restore these privileges.
DO $$ DECLARE t text; cols text; privilege text; BEGIN
 FOREACH t IN ARRAY ARRAY['profiles','registrations','entry_passes','security_settings','security_users',
  'pass_scans','pass_registrations','conversations','payment_submissions','admin_users','admin_permissions','allowed_admins',
  'admin_invitations','admin_password_resets','admin_reset_tokens','security_logs','admin_audit_logs',
  'coordinator_credentials','coordinator_password_vault','portal_password_vault','batch_crs',
  'user_session_revocations','revoked_admin_accounts','passkeys','passkey_challenges'] LOOP
  IF to_regclass('public.'||t) IS NULL THEN CONTINUE; END IF;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon',t);
  SELECT string_agg(quote_ident(column_name),',') INTO cols FROM information_schema.columns WHERE table_schema='public' AND table_name=t;
  FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','REFERENCES'] LOOP
   EXECUTE format('REVOKE %s(%s) ON public.%I FROM PUBLIC,anon',privilege,cols,t);
  END LOOP;
 END LOOP;
 FOREACH t IN ARRAY ARRAY['passkeys','passkey_challenges'] LOOP
  IF to_regclass('public.'||t) IS NULL THEN CONTINUE; END IF;
  EXECUTE format('REVOKE ALL ON public.%I FROM authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;

-- Group members share checkout contact fields only after accepting membership.
CREATE OR REPLACE FUNCTION public.shares_student_group(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.session_is_current() AND EXISTS(
  SELECT 1 FROM public.student_groups g
  WHERE (g.owner_id::text=auth.uid()::text OR EXISTS(SELECT 1 FROM public.student_group_members m WHERE m.group_id=g.id AND m.user_id::text=auth.uid()::text AND m.status='accepted'))
  AND (g.owner_id::text=p_user::text OR EXISTS(SELECT 1 FROM public.student_group_members m WHERE m.group_id=g.id AND m.user_id::text=p_user::text AND m.status='accepted'))
 );
$$;
REVOKE ALL ON FUNCTION public.shares_student_group(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.shares_student_group(uuid) TO authenticated,service_role;

-- Restrictive policies intersect with every legacy permissive policy.
DROP POLICY IF EXISTS private_profile_read_guard ON public.profiles;
CREATE POLICY private_profile_read_guard ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated
 USING(public.session_is_current() AND (id=auth.uid() OR public.shares_student_group(id)
 OR public.admin_can_manage_pages(ARRAY['student-system','registrations','student-passes'],ARRAY['can_registrations','can_security_passes'])
 OR (auth.jwt()->'app_metadata'->>'role'='cr' AND auth.jwt()->'app_metadata'->>'cr_batch'=batch)));
DROP POLICY IF EXISTS private_profile_update_guard ON public.profiles;
CREATE POLICY private_profile_update_guard ON public.profiles AS RESTRICTIVE FOR UPDATE TO authenticated
 USING(public.session_is_current() AND (id=auth.uid() OR public.admin_can_manage_pages(ARRAY['student-system','registrations'],ARRAY['can_registrations'])))
 WITH CHECK(public.session_is_current() AND (id=auth.uid() OR public.admin_can_manage_pages(ARRAY['student-system','registrations'],ARRAY['can_registrations'])));
CREATE OR REPLACE FUNCTION public.prevent_profile_self_approval() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.is_approved IS DISTINCT FROM OLD.is_approved
  AND coalesce(auth.jwt()->>'role','')<>'service_role'
  AND NOT public.current_admin_access()
  AND coalesce(current_setting('app.settings.trusted_cr_action',true),'')<>'true'
 THEN RAISE EXCEPTION 'Approval requires authorized staff'; END IF;
 RETURN NEW;
END $$;
DROP POLICY IF EXISTS private_registration_read_guard ON public.registrations;
CREATE POLICY private_registration_read_guard ON public.registrations AS RESTRICTIVE FOR SELECT TO authenticated
 USING(public.session_is_current() AND (user_id=auth.uid() OR public.coordinates_event(event_id::text)
 OR public.admin_can_manage_pages(ARRAY['registrations','events'],ARRAY['can_registrations','can_events'])));
DROP POLICY IF EXISTS private_registration_insert_guard ON public.registrations;
CREATE POLICY private_registration_insert_guard ON public.registrations AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK(public.session_is_current() AND ((user_id=auth.uid() AND status='pending' AND coalesce(is_active,false)=false)
 OR public.coordinates_event(event_id::text) OR public.admin_can_manage_pages(ARRAY['registrations','events'],ARRAY['can_registrations','can_events'])));
DROP POLICY IF EXISTS private_registration_update_guard ON public.registrations;
CREATE POLICY private_registration_update_guard ON public.registrations AS RESTRICTIVE FOR UPDATE TO authenticated
 USING(public.coordinates_event(event_id::text) OR public.admin_can_manage_pages(ARRAY['registrations','events'],ARRAY['can_registrations','can_events']))
 WITH CHECK(public.coordinates_event(event_id::text) OR public.admin_can_manage_pages(ARRAY['registrations','events'],ARRAY['can_registrations','can_events']));
DROP POLICY IF EXISTS private_registration_delete_guard ON public.registrations;
CREATE POLICY private_registration_delete_guard ON public.registrations AS RESTRICTIVE FOR DELETE TO authenticated
 USING(public.admin_can_manage_pages(ARRAY['registrations'],ARRAY['can_registrations']));
DROP POLICY IF EXISTS private_pass_read_guard ON public.entry_passes;
CREATE POLICY private_pass_read_guard ON public.entry_passes AS RESTRICTIVE FOR SELECT TO authenticated
 USING(public.session_is_current() AND (user_id=auth.uid() OR public.is_security_staff()));
DO $$ DECLARE operation text; BEGIN
 FOREACH operation IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
  EXECUTE format('DROP POLICY IF EXISTS private_pass_%s_guard ON public.entry_passes',lower(operation));
  EXECUTE format('CREATE POLICY private_pass_%s_guard ON public.entry_passes AS RESTRICTIVE FOR %s TO authenticated %s',lower(operation),operation,
   CASE operation WHEN 'INSERT' THEN 'WITH CHECK(public.admin_can_manage_pages(ARRAY[''student-passes'',''security-passes''],ARRAY[''can_security_passes'']))'
   WHEN 'UPDATE' THEN 'USING(public.admin_can_manage_pages(ARRAY[''student-passes'',''security-passes''],ARRAY[''can_security_passes''])) WITH CHECK(public.admin_can_manage_pages(ARRAY[''student-passes'',''security-passes''],ARRAY[''can_security_passes'']))'
   ELSE 'USING(public.admin_can_manage_pages(ARRAY[''student-passes'',''security-passes''],ARRAY[''can_security_passes'']))' END);
 END LOOP;
END $$;
DROP POLICY IF EXISTS private_security_settings_guard ON public.security_settings;
CREATE POLICY private_security_settings_guard ON public.security_settings AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.admin_is_owner()) WITH CHECK(public.admin_is_owner());

-- Explicit public presentation fields never include contact details, credential hashes or pass tokens.
CREATE OR REPLACE VIEW public.public_profiles WITH (security_barrier=true) AS
 SELECT p.id,p.full_name,p.username,p.avatar_url,p.aura_color,p.background_url,p.batch,p.likes_count,p.is_approved,
  (SELECT jsonb_build_object('tier',x.tier,'xp_total',x.xp_total) FROM public.student_xp x WHERE x.id=p.id LIMIT 1) AS student_xp
 FROM public.profiles p WHERE p.is_approved=true;
CREATE OR REPLACE VIEW public.public_ranking_registrations WITH (security_barrier=true) AS
 SELECT r.id,r.user_id,r.status,r.is_active,r.event_id,jsonb_build_object('id',e.id,'title',e.title) AS event
 FROM public.registrations r JOIN public.events e ON e.id::text=r.event_id::text
 WHERE r.deleted_at IS NULL AND r.status='approved';
CREATE OR REPLACE VIEW public.public_event_winners WITH (security_barrier=true) AS
 SELECT r.id,r.event_id,r.event_title,r.full_name,r.team_name,r.is_team_registration,r.user_id,
  (SELECT coalesce(jsonb_agg(jsonb_build_object('name',CASE WHEN jsonb_typeof(m)='string' THEN m#>>'{}' ELSE m->>'name' END)),'[]'::jsonb)
   FROM jsonb_array_elements(CASE WHEN jsonb_typeof(r.team_members)='array' THEN r.team_members ELSE '[]'::jsonb END) m) AS team_members
 FROM public.registrations r WHERE r.deleted_at IS NULL AND r.status='approved'
 AND EXISTS(SELECT 1 FROM public.registration_rounds rr WHERE rr.registration_id=r.id AND rr.prize_rank IS NOT NULL);
REVOKE ALL ON public.public_profiles,public.public_ranking_registrations,public.public_event_winners FROM PUBLIC;
GRANT SELECT ON public.public_profiles,public.public_ranking_registrations,public.public_event_winners TO anon,authenticated,service_role;

-- Recreate to remove any private columns included by old settings views.
DROP VIEW IF EXISTS public.security_settings_public;
DO $$ DECLARE cols text; BEGIN
 SELECT string_agg(quote_ident(column_name),',' ORDER BY ordinal_position) INTO cols FROM information_schema.columns
 WHERE table_schema='public' AND table_name='security_settings' AND column_name=ANY(ARRAY[
  'id','councils_enabled','entry_pass_button_enabled','event_dates','pass_template_config','updated_at','venue','panic_mode_enabled']);
 EXECUTE 'CREATE VIEW public.security_settings_public WITH (security_barrier=true) AS SELECT '||cols||' FROM public.security_settings';
END $$;
REVOKE ALL ON public.security_settings_public FROM PUBLIC;
GRANT SELECT ON public.security_settings_public TO anon,authenticated,service_role;

-- SQL/introspection bridges cannot be called using browser keys.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('exec_sql','execute_sql','run_sql','get_function_definition','get_func_def','get_table_info','get_table_columns','add_admin_by_email') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
