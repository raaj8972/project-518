-- Fix Recent Scans Query to show global recent history, not just today's
-- Corrected: Uses scanned_by_username instead of guard_name
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
  
  -- Today's Count (Strictly Today)
  SELECT COUNT(*) INTO v_today_count FROM public.pass_scans ps
  JOIN public.entry_passes ep ON ps.pass_id = ep.id
  WHERE ps.scan_result = 'valid' AND ep.is_active = true
  AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist;
  
  -- Recent Scans (Global - Show last 10 valid scans regardless of date)
  -- Uses scanned_by_username as guard_name
  SELECT json_agg(json_build_object(
    'id', id, 
    'participant_name', participant_name, 
    'scanned_at', scanned_at, 
    'scan_result', scan_result, 
    'pass_type', pass_type,
    'guard_name', scanned_by_username 
  ))
  INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.scanned_at, ps.scan_result, ps.pass_type, ps.scanned_by_username
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) recent;
  
  RETURN json_build_object('today_count', v_today_count, 'recent_scans', COALESCE(v_recent_scans, '[]'::json));
END; $$;
