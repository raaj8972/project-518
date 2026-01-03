-- ==========================================
-- MASTER FIX V3: COUNCIL & VIP AUTHORIZATION
-- ==========================================
-- INSTRUCTIONS: Copy and Paste this ENTIRE script into your 
-- Supabase SQL Editor and run it to fix the login and cache errors.

-- 1. CLEANUP: Drop every possible overload to resolve ambiguity
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT oid::regprocedure as proc FROM pg_proc WHERE proname IN ('get_council_dashboard_stats', 'get_council_dashboard_stats_v2', 'get_council_dashboard_stats_v3', 'get_council_vip_passes', 'get_council_vip_passes_v2', 'get_council_vip_passes_v3', 'create_vip_pass', 'create_vip_pass_v2', 'create_vip_pass_v3', 'delete_entry_pass', 'delete_entry_pass_v2', 'delete_entry_pass_v3') AND pronamespace = 'public'::regnamespace) LOOP
        EXECUTE 'DROP FUNCTION ' || r.proc;
    END LOOP;
END $$;

-- 2. ROBUST V3 STATS
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats_v3(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings IS NULL THEN RAISE EXCEPTION 'Security settings [id=1] not found'; END IF;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password (v3)';
  END IF;

  SELECT COUNT(*) INTO v_total_regs FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL;

  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other') ORDER BY count DESC
  ) t;

  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT COALESCE(e.title, r.event_title, 'General/Other') as event_name, r.participant_type, COUNT(*) as batch_count
      FROM public.registrations r LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved') AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT event_name, SUM(batch_count) as count, json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped GROUP BY event_name ORDER BY count DESC
  ) t;

  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
      LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (
        (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
        OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
        OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
      )
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
      LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
      AND (
        (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
        OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
        OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
      )
    )
  ) INTO v_scan_stats;

  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.pass_type, ps.scan_result, ps.scanned_at
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
    LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    AND (
      (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
      OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
      OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
    )
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb)
  );
END; $$;

-- 3. ROBUST V3 VIP RETRIEVAL
CREATE OR REPLACE FUNCTION public.get_council_vip_passes_v3(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_settings RECORD;
  v_passes JSON;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings IS NULL OR v_settings.council_password_hash IS NULL OR v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password (v3-retrieval)';
  END IF;

  SELECT json_agg(t) INTO v_passes FROM (
    SELECT id, pass_token, pass_type, participant_name, notes, is_used, is_active, created_at
    FROM public.entry_passes WHERE pass_type = 'vip'
    ORDER BY created_at DESC
  ) t;
  RETURN COALESCE(v_passes, '[]'::json);
END; $$;

-- 4. ROBUST V3 VIP CREATION
CREATE OR REPLACE FUNCTION public.create_vip_pass_v3(
  p_council_password TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_pass_id UUID;
  v_pass_token TEXT;
  v_settings RECORD;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;
  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to create VIP passes'; END IF;
  
  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_at)
  VALUES (v_pass_token, 'vip', p_name, p_notes, NOW()) RETURNING id INTO v_pass_id;
  RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END; $$;

-- 5. ROBUST V3 PASS DELETION
CREATE OR REPLACE FUNCTION public.delete_entry_pass_v3(
  p_council_password TEXT DEFAULT NULL,
  p_pass_id UUID DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_settings RECORD;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;
  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to delete passes'; END IF;
  DELETE FROM public.entry_passes WHERE id = p_pass_id;
  RETURN json_build_object('success', true, 'message', 'Pass deleted successfully');
END; $$;

-- 6. PERMISSIONS
GRANT EXECUTE ON FUNCTION public.get_council_dashboard_stats_v3(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_council_vip_passes_v3(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_vip_pass_v3(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_entry_pass_v3(TEXT, UUID) TO anon, authenticated;
-- Add guard_name to pass_scans for accountability
ALTER TABLE public.pass_scans 
ADD COLUMN IF NOT EXISTS guard_name TEXT;

-- Update the main security RPC to handle guard_name
CREATE OR REPLACE FUNCTION public.process_pass_scan_v3(
  p_pass_token TEXT,
  p_guard_name TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_pass RECORD;
  v_result TEXT;
  v_participant_name TEXT;
  v_pass_type public.pass_type;
  v_settings RECORD;
BEGIN
  -- 1. Find the pass
  SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token;
  
  IF v_pass IS NULL THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, guard_name)
    VALUES (NULL, 'system', 'invalid', p_guard_name);
    RETURN json_build_object('success', false, 'message', 'Invalid Pass Token');
  END IF;

  v_participant_name := v_pass.participant_name;
  v_pass_type := v_pass.pass_type;

  -- 2. Check if active
  IF NOT v_pass.is_active THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name)
    VALUES (v_pass.id, 'system', 'inactive', v_participant_name, v_pass_type, p_guard_name);
    RETURN json_build_object('success', false, 'message', 'Pass is Inactive');
  END IF;

  -- 3. Check if already used (unless it's a multi-use type if we ever add one)
  IF v_pass.is_used THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name)
    VALUES (v_pass.id, 'system', 'already_used', v_participant_name, v_pass_type, p_guard_name);
    RETURN json_build_object('success', false, 'message', 'Pass Already Scanned');
  END IF;

  -- 4. Multi-day/Multi-use logic (if any)
  -- For now, all are single use. Mark as used.
  UPDATE public.entry_passes SET is_used = true, used_at = NOW() WHERE id = v_pass.id;

  -- 5. Record valid scan
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name)
  VALUES (v_pass.id, 'system', 'valid', v_participant_name, v_pass_type, p_guard_name);

  RETURN json_build_object(
    'success', true, 
    'message', 'Valid Entry', 
    'participant_name', v_participant_name,
    'pass_type', v_pass_type
  );
END; $$;
-- Add guard_name to dashboard recent scan results
-- 1. Update get_council_dashboard_stats_v3
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats_v3(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  -- 2. Get Total Registrations (Pending + Approved)
  SELECT COUNT(*) INTO v_total_regs FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL;

  -- 3. Get Batch Stats
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other') ORDER BY count DESC
  ) t;

  -- 4. Get Event Stats
  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT COALESCE(e.title, r.event_title, 'General/Other') as event_name, r.participant_type, COUNT(*) as batch_count
      FROM public.registrations r LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved') AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT event_name, SUM(batch_count) as count, json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped GROUP BY event_name ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats
  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    )
  ) INTO v_scan_stats;

  -- 6. Get Recent Scans (WITH GUARD NAME)
  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.pass_type, ps.scan_result, ps.scanned_at, ps.guard_name
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb)
  );
