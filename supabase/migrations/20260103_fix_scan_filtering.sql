-- Update get_council_dashboard_stats and get_security_dashboard_stats to robustly filter deleted/inactive passes

-- 1. Update get_council_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
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

  -- 5. Get Scan Stats (Robustly Filtered)
  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id -- JOIN filters out orphans
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

  -- 6. Get Recent Scans (Robustly Filtered)
  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.pass_type, ps.scan_result, ps.scanned_at
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id -- JOIN filters out orphans
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
END; $func$;

-- 2. Update get_security_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_security_dashboard_stats(p_username TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
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
  JOIN public.entry_passes ep ON ps.pass_id = ep.id -- JOIN filters out orphans
  LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
  LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
  WHERE ps.scan_result = 'valid' AND ep.is_active = true
  AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist
  AND (
    (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
    OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
    OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
  );
  
  SELECT json_agg(json_build_object('id', id, 'participant_name', participant_name, 'scanned_at', scanned_at, 'scan_result', scan_result, 'pass_type', pass_type))
  INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.scanned_at, ps.scan_result, ps.pass_type
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id -- JOIN filters out orphans
    LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
    LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist
    AND (
      (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
      OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
      OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
    )
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) recent;
  
  RETURN json_build_object('today_count', v_today_count, 'recent_scans', COALESCE(v_recent_scans, '[]'::json));
END; $$;

-- 3. Update create_vip_pass for Council support
CREATE OR REPLACE FUNCTION public.create_vip_pass(
  p_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_council_password TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_pass_id UUID;
  v_pass_token TEXT;
  v_settings RECORD;
BEGIN
  -- Check Admin Authorization
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Check Council Authorization fallback
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to create VIP passes'; END IF;
  
  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_by)
  VALUES (v_pass_token, 'vip', p_name, p_notes, auth.uid()) RETURNING id INTO v_pass_id;
  
  RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END; $$;

-- 4. Update delete_entry_pass for Council support
CREATE OR REPLACE FUNCTION public.delete_entry_pass(
  p_pass_id UUID,
  p_council_password TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_settings RECORD;
BEGIN
  -- Check Admin Authorization
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Check Council Authorization fallback
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

-- 5. New function to get VIP passes for Council (bypassing RLS)
CREATE OR REPLACE FUNCTION public.get_council_vip_passes(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_settings RECORD;
  v_passes JSON;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL OR v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password';
  END IF;

  SELECT json_agg(t) INTO v_passes FROM (
    SELECT id, pass_token, pass_type, participant_name, notes, is_used, is_active, created_at
    FROM public.entry_passes WHERE pass_type = 'vip'
    ORDER BY created_at DESC
  ) t;

  RETURN COALESCE(v_passes, '[]'::json);
END; $$;

GRANT EXECUTE ON FUNCTION public.get_council_vip_passes(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_vip_pass(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_entry_pass(UUID, TEXT) TO anon, authenticated;
