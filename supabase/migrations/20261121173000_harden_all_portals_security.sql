-- Migration: 20261121173000_harden_all_portals_security.sql
-- Goal: Comprehensive security lockdown across Admin, Coordinator, Batch CR, Scanner, and Student portals.
-- Ensures strict RLS, removes backdoors, eliminates wide-open permissive policies, and isolates staff actions.

BEGIN;

-- ============================================================================
-- 1. SECURITY HELPER FUNCTIONS (Explicit search_path and Security Definer)
-- ============================================================================

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
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.session_is_current() AND coalesce(auth.jwt()->'app_metadata'->>'role' = 'coordinator', false)
    AND coalesce(auth.jwt()->'app_metadata'->>'coordinator_event_id' = p_event_id, false);
$$;

CREATE OR REPLACE FUNCTION public.is_security_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.session_is_current() AND (coalesce(auth.jwt()->'app_metadata'->>'role' = 'security', false) OR public.is_authorized_admin());
$$;

CREATE OR REPLACE FUNCTION public.can_read_conversation(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.session_is_current() AND EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id = p_id
      AND (c.student_id = auth.uid() OR public.is_authorized_admin() OR public.coordinates_event(c.event_id::text))
  );
$$;

-- ============================================================================
-- 2. ADMIN PORTAL HARDENING
-- ============================================================================

-- Drop wide-open public read policies on sensitive admin tables
DROP POLICY IF EXISTS "Public Read Admin Permissions" ON public.admin_permissions;
DROP POLICY IF EXISTS "Public Read Allowed Admins" ON public.allowed_admins;

-- Eradicate hardcoded bypass password in admin_approve_student_profiles
CREATE OR REPLACE FUNCTION public.admin_approve_student_profiles(p_student_ids uuid[], p_password text, p_is_approved boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_authorized_admin() THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  PERFORM set_config('app.settings.trusted_cr_action', 'true', true);
  UPDATE public.profiles SET is_approved = p_is_approved WHERE id = ANY(p_student_ids);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_approve_student_profiles(uuid[], text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_student_profiles(uuid[], text, boolean) TO authenticated;

-- ============================================================================
-- 3. COORDINATOR PORTAL HARDENING & ISOLATION
-- ============================================================================

-- Ensure coordinator credentials table exists
CREATE TABLE IF NOT EXISTS public.coordinator_credentials (
  event_id text PRIMARY KEY,
  password_hash text NOT NULL
);
ALTER TABLE public.coordinator_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coordinator_credentials FROM PUBLIC, anon, authenticated;

-- Safely trigger hashing on any event coordinator password and clear plain text
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

-- Nullify any lingering coordinator passwords in events
UPDATE public.events SET coordinator_password = NULL WHERE coordinator_password IS NOT NULL;
REVOKE SELECT (coordinator_password) ON public.events FROM anon, authenticated;

-- Remove wide-open event update policy
DROP POLICY IF EXISTS "Allow anon to update event status" ON public.events;
DROP POLICY IF EXISTS events_staff_update ON public.events;
CREATE POLICY events_staff_update ON public.events FOR UPDATE TO authenticated
  USING (public.is_authorized_admin() OR public.coordinates_event(id))
  WITH CHECK (public.is_authorized_admin() OR public.coordinates_event(id));

-- Event rounds isolation
DROP POLICY IF EXISTS event_rounds_staff ON public.event_rounds;
CREATE POLICY event_rounds_staff ON public.event_rounds FOR ALL TO authenticated
  USING (public.is_authorized_admin() OR public.coordinates_event(event_id))
  WITH CHECK (public.is_authorized_admin() OR public.coordinates_event(event_id));

-- Payment Submissions: Eradicate wide-open policies and scope to event coordinator or own student
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payment_submissions'
  LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename); END LOOP;
END $$;
CREATE POLICY payments_read ON public.payment_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_authorized_admin() OR public.coordinates_event(event_id));
CREATE POLICY payments_insert ON public.payment_submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.registrations r WHERE r.id = payment_submissions.registration_id
      AND r.event_id = payment_submissions.event_id AND r.user_id = auth.uid()
  ));
