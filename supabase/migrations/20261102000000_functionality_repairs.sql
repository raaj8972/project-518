-- Apply through the normal Supabase migration workflow. No live schema is changed by the app.
BEGIN;
ALTER TABLE public.security_settings ADD COLUMN IF NOT EXISTS panic_mode boolean NOT NULL DEFAULT false;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS totp_secret text;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS last_login timestamptz;

CREATE TABLE IF NOT EXISTS public.user_session_revocations (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  revoked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_session_revocations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_session_revocations TO service_role;

CREATE OR REPLACE FUNCTION public.session_is_current() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_session_revocations r WHERE r.user_id = auth.uid()
      AND r.revoked_at >= to_timestamp(coalesce((auth.jwt()->>'iat')::bigint, 0))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_authorized_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.session_is_current() AND EXISTS (
    SELECT 1 FROM public.admin_users a WHERE a.user_id::text = auth.uid()::text AND a.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.coordinates_event(p_event_id text) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.session_is_current() AND coalesce(auth.jwt()->'app_metadata'->>'role' = 'coordinator', false)
    AND coalesce(auth.jwt()->'app_metadata'->>'coordinator_event_id' = p_event_id, false);
$$;

CREATE OR REPLACE FUNCTION public.is_security_staff() RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.session_is_current() AND (coalesce(auth.jwt()->'app_metadata'->>'role' = 'security', false) OR public.is_authorized_admin());
$$;

CREATE OR REPLACE FUNCTION public.revoke_user_sessions(p_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_session_revocations(user_id, revoked_at) VALUES (p_user_id, clock_timestamp())
    ON CONFLICT(user_id) DO UPDATE SET revoked_at = excluded.revoked_at;
  DELETE FROM auth.refresh_tokens WHERE user_id::text = p_user_id::text;
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_user_sessions(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_user_sessions(uuid) TO service_role;

-- Public settings include presentation fields only, never staff credentials.
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; cols text; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='security_settings'
 LOOP EXECUTE format('DROP POLICY %I ON public.security_settings',p.policyname); END LOOP;
 SELECT string_agg(quote_ident(column_name),', ' ORDER BY ordinal_position) INTO cols FROM information_schema.columns
  WHERE table_schema='public' AND table_name='security_settings' AND column_name NOT IN ('council_passcode','sports_passcode','council_password_hash');
 EXECUTE 'CREATE OR REPLACE VIEW public.security_settings_public AS SELECT ' || cols || ' FROM public.security_settings';
END $$;
REVOKE ALL ON public.security_settings_public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.security_settings_public TO anon, authenticated, service_role;
CREATE POLICY security_settings_owner ON public.security_settings FOR ALL TO authenticated
 USING (public.session_is_current() AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id::text=auth.uid()::text AND a.role='owner'))
 WITH CHECK (public.session_is_current() AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id::text=auth.uid()::text AND a.role='owner'));

-- CR logins issue a signed batch-scoped session; passwords are stored as hashes.
UPDATE public.batch_crs SET password=extensions.crypt(password,extensions.gen_salt('bf')) WHERE password !~ '^\$2[aby]\$';
CREATE OR REPLACE FUNCTION public.hash_cr_password() RETURNS trigger LANGUAGE plpgsql SET search_path=public,extensions AS $$
BEGIN
 IF NEW.password !~ '^\$2[aby]\$' THEN NEW.password:=crypt(trim(NEW.password),gen_salt('bf')); END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER hash_cr_password BEFORE INSERT OR UPDATE OF password ON public.batch_crs FOR EACH ROW EXECUTE FUNCTION public.hash_cr_password();
ALTER TABLE public.batch_crs ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='batch_crs'
 LOOP EXECUTE format('DROP POLICY %I ON public.batch_crs',p.policyname); END LOOP;
END $$;
CREATE POLICY cr_credentials_owner ON public.batch_crs FOR ALL TO authenticated
 USING (public.session_is_current() AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id::text=auth.uid()::text AND a.role='owner'))
 WITH CHECK (public.session_is_current() AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id::text=auth.uid()::text AND a.role='owner'));
