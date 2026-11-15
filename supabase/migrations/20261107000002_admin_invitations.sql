BEGIN;
-- Self-contained prerequisites for projects that have not applied the broader repair migration.
CREATE TABLE IF NOT EXISTS public.user_session_revocations (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 revoked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_session_revocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_session_revocations FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.user_session_revocations TO service_role;
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(p_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO user_session_revocations(user_id,revoked_at) VALUES(p_user_id,clock_timestamp())
 ON CONFLICT(user_id) DO UPDATE SET revoked_at=excluded.revoked_at;
 DELETE FROM auth.refresh_tokens WHERE user_id::text=p_user_id::text;
 DELETE FROM auth.sessions WHERE user_id=p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_user_sessions(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_user_sessions(uuid) TO service_role;
ALTER TABLE public.admin_permissions ADD COLUMN IF NOT EXISTS allowed_pages text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.admin_permissions ADD COLUMN IF NOT EXISTS page_access_configured boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK(role IN ('admin','owner')),
  allowed_pages text[] NOT NULL DEFAULT '{}',
  permission_flags jsonb NOT NULL DEFAULT '{}',
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  invited_by text NOT NULL,
  delivery_status text NOT NULL DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS public.revoked_admin_accounts (
  user_id text PRIMARY KEY,
  email text NOT NULL,
  revoked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revoked_admin_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_invitations, public.revoked_admin_accounts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_invitations, public.revoked_admin_accounts TO service_role;

CREATE OR REPLACE FUNCTION public.claim_admin_invitation(p_token_hash text)
RETURNS SETOF public.admin_invitations LANGUAGE sql SET search_path=public AS $$
  UPDATE admin_invitations SET claimed_at=now()
  WHERE token_hash=p_token_hash AND expires_at>now() AND claimed_at IS NULL
  RETURNING *;
$$;
CREATE OR REPLACE FUNCTION public.invited_auth_user_id(p_invitation_id uuid)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT u.id FROM auth.users u JOIN admin_invitations i ON lower(u.email)=i.email
  WHERE i.id=p_invitation_id AND i.claimed_at IS NOT NULL;
$$;
CREATE OR REPLACE FUNCTION public.activate_admin_invitation(p_invitation_id uuid,p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE invitation admin_invitations%ROWTYPE;
BEGIN
  SELECT * INTO invitation FROM admin_invitations WHERE id=p_invitation_id AND claimed_at IS NOT NULL AND expires_at>now() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation is invalid or expired'; END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id AND lower(email)=invitation.email) THEN RAISE EXCEPTION 'Invitation email does not match account'; END IF;
  IF EXISTS(SELECT 1 FROM admin_users WHERE lower(email)=invitation.email OR user_id=p_user_id::text) THEN RAISE EXCEPTION 'This account already has admin access'; END IF;
  INSERT INTO admin_users(user_id,email,display_name,role,is_primary) VALUES(p_user_id::text,invitation.email,invitation.display_name,invitation.role,invitation.role='owner');
  INSERT INTO admin_permissions(user_id,email,allowed_pages,page_access_configured,
    can_events,can_schedule,can_gallery,can_sponsors,can_registrations,can_registration_photos,
    can_faculty,can_core_team,can_sports,can_guest_artists,can_chief_guests,can_homebound,can_security_passes)
  VALUES(p_user_id::text,invitation.email,invitation.allowed_pages,true,
    coalesce((invitation.permission_flags->>'can_events')::boolean,false),
    coalesce((invitation.permission_flags->>'can_schedule')::boolean,false),
    coalesce((invitation.permission_flags->>'can_gallery')::boolean,false),
    coalesce((invitation.permission_flags->>'can_sponsors')::boolean,false),
    coalesce((invitation.permission_flags->>'can_registrations')::boolean,false),
    coalesce((invitation.permission_flags->>'can_registration_photos')::boolean,false),
    false,coalesce((invitation.permission_flags->>'can_core_team')::boolean,false),
    coalesce((invitation.permission_flags->>'can_sports')::boolean,false),
    coalesce((invitation.permission_flags->>'can_guest_artists')::boolean,false),
    coalesce((invitation.permission_flags->>'can_chief_guests')::boolean,false),
    coalesce((invitation.permission_flags->>'can_homebound')::boolean,false),
    coalesce((invitation.permission_flags->>'can_security_passes')::boolean,false))
  ON CONFLICT(user_id) DO UPDATE SET allowed_pages=excluded.allowed_pages,page_access_configured=true;
  DELETE FROM revoked_admin_accounts WHERE user_id=p_user_id::text;
  DELETE FROM admin_invitations WHERE id=p_invitation_id;
END;
$$;
CREATE OR REPLACE FUNCTION public.revoke_admin_account(p_user_id text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target admin_users%ROWTYPE; target_email text;
BEGIN
  SELECT * INTO target FROM admin_users WHERE user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    SELECT email INTO target_email FROM revoked_admin_accounts WHERE user_id=p_user_id;
    IF target_email IS NULL THEN RAISE EXCEPTION 'Admin account not found'; END IF;
    RETURN target_email;
  END IF;
  IF target.role='owner' OR target.is_primary OR lower(target.email)='ricorrenza.theiqcityfestival@gmail.com' THEN RAISE EXCEPTION 'Owner accounts cannot be removed'; END IF;
  target_email:=lower(target.email);
  INSERT INTO revoked_admin_accounts(user_id,email) VALUES(p_user_id,target_email) ON CONFLICT(user_id) DO UPDATE SET revoked_at=now();
  IF p_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    PERFORM public.revoke_user_sessions(p_user_id::uuid);
  END IF;
  DELETE FROM allowed_admins WHERE lower(email)=target_email;
  DELETE FROM admin_invitations WHERE email=target_email;
  DELETE FROM admin_reset_tokens WHERE email=target_email;
  DELETE FROM admin_reset_otps WHERE email=target_email;
  DELETE FROM admin_permissions WHERE user_id=p_user_id;
  DELETE FROM admin_users WHERE user_id=p_user_id;
  RETURN target_email;
END;
$$;
CREATE OR REPLACE FUNCTION public.session_is_current() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM revoked_admin_accounts WHERE user_id=auth.uid()::text)
 AND NOT EXISTS(SELECT 1 FROM user_session_revocations WHERE user_id=auth.uid() AND revoked_at>=to_timestamp(coalesce((auth.jwt()->>'iat')::bigint,0)));
$$;
CREATE OR REPLACE FUNCTION public.current_admin_access() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT session_is_current() AND EXISTS(SELECT 1 FROM admin_users WHERE user_id=auth.uid()::text AND role IN ('admin','owner'));
$$;
REVOKE ALL ON FUNCTION public.claim_admin_invitation(text),public.invited_auth_user_id(uuid),public.activate_admin_invitation(uuid,uuid),public.revoke_admin_account(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_admin_invitation(text),public.invited_auth_user_id(uuid),public.activate_admin_invitation(uuid,uuid),public.revoke_admin_account(text) TO service_role;
REVOKE ALL ON FUNCTION public.current_admin_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.current_admin_access() TO authenticated,service_role;
-- Revocation must also constrain older permissive RLS policies and unexpired JWTs.
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity AND tablename NOT IN ('revoked_admin_accounts','user_session_revocations','admin_invitations') LOOP
  EXECUTE format('DROP POLICY IF EXISTS admin_session_revocation_guard ON public.%I',t.tablename);
  EXECUTE format('CREATE POLICY admin_session_revocation_guard ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.session_is_current()) WITH CHECK (public.session_is_current())',t.tablename);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.admin_is_owner() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT session_is_current() AND EXISTS(SELECT 1 FROM admin_users WHERE user_id=auth.uid()::text AND (role='owner' OR is_primary));
$$;
CREATE OR REPLACE FUNCTION public.admin_can_manage_pages(p_pages text[],p_flags text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT session_is_current() AND (admin_is_owner() OR EXISTS(
   SELECT 1 FROM admin_permissions p JOIN admin_users a ON a.user_id=p.user_id
   WHERE p.user_id=auth.uid()::text AND a.role='admin'
   AND ((p.page_access_configured AND p.allowed_pages && p_pages)
     OR (NOT p.page_access_configured AND EXISTS(SELECT 1 FROM unnest(p_flags) flag WHERE coalesce((to_jsonb(p)->>flag)::boolean,false))))
 ));
$$;
REVOKE ALL ON FUNCTION public.admin_is_owner(),public.admin_can_manage_pages(text[],text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_is_owner(),public.admin_can_manage_pages(text[],text[]) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_self_profile_update_allowed(p_new jsonb) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT session_is_current() AND EXISTS(
  SELECT 1 FROM admin_users original WHERE original.user_id=auth.uid()::text
  AND (p_new - ARRAY['last_login','totp_enabled','totp_secret','updated_at','display_name'])
    = (to_jsonb(original) - ARRAY['last_login','totp_enabled','totp_secret','updated_at','display_name'])
 );
$$;
REVOKE ALL ON FUNCTION public.admin_self_profile_update_allowed(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_self_profile_update_allowed(jsonb) TO authenticated,service_role;
-- Role/permission changes are owner-only, including direct database requests.
DO $$ DECLARE t text; operation text; BEGIN
 FOREACH t IN ARRAY ARRAY['admin_users','admin_permissions','allowed_admins'] LOOP
  FOREACH operation IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
   EXECUTE format('DROP POLICY IF EXISTS owner_identity_%s ON public.%I',lower(operation),t);
   IF operation='INSERT' THEN
    EXECUTE format('CREATE POLICY owner_identity_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(public.admin_is_owner())',t);
   ELSIF operation='UPDATE' AND t='admin_users' THEN
    EXECUTE 'CREATE POLICY owner_identity_update ON public.admin_users AS RESTRICTIVE FOR UPDATE TO authenticated USING(public.admin_is_owner() OR user_id=auth.uid()::text) WITH CHECK(public.admin_is_owner() OR (user_id=auth.uid()::text AND public.admin_self_profile_update_allowed(to_jsonb(admin_users.*))))';
   ELSIF operation='UPDATE' THEN
    EXECUTE format('CREATE POLICY owner_identity_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING(public.admin_is_owner()) WITH CHECK(public.admin_is_owner())',t);
   ELSE
    EXECUTE format('CREATE POLICY owner_identity_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING(public.admin_is_owner())',t);
   END IF;
  END LOOP;
 END LOOP;
END $$;
-- Constrain administrative writes without replacing existing student/staff policies.
DO $$ DECLARE item jsonb; t text; expression text; operation text; BEGIN
 FOR item IN SELECT value FROM jsonb_array_elements('[
  {"tables":["events","event_coordinators","event_rounds","event_winners","event_categories"],"pages":["events","categories"],"flags":["can_events"]},
  {"tables":["schedule_days","schedule_events"],"pages":["schedule"],"flags":["can_schedule"]},
  {"tables":["gallery_images","gallery_settings","gallery_faces"],"pages":["gallery"],"flags":["can_gallery"]},
  {"tables":["sponsors","sponsorship_packages","sponsorship_settings"],"pages":["sponsors"],"flags":["can_sponsors"]},
  {"tables":["registrations","registration_rounds"],"pages":["registrations","registration-modal"],"flags":["can_registrations"]},
  {"tables":["homepage_settings","contact_sections"],"pages":["homepage"],"flags":[]},
  {"tables":["hero_media"],"pages":["hero-media","homepage"],"flags":[]},
  {"tables":["about_settings"],"pages":["about"],"flags":[]},
  {"tables":["social_media_settings"],"pages":["social"],"flags":[]},
  {"tables":["roadmap_milestones"],"pages":["roadmap"],"flags":[]},
  {"tables":["homebound_settings"],"pages":["homebound"],"flags":["can_homebound"]},
  {"tables":["core_team_members","core_committees","faculty_heads"],"pages":["rico-family"],"flags":["can_core_team","can_faculty"]},
  {"tables":["band_members"],"pages":["band"],"flags":[]},
  {"tables":["guest_artists"],"pages":["guest-artists"],"flags":["can_guest_artists"]},
  {"tables":["chief_guests"],"pages":["chief-guests"],"flags":["can_chief_guests"]},
  {"tables":["auditions"],"pages":["auditions"],"flags":[]},
  {"tables":["memberships"],"pages":["memberships"],"flags":[]},
  {"tables":["announcements"],"pages":["announcements","sports-announcements"],"flags":[]},
  {"tables":["sports_seasons","sports_teams","sports_players","sports_matches","sports_registrations","sports_team_members","sports_committees","annual_sports_events","annual_sports_matches","annual_sports_registrations"],"pages":["sports-seasons","sports-teams","sports-matches","sports-auction","sports-registrations","sports-registration-model","annual-events","annual-schedule","annual-registrations","annual-registration-model"],"flags":["can_sports"]}
 ]'::jsonb) LOOP
  expression:=format('(NOT public.current_admin_access() OR public.admin_can_manage_pages(%L::text[],%L::text[]))',ARRAY(SELECT jsonb_array_elements_text(item->'pages')),ARRAY(SELECT jsonb_array_elements_text(item->'flags')));
  FOR t IN SELECT jsonb_array_elements_text(item->'tables') LOOP
   IF to_regclass('public.'||t) IS NULL THEN CONTINUE; END IF;
   FOREACH operation IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_page_%s ON public.%I',lower(operation),t);
    IF operation='INSERT' THEN
     EXECUTE format('CREATE POLICY admin_page_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(%s)',t,expression);
    ELSIF operation='UPDATE' THEN
     EXECUTE format('CREATE POLICY admin_page_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING(%s) WITH CHECK(%s)',t,expression,expression);
    ELSE
     EXECUTE format('CREATE POLICY admin_page_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING(%s)',t,expression);
    END IF;
   END LOOP;
  END LOOP;
 END LOOP;
END $$;
-- Account directories are private; signed-in admins can read their own identity and permissions.
REVOKE SELECT ON public.admin_users,public.admin_permissions,public.allowed_admins FROM anon;
DROP POLICY IF EXISTS admin_identity_read_guard ON public.admin_users;
CREATE POLICY admin_identity_read_guard ON public.admin_users AS RESTRICTIVE FOR SELECT TO authenticated
 USING(public.admin_is_owner() OR user_id=auth.uid()::text OR lower(email)=lower(auth.jwt()->>'email'));
DROP POLICY IF EXISTS admin_identity_read_guard ON public.admin_permissions;
CREATE POLICY admin_identity_read_guard ON public.admin_permissions AS RESTRICTIVE FOR SELECT TO authenticated
 USING(public.admin_is_owner() OR user_id=auth.uid()::text);
DROP POLICY IF EXISTS admin_identity_read_guard ON public.allowed_admins;
CREATE POLICY admin_identity_read_guard ON public.allowed_admins AS RESTRICTIVE FOR SELECT TO authenticated
 USING(public.admin_is_owner() OR lower(email)=lower(auth.jwt()->>'email'));
-- Private application data should not be prefetched by an admin assigned unrelated pages.
DO $$ DECLARE item jsonb; t text; expression text; BEGIN
 FOR item IN SELECT value FROM jsonb_array_elements('[
  {"tables":["registrations","registration_rounds"],"pages":["registrations","reg-photos","registration-modal"],"flags":["can_registrations","can_registration_photos"]},
  {"tables":["auditions"],"pages":["auditions"],"flags":[]},
  {"tables":["memberships"],"pages":["memberships"],"flags":[]},
  {"tables":["sports_registrations","annual_sports_registrations","sports_players"],"pages":["sports-seasons","sports-teams","sports-matches","sports-auction","sports-registrations","annual-events","annual-schedule","annual-registrations"],"flags":["can_sports"]}
 ]'::jsonb) LOOP
  expression:=format('(NOT public.current_admin_access() OR public.admin_can_manage_pages(%L::text[],%L::text[]))',ARRAY(SELECT jsonb_array_elements_text(item->'pages')),ARRAY(SELECT jsonb_array_elements_text(item->'flags')));
  FOR t IN SELECT jsonb_array_elements_text(item->'tables') LOOP
   IF to_regclass('public.'||t) IS NULL THEN CONTINUE; END IF;
   EXECUTE format('DROP POLICY IF EXISTS admin_private_page_read ON public.%I',t);
   EXECUTE format('CREATE POLICY admin_private_page_read ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING(%s)',t,expression);
  END LOOP;
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