CREATE POLICY payments_update ON public.payment_submissions FOR UPDATE TO authenticated
  USING (public.is_authorized_admin() OR public.coordinates_event(event_id))
  WITH CHECK (public.is_authorized_admin() OR public.coordinates_event(event_id));
CREATE POLICY payments_delete ON public.payment_submissions FOR DELETE TO authenticated
  USING (public.is_authorized_admin());

-- Atomic Payment Verification RPC for Coordinators
CREATE OR REPLACE FUNCTION public.verify_event_payment(p_registration_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.registrations;
BEGIN
  SELECT * INTO r FROM public.registrations WHERE id = p_registration_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Registration not found'; END IF;
  IF NOT (public.is_authorized_admin() OR public.coordinates_event(r.event_id)) THEN
    RAISE EXCEPTION 'Event coordinator access required';
  END IF;
  UPDATE public.payment_submissions
    SET verified_at = now(),
        verified_by_event = (SELECT title FROM public.events WHERE id = r.event_id)
    WHERE registration_id = p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'No payment reference has been submitted'; END IF;
  UPDATE public.registrations SET status = 'approved', is_active = true WHERE id = p_registration_id;
END;
$$;
REVOKE ALL ON FUNCTION public.verify_event_payment(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_event_payment(text) TO authenticated;

-- Conversations and Chat Messages Isolation
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'conversations'
  LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename); END LOOP;
  FOR p IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_messages'
  LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename); END LOOP;
END $$;

CREATE POLICY conversations_staff_read ON public.conversations FOR SELECT TO authenticated
  USING (public.can_read_conversation(id));
CREATE POLICY conversations_insert ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() OR public.is_authorized_admin());
CREATE POLICY conversations_update ON public.conversations FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR public.is_authorized_admin() OR public.coordinates_event(event_id::text));

CREATE POLICY chat_messages_read ON public.chat_messages FOR SELECT TO authenticated
  USING (public.can_read_conversation(conversation_id));
CREATE POLICY chat_messages_staff_insert ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND public.can_read_conversation(conversation_id)
    AND (
      (sender_role = 'student' AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.student_id = auth.uid()))
      OR (sender_role = 'coordinator' AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND public.coordinates_event(c.event_id::text)))
      OR (sender_role = 'admin' AND public.is_authorized_admin())
    )
  );

-- ============================================================================
-- 4. BATCH CR PORTAL HARDENING
-- ============================================================================

-- Ensure CR passwords in batch_crs are hashed with bcrypt
UPDATE public.batch_crs SET password = extensions.crypt(password, extensions.gen_salt('bf'))
  WHERE password !~ '^\$2[aby]\$';

CREATE OR REPLACE FUNCTION public.hash_cr_password() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN
  IF NEW.password !~ '^\$2[aby]\$' THEN
    NEW.password := crypt(trim(NEW.password), gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS hash_cr_password ON public.batch_crs;
CREATE TRIGGER hash_cr_password BEFORE INSERT OR UPDATE OF password ON public.batch_crs
  FOR EACH ROW EXECUTE FUNCTION public.hash_cr_password();

-- Lock batch_crs table: revoke from authenticated & anon so passwords cannot be read
DROP POLICY IF EXISTS "Allow public read of batch names" ON public.batch_crs;
REVOKE ALL ON public.batch_crs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.batch_crs TO service_role;

-- Safe public view cr_batches (exposes ONLY the batch name, never passwords)
CREATE OR REPLACE VIEW public.cr_batches AS SELECT batch FROM public.batch_crs;
REVOKE ALL ON public.cr_batches FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.cr_batches TO anon, authenticated, service_role;

-- Hardened approve_student_profile RPC with strict batch isolation
CREATE OR REPLACE FUNCTION public.approve_student_profile(p_student_id uuid, p_batch text, p_password text, p_is_approved boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_authorized_admin() AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_student_id
      AND p.batch = p_batch
      AND public.session_is_current()
      AND auth.jwt()->'app_metadata'->>'role' = 'cr'
      AND auth.jwt()->'app_metadata'->>'cr_batch' = p_batch
  ) THEN
    RAISE EXCEPTION 'Invalid CR credentials or student is outside your batch';
  END IF;
  PERFORM set_config('app.settings.trusted_cr_action', 'true', true);
  UPDATE public.profiles SET is_approved = p_is_approved WHERE id = p_student_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Student not found'; END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_student_profile(uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_student_profile(uuid, text, text, boolean) TO authenticated;

-- ============================================================================
-- 5. SCANNER PORTAL HARDENING
-- ============================================================================

DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('entry_passes', 'pass_scans')
  LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename); END LOOP;