CREATE OR REPLACE VIEW public.cr_batches AS SELECT batch FROM public.batch_crs;
REVOKE ALL ON public.cr_batches FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.cr_batches TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.verify_cr_login(p_batch text,p_password text) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
 SELECT EXISTS(SELECT 1 FROM public.batch_crs b WHERE b.batch=p_batch AND b.password=crypt(p_password,b.password));
$$;
REVOKE ALL ON FUNCTION public.verify_cr_login(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cr_login(text,text) TO service_role;

-- Keep coordinator secrets out of the publicly readable event records.
CREATE TABLE IF NOT EXISTS public.coordinator_credentials (
  event_id text PRIMARY KEY,
  password_hash text NOT NULL
);
ALTER TABLE public.coordinator_credentials ENABLE ROW LEVEL SECURITY;
INSERT INTO public.coordinator_credentials(event_id, password_hash)
  SELECT id, extensions.crypt(trim(coordinator_password), extensions.gen_salt('bf')) FROM public.events
  WHERE nullif(trim(coordinator_password), '') IS NOT NULL
  ON CONFLICT(event_id) DO UPDATE SET password_hash = excluded.password_hash;
UPDATE public.events SET coordinator_password = NULL WHERE coordinator_password IS NOT NULL;

CREATE OR REPLACE FUNCTION public.store_coordinator_password() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF nullif(trim(NEW.coordinator_password), '') IS NOT NULL THEN
    INSERT INTO public.coordinator_credentials(event_id, password_hash)
      VALUES (NEW.id, crypt(trim(NEW.coordinator_password), gen_salt('bf')))
      ON CONFLICT(event_id) DO UPDATE SET password_hash = excluded.password_hash;
  END IF;
  NEW.coordinator_password := NULL;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS store_coordinator_password ON public.events;
CREATE TRIGGER store_coordinator_password BEFORE INSERT OR UPDATE OF coordinator_password ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.store_coordinator_password();

CREATE OR REPLACE FUNCTION public.verify_coordinator_password_secure(p_event_id text, p_password text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT EXISTS (SELECT 1 FROM public.coordinator_credentials c JOIN public.events e ON e.id = c.event_id
    WHERE c.event_id = p_event_id AND e.visible IS DISTINCT FROM false AND c.password_hash = crypt(p_password, c.password_hash));
$$;
REVOKE ALL ON FUNCTION public.verify_coordinator_password_secure(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_coordinator_password_secure(text, text) TO service_role;

-- Replace permissive anonymous/authenticated write policies with role- and event-scoped writes.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
    AND tablename IN ('events', 'registrations', 'event_rounds', 'registration_rounds') AND cmd IN ('ALL','INSERT','UPDATE','DELETE')
  LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename); END LOOP;
END $$;
CREATE POLICY events_admin_insert ON public.events FOR INSERT TO authenticated WITH CHECK (public.is_authorized_admin());
CREATE POLICY events_staff_update ON public.events FOR UPDATE TO authenticated
  USING (public.is_authorized_admin() OR public.coordinates_event(id))
  WITH CHECK (public.is_authorized_admin() OR public.coordinates_event(id));
CREATE POLICY events_admin_delete ON public.events FOR DELETE TO authenticated USING (public.is_authorized_admin());
CREATE POLICY registrations_insert ON public.registrations FOR INSERT TO authenticated
  WITH CHECK (public.is_authorized_admin() OR user_id = auth.uid());
CREATE POLICY registrations_update ON public.registrations FOR UPDATE TO authenticated
  USING (public.is_authorized_admin() OR public.coordinates_event(event_id))
  WITH CHECK (public.is_authorized_admin() OR public.coordinates_event(event_id));
CREATE POLICY registrations_delete ON public.registrations FOR DELETE TO authenticated
  USING (public.is_authorized_admin() OR user_id = auth.uid());
CREATE POLICY event_rounds_staff ON public.event_rounds FOR ALL TO authenticated
  USING (public.is_authorized_admin() OR public.coordinates_event(event_id))
  WITH CHECK (public.is_authorized_admin() OR public.coordinates_event(event_id));
CREATE POLICY registration_rounds_staff ON public.registration_rounds FOR ALL TO authenticated
  USING (public.is_authorized_admin() OR EXISTS (SELECT 1 FROM public.event_rounds e WHERE e.id = round_id AND public.coordinates_event(e.event_id)))
  WITH CHECK ((public.is_authorized_admin() OR EXISTS (SELECT 1 FROM public.event_rounds e WHERE e.id = round_id AND public.coordinates_event(e.event_id)))
    AND EXISTS (SELECT 1 FROM public.registrations r JOIN public.event_rounds e ON e.event_id = r.event_id WHERE r.id = registration_id AND e.id = round_id));

DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='payment_submissions'
  LOOP EXECUTE format('DROP POLICY %I ON public.payment_submissions', p.policyname); END LOOP;
END $$;
CREATE POLICY payments_read ON public.payment_submissions FOR SELECT TO authenticated
  USING (user_id=auth.uid() OR public.is_authorized_admin() OR public.coordinates_event(event_id));
CREATE POLICY payments_insert ON public.payment_submissions FOR INSERT TO authenticated
  WITH CHECK (user_id=auth.uid() AND EXISTS (SELECT 1 FROM public.registrations r WHERE r.id=payment_submissions.registration_id AND r.event_id=payment_submissions.event_id AND r.user_id=auth.uid()));
CREATE POLICY payments_update ON public.payment_submissions FOR UPDATE TO authenticated
  USING (public.is_authorized_admin() OR public.coordinates_event(event_id))
  WITH CHECK (public.is_authorized_admin() OR public.coordinates_event(event_id));
CREATE POLICY payments_delete ON public.payment_submissions FOR DELETE TO authenticated USING(public.is_authorized_admin());

CREATE OR REPLACE FUNCTION public.can_read_conversation(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.session_is_current() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = p_id
    AND (c.student_id = auth.uid() OR public.is_authorized_admin() OR public.coordinates_event(c.event_id::text)));
$$;
CREATE POLICY conversations_staff_read ON public.conversations FOR SELECT TO authenticated
  USING (public.can_read_conversation(id));
CREATE POLICY chat_messages_read ON public.chat_messages FOR SELECT TO authenticated
  USING (public.can_read_conversation(conversation_id));
DROP POLICY IF EXISTS chat_messages_insert ON public.chat_messages;
CREATE POLICY chat_messages_staff_insert ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.can_read_conversation(conversation_id)
    AND (sender_role = 'student' AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.student_id = auth.uid())
      OR sender_role = 'coordinator' AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND public.coordinates_event(c.event_id::text))
      OR sender_role = 'admin' AND public.is_authorized_admin()));

