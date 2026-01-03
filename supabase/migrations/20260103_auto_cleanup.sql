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