END $$;

CREATE POLICY own_passes_read ON public.entry_passes FOR SELECT TO authenticated
  USING (public.session_is_current() AND user_id = auth.uid());
CREATE POLICY registered_passes_read ON public.entry_passes FOR SELECT TO authenticated
  USING (public.session_is_current() AND EXISTS (
    SELECT 1 FROM public.pass_registrations p WHERE p.id = entry_passes.pass_registration_id AND lower(p.email) = lower(auth.jwt()->>'email')
  ));
CREATE POLICY admin_passes_manage ON public.entry_passes FOR ALL TO authenticated
  USING (public.is_authorized_admin()) WITH CHECK (public.is_authorized_admin());
CREATE POLICY security_passes_read ON public.entry_passes FOR SELECT TO authenticated
  USING (public.is_security_staff());

CREATE POLICY security_scan_logs_read ON public.pass_scans FOR SELECT TO authenticated
  USING (public.is_security_staff());
CREATE POLICY admin_scan_logs_manage ON public.pass_scans FOR ALL TO authenticated
  USING (public.is_authorized_admin()) WITH CHECK (public.is_authorized_admin());

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

-- ============================================================================
-- 6. STUDENT PORTAL & REGISTRATION HARDENING
-- ============================================================================

-- Clean up and secure registrations table
DROP POLICY IF EXISTS "Allow public to read registrations" ON public.registrations;
DROP POLICY IF EXISTS "sel_registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow anon to update registration status" ON public.registrations;
DROP POLICY IF EXISTS "Allow public to create registrations" ON public.registrations;
DROP POLICY IF EXISTS registrations_read ON public.registrations;
DROP POLICY IF EXISTS registrations_insert ON public.registrations;
DROP POLICY IF EXISTS registrations_update ON public.registrations;
DROP POLICY IF EXISTS registrations_delete ON public.registrations;

CREATE POLICY registrations_read ON public.registrations FOR SELECT TO authenticated
  USING (public.session_is_current() AND (user_id = auth.uid() OR public.is_authorized_admin() OR public.coordinates_event(event_id)));

CREATE POLICY registrations_insert ON public.registrations FOR INSERT TO authenticated
  WITH CHECK (public.is_authorized_admin() OR (public.session_is_current() AND user_id = auth.uid()));

CREATE POLICY registrations_update ON public.registrations FOR UPDATE TO authenticated
  USING (public.is_authorized_admin() OR public.coordinates_event(event_id))
  WITH CHECK (public.is_authorized_admin() OR public.coordinates_event(event_id));

CREATE POLICY registrations_delete ON public.registrations FOR DELETE TO authenticated
  USING (public.is_authorized_admin() OR (public.session_is_current() AND user_id = auth.uid()));

-- Clean up sports registrations
DROP POLICY IF EXISTS "Allow authenticated read sports registration" ON public.sports_registrations;
CREATE POLICY sports_registrations_read ON public.sports_registrations FOR SELECT TO authenticated
  USING (public.is_authorized_admin() OR (public.session_is_current() AND (user_id = auth.uid() OR lower(email) = lower(auth.jwt()->>'email'))));

-- Atomic Cart Checkout RPC
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

COMMIT;