-- One source of truth for council login and VIP operations.
CREATE OR REPLACE FUNCTION public.sync_council_password() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id::text = auth.uid()::text AND role = 'owner') THEN
    RAISE EXCEPTION 'Owner access required';
  END IF;
  UPDATE public.security_settings SET council_password_hash = crypt(council_passcode, gen_salt('bf'))
    WHERE id = 1 AND nullif(council_passcode, '') IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_council_password() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_council_password() TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.hash_council_passcode() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN
  IF nullif(NEW.council_passcode, '') IS NOT NULL THEN
    NEW.council_password_hash := crypt(NEW.council_passcode, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS hash_council_passcode ON public.security_settings;
CREATE TRIGGER hash_council_passcode BEFORE INSERT OR UPDATE OF council_passcode ON public.security_settings
  FOR EACH ROW EXECUTE FUNCTION public.hash_council_passcode();
UPDATE public.security_settings SET council_passcode = council_passcode WHERE id = 1 AND nullif(council_passcode, '') IS NOT NULL;
CREATE OR REPLACE FUNCTION public.verify_council_password(p_password text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT EXISTS (SELECT 1 FROM public.security_settings s WHERE s.id = 1
    AND s.council_password_hash = crypt(p_password, s.council_password_hash));
$$;
REVOKE ALL ON FUNCTION public.verify_council_password(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_council_password(text) TO service_role;

DROP FUNCTION IF EXISTS public.get_council_vip_passes_v3(text);
CREATE FUNCTION public.get_council_vip_passes_v3(p_password text)
RETURNS TABLE(pass_id uuid, participant_name text, pass_type text, created_at timestamptz, notes text,
  pass_token text, is_used boolean, is_active boolean, valid_date date, usage_logs jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT public.verify_council_password(p_password) THEN RAISE EXCEPTION 'Invalid password'; END IF;
  RETURN QUERY SELECT e.id, e.participant_name, e.pass_type, e.created_at, e.notes, e.pass_token,
    e.is_used, e.is_active, e.valid_date,
    coalesce((SELECT jsonb_agg(p.scanned_at ORDER BY p.scanned_at) FROM public.pass_scans p WHERE p.pass_id = e.id AND p.scan_result = 'valid'), '[]'::jsonb)
    FROM public.entry_passes e WHERE e.pass_type = 'vip' AND e.is_hidden_from_council IS DISTINCT FROM true ORDER BY e.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.get_council_vip_passes_v3(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_council_vip_passes_v3(text) TO anon, authenticated, service_role;

-- Remove the historical hardcoded approval-password bypass and restrict a CR to their own batch.
CREATE OR REPLACE FUNCTION public.admin_approve_student_profiles(p_student_ids uuid[], p_password text, p_is_approved boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_authorized_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  PERFORM set_config('app.settings.trusted_cr_action', 'true', true);
  UPDATE public.profiles SET is_approved = p_is_approved WHERE id = ANY(p_student_ids);
  RETURN true;
END;
$$;
CREATE OR REPLACE FUNCTION public.approve_student_profile(p_student_id uuid, p_batch text, p_password text, p_is_approved boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_authorized_admin() AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id=p_student_id AND p.batch=p_batch
      AND public.session_is_current() AND auth.jwt()->'app_metadata'->>'role'='cr'
      AND auth.jwt()->'app_metadata'->>'cr_batch'=p_batch
  ) THEN RAISE EXCEPTION 'Invalid CR credentials or student is outside your batch'; END IF;
  PERFORM set_config('app.settings.trusted_cr_action', 'true', true);
  UPDATE public.profiles SET is_approved = p_is_approved WHERE id = p_student_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Student not found'; END IF;
  RETURN true;
END;
$$;

ALTER TABLE public.security_settings ADD COLUMN IF NOT EXISTS panic_mode boolean NOT NULL DEFAULT false;
ALTER TABLE public.entry_passes ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.pass_scans ADD COLUMN IF NOT EXISTS client_scan_id text;
CREATE UNIQUE INDEX IF NOT EXISTS pass_scans_client_scan_id_key ON public.pass_scans(client_scan_id) WHERE client_scan_id IS NOT NULL;
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('entry_passes','pass_scans')
 LOOP EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename); END LOOP;
END $$;
ALTER TABLE public.entry_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_passes_read ON public.entry_passes FOR SELECT TO authenticated USING(public.session_is_current() AND user_id=auth.uid());
CREATE POLICY registered_passes_read ON public.entry_passes FOR SELECT TO authenticated USING(public.session_is_current() AND EXISTS(
 SELECT 1 FROM public.pass_registrations p WHERE p.id=entry_passes.pass_registration_id AND lower(p.email)=lower(auth.jwt()->>'email')));
CREATE POLICY admin_passes_manage ON public.entry_passes FOR ALL TO authenticated USING(public.is_authorized_admin()) WITH CHECK(public.is_authorized_admin());
CREATE POLICY admin_scan_logs_manage ON public.pass_scans FOR ALL TO authenticated USING(public.is_authorized_admin()) WITH CHECK(public.is_authorized_admin());
CREATE POLICY security_passes_read ON public.entry_passes FOR SELECT TO authenticated USING (public.is_security_staff());
CREATE POLICY security_scan_logs_read ON public.pass_scans FOR SELECT TO authenticated USING (public.is_security_staff());

-- Online validation and offline reconciliation share this atomic, idempotent operation.
CREATE OR REPLACE FUNCTION public.scan_entry_pass(p_pass_token text, p_scanned_by text DEFAULT NULL,
  p_scanned_at timestamptz DEFAULT NULL, p_client_scan_id text DEFAULT NULL, p_guard_name text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pass public.entry_passes; v_result text; v_message text; v_time timestamptz; v_day date; v_prior record; v_username text;
BEGIN
  IF NOT public.is_security_staff() THEN RAISE EXCEPTION 'Security session required'; END IF;
  v_username := coalesce(auth.jwt()->'app_metadata'->>'security_username', p_scanned_by, auth.uid()::text);
  v_time := coalesce(p_scanned_at, clock_timestamp());
  IF v_time > now() + interval '1 minute' OR v_time < now() - interval '7 days' THEN RAISE EXCEPTION 'Invalid scan timestamp'; END IF;
  v_day := (v_time AT TIME ZONE 'Asia/Kolkata')::date;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_pass_token, 0));
  IF p_client_scan_id IS NOT NULL THEN
    SELECT * INTO v_prior FROM public.pass_scans WHERE client_scan_id = p_client_scan_id;
    IF FOUND THEN
      RETURN jsonb_build_object('valid', v_prior.scan_result = 'valid', 'result', v_prior.scan_result,
        'message', 'Scan already synchronized', 'name', v_prior.participant_name, 'pass_type', v_prior.pass_type);
    END IF;
  END IF;
  SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token FOR UPDATE;
  IF NOT FOUND THEN v_result := 'invalid'; v_message := 'Invalid pass token';
  ELSIF NOT v_pass.is_active THEN v_result := 'inactive'; v_message := 'Pass deactivated';
  ELSIF v_pass.valid_date IS NOT NULL AND v_pass.valid_date <> v_day THEN v_result := 'invalid_date'; v_message := 'Pass is valid on ' || v_pass.valid_date;
  ELSIF EXISTS (SELECT 1 FROM public.pass_scans p WHERE p.pass_id = v_pass.id AND p.scan_result = 'valid'
      AND (p.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_day) THEN
    v_result := 'already_used'; v_message := 'Already checked in on this day';
  ELSE v_result := 'valid'; v_message := 'Valid entry'; END IF;
  INSERT INTO public.pass_scans(pass_id, pass_token, scanned_by_username, scanned_at, scan_result, participant_name, pass_type, client_scan_id, guard_name)
    VALUES (v_pass.id, p_pass_token, v_username, v_time, v_result, v_pass.participant_name, v_pass.pass_type, p_client_scan_id, p_guard_name);
  IF v_result = 'valid' THEN
    UPDATE public.entry_passes SET is_used = true, scanned_at = v_time, scanned_by = v_username, updated_at = clock_timestamp() WHERE id = v_pass.id;
  END IF;
  RETURN jsonb_build_object('valid', v_result = 'valid', 'result', v_result, 'message', v_message,
    'name', v_pass.participant_name, 'pass_type', v_pass.pass_type);
END;
$$;
REVOKE ALL ON FUNCTION public.scan_entry_pass(text,text,timestamptz,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.scan_entry_pass(text,text,timestamptz,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.validate_entry_pass(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_event_payment(p_registration_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.registrations;
BEGIN
 SELECT * INTO r FROM public.registrations WHERE id=p_registration_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Registration not found'; END IF;
 IF NOT (public.is_authorized_admin() OR public.coordinates_event(r.event_id)) THEN RAISE EXCEPTION 'Event coordinator access required'; END IF;
 UPDATE public.payment_submissions SET verified_at=now(), verified_by_event=(SELECT title FROM public.events WHERE id=r.event_id)
  WHERE registration_id=p_registration_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'No payment reference has been submitted'; END IF;
 UPDATE public.registrations SET status='approved', is_active=true WHERE id=p_registration_id;
END;
$$;
REVOKE ALL ON FUNCTION public.verify_event_payment(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.verify_event_payment(text) TO authenticated;

-- Registration and transactional checkout are appended below.

CREATE OR REPLACE FUNCTION public.register_cart_event(
  p_event_id text,
  p_user_ids uuid[],
  p_team_name text,
  p_participant_details jsonb
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_max_participants integer;
  v_current_registrations integer;
  v_team_min_members integer;
  v_team_max_members integer;
  v_reg_mode_team boolean;
  v_payment_enabled boolean;
  v_payment_amount numeric;
  v_coordinator_upi_id text;
  v_already_registered_names text;
  v_members_count integer;
  v_i integer;
  v_details jsonb;
  v_new_id text;
  v_reg_count_to_add integer := 1; -- 1 group/team registration counts as 1 slot
BEGIN
  IF NOT public.session_is_current() THEN RAISE EXCEPTION 'Sign in before registering'; END IF;
  IF EXISTS (SELECT 1 FROM public.security_settings WHERE panic_mode) THEN RAISE EXCEPTION 'Registrations are temporarily paused'; END IF;
  IF coalesce(cardinality(p_user_ids), 0) < 1 OR cardinality(p_user_ids) > 100 OR NOT auth.uid() = ANY(p_user_ids) THEN
    RAISE EXCEPTION 'Invalid participant list';
  END IF;
  IF cardinality(p_user_ids) <> (SELECT count(DISTINCT x) FROM unnest(p_user_ids) x) THEN RAISE EXCEPTION 'Duplicate participant'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_user_ids) u LEFT JOIN public.profiles p ON p.id = u WHERE p.id IS NULL OR p.is_approved IS DISTINCT FROM true) THEN
    RAISE EXCEPTION 'Every participant must have an approved profile';
  END IF;
  IF cardinality(p_user_ids) > 1 OR p_team_name IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.student_groups g WHERE g.name = p_team_name AND (
      SELECT array_agg(x ORDER BY x) FROM (SELECT g.owner_id x UNION SELECT m.user_id FROM public.student_group_members m WHERE m.group_id = g.id AND m.status = 'accepted') a
    ) = (SELECT array_agg(x ORDER BY x) FROM unnest(p_user_ids) x)) THEN RAISE EXCEPTION 'Participants must match an accepted group'; END IF;
  END IF;
  -- 1. Lock the event row for update to prevent concurrent double-booking
  SELECT 
    max_participants, 
    coalesce(current_registrations, 0), 
    team_min_members, 
    team_max_members, 
    (registration_default_mode = 'team'),
    coalesce(payment_enabled, false),
    coalesce(payment_amount, 0),
    coordinator_upi_id
  INTO 
    v_max_participants, 
    v_current_registrations, 
    v_team_min_members, 
    v_team_max_members, 
    v_reg_mode_team,
    v_payment_enabled,
    v_payment_amount,
    v_coordinator_upi_id
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF EXISTS (SELECT 1 FROM public.events WHERE id = p_event_id AND (
    registration_open IS DISTINCT FROM true OR visible IS FALSE
    OR registration_opens_at > now() OR registration_closes_at <= now()
  )) THEN RAISE EXCEPTION 'Registration is closed for this event'; END IF;
  IF v_reg_mode_team IS NOT TRUE AND (SELECT registration_mode_locked FROM public.events WHERE id=p_event_id) AND (cardinality(p_user_ids) <> 1 OR p_team_name IS NOT NULL) THEN RAISE EXCEPTION 'This is an individual event'; END IF;
  IF v_reg_mode_team AND p_team_name IS NULL THEN RAISE EXCEPTION 'Select an accepted group'; END IF;
  v_members_count := array_length(p_user_ids, 1);

  -- 2. Validate group size limits
  IF p_team_name IS NOT NULL OR v_reg_mode_team THEN
    IF v_team_min_members IS NOT NULL AND v_members_count < v_team_min_members THEN
      RAISE EXCEPTION 'Group size (%) is smaller than the minimum required members (%) for this event.', v_members_count, v_team_min_members;
    END IF;
    IF v_team_max_members IS NOT NULL AND v_members_count > v_team_max_members THEN
      RAISE EXCEPTION 'Group size (%) exceeds the maximum allowed members (%) for this event.', v_members_count, v_team_max_members;
    END IF;
  END IF;

  -- 3. Check for duplicates (users already registered for this event)
  SELECT string_agg(full_name, ', ')
  INTO v_already_registered_names
  FROM public.registrations
  WHERE event_id = p_event_id AND user_id = ANY(p_user_ids);

  IF v_already_registered_names IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate registration: % already registered for this event.', v_already_registered_names;
  END IF;

  -- 4. Check if event is full
  IF v_max_participants IS NOT NULL AND (v_current_registrations + v_reg_count_to_add) > v_max_participants THEN
    RAISE EXCEPTION 'Registration failed: Event is full! Limit is % teams/participants.', v_max_participants;
  END IF;

  -- 5. Perform the insertions
  FOR v_i IN 1..v_members_count LOOP
    v_details := p_participant_details->(v_i - 1);
    
    -- Generate custom registration ID
    v_new_id := 'RICO-' || gen_random_uuid()::text;

    INSERT INTO public.registrations (
      id,
      event_id,
      event_title,
      full_name,
      email,
      phone,
      college,
      participant_type,
      is_team_registration,
      team_name,
      total_members,
      registration_date,
      user_id,
      status,
      is_active
    ) VALUES (
      v_new_id,
      p_event_id,
      (SELECT title FROM public.events WHERE id = p_event_id),
      coalesce((SELECT full_name FROM public.profiles WHERE id = p_user_ids[v_i]), ''),
      coalesce((SELECT email FROM auth.users WHERE id = p_user_ids[v_i]), ''),
      coalesce((SELECT phone FROM public.profiles WHERE id = p_user_ids[v_i]), ''),
      coalesce((SELECT college FROM public.profiles WHERE id = p_user_ids[v_i]), ''),
      coalesce((SELECT batch FROM public.profiles WHERE id = p_user_ids[v_i]), ''),
      (p_team_name IS NOT NULL),
      p_team_name,
      v_members_count,
      now(),
      p_user_ids[v_i],
      CASE 
        WHEN v_payment_enabled AND v_payment_amount > 0 AND v_coordinator_upi_id IS NOT NULL THEN 'payment_pending'::text
        WHEN p_team_name IS NOT NULL THEN 'approved'::text 
        ELSE 'pending'::text 
      END,
      NOT (v_payment_enabled AND v_payment_amount > 0) AND p_team_name IS NOT NULL
    );
  END LOOP;

  -- 6. Update current registrations count on events table
  UPDATE public.events
  SET current_registrations = coalesce(current_registrations, 0) + v_reg_count_to_add
  WHERE id = p_event_id;

  RETURN jsonb_build_object('success', true, 'registered_count', v_reg_count_to_add);
END;
$$;

REVOKE ALL ON FUNCTION public.register_cart_event(text,uuid[],text,jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.register_cart_event(text,uuid[],text,jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.register_cart_event(text,uuid[],text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.checkout_cart_event(p_event_id text, p_user_ids uuid[], p_team_name text,
  p_participant_details jsonb, p_utr text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.events; result jsonb;
BEGIN
  SELECT * INTO e FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;
  IF e.payment_enabled AND e.payment_amount > 0 THEN
    IF nullif(e.coordinator_upi_id, '') IS NULL THEN RAISE EXCEPTION 'Payment recipient is not configured'; END IF;
    IF p_utr IS NULL OR p_utr !~ '^[a-zA-Z0-9-]{6,64}$' THEN RAISE EXCEPTION 'A valid payment reference is required'; END IF;
  END IF;
  result := public.register_cart_event(p_event_id, p_user_ids, p_team_name, p_participant_details);
  IF e.payment_enabled AND e.payment_amount > 0 THEN
    INSERT INTO public.payment_submissions(registration_id, event_id, user_id, utr_number, amount, submitted_at)
      SELECT r.id, r.event_id, r.user_id, upper(p_utr), e.payment_amount, now()
      FROM public.registrations r WHERE r.event_id = p_event_id AND r.user_id = ANY(p_user_ids);
  END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.checkout_cart_event(text,uuid[],text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkout_cart_event(text,uuid[],text,jsonb,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.media_upload_allowed() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT NOT EXISTS (SELECT 1 FROM public.security_settings WHERE panic_mode)
   OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id::text = auth.uid()::text AND role = 'owner');
$$;
CREATE POLICY media_pause_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (public.media_upload_allowed());
CREATE POLICY media_pause_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (public.media_upload_allowed()) WITH CHECK (public.media_upload_allowed());
COMMIT;