END; $func$;

-- 2. Update get_security_dashboard_stats (WITH GUARD NAME)
CREATE OR REPLACE FUNCTION public.get_security_dashboard_stats(p_username TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_today_count INTEGER;
  v_recent_scans JSON;
  v_today_ist DATE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.security_users WHERE username = p_username AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive security user';
  END IF;
  
  v_today_ist := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;
  
  SELECT COUNT(*) INTO v_today_count FROM public.pass_scans ps
  JOIN public.entry_passes ep ON ps.pass_id = ep.id
  WHERE ps.scan_result = 'valid' AND ep.is_active = true
  AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist;
  
  SELECT json_agg(json_build_object(
    'id', id, 
    'participant_name', participant_name, 
    'scanned_at', scanned_at, 
    'scan_result', scan_result, 
    'pass_type', pass_type,
    'guard_name', guard_name
  ))
  INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.scanned_at, ps.scan_result, ps.pass_type, ps.guard_name
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) recent;
  
  RETURN json_build_object('today_count', v_today_count, 'recent_scans', COALESCE(v_recent_scans, '[]'::json));
END; $$;
-- 15-DAY AUTO-CLEANUP POLICY
-- 1. Add index for efficient date-range deletes
CREATE INDEX IF NOT EXISTS idx_pass_scans_scanned_at ON public.pass_scans(scanned_at);

-- 2. Create cleanup function (Centralized logic)
CREATE OR REPLACE FUNCTION public.cleanup_old_scans()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
BEGIN
  -- Delete scans older than 15 days
  DELETE FROM public.pass_scans WHERE scanned_at < (NOW() - INTERVAL '15 days');
END; $$;

-- 3. Update get_security_dashboard_stats to perform cleanup on load
CREATE OR REPLACE FUNCTION public.get_security_dashboard_stats(p_username TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_today_count INTEGER;
  v_recent_scans JSON;
  v_today_ist DATE;
BEGIN
  -- Trigger background cleanup
  PERFORM public.cleanup_old_scans();

  IF NOT EXISTS (SELECT 1 FROM public.security_users WHERE username = p_username AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive security user';
  END IF;
  
  v_today_ist := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;
  
  SELECT COUNT(*) INTO v_today_count FROM public.pass_scans ps
  JOIN public.entry_passes ep ON ps.pass_id = ep.id
  WHERE ps.scan_result = 'valid' AND ep.is_active = true
  AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist;
  
  SELECT json_agg(json_build_object(
    'id', id, 
    'participant_name', participant_name, 
    'scanned_at', scanned_at, 
    'scan_result', scan_result, 
    'pass_type', pass_type,
    'guard_name', guard_name
  ))
  INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.scanned_at, ps.scan_result, ps.pass_type, ps.guard_name
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) recent;
  
  RETURN json_build_object('today_count', v_today_count, 'recent_scans', COALESCE(v_recent_scans, '[]'::json));
END; $$;

-- 4. Update get_council_dashboard_stats_v3 to perform cleanup on load
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats_v3(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  -- Trigger background cleanup
  PERFORM public.cleanup_old_scans();

  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  -- 2. Get Total Registrations (Pending + Approved)
  SELECT COUNT(*) INTO v_total_regs FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL;

  -- 3. Get Batch Stats
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other') ORDER BY count DESC
  ) t;

  -- 4. Get Event Stats
  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT COALESCE(e.title, r.event_title, 'General/Other') as event_name, r.participant_type, COUNT(*) as batch_count
      FROM public.registrations r LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved') AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT event_name, SUM(batch_count) as count, json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped GROUP BY event_name ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats
  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    )
  ) INTO v_scan_stats;

  -- 6. Get Recent Scans
  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.pass_type, ps.scan_result, ps.scanned_at, ps.guard_name
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb)
  );
END; $func$;
-- Add pass_template_config column to security_settings table
-- This stores the design configuration (background image, QR position, etc.) for each event day
-- Format: { "day_1": { "bgUrl": "...", "qr": { "x": 10, "y": 10, "size": 100 } }, ... }

ALTER TABLE public.security_settings 
ADD COLUMN IF NOT EXISTS pass_template_config JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.security_settings.pass_template_config IS 'Stores pass design configuration (background, QR position) indexed by day key';
