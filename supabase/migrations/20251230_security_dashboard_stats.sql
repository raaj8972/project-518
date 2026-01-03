-- RPC function to get security dashboard stats
-- Bypasses RLS by using SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.get_security_dashboard_stats(
  p_username TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today_count INTEGER;
  v_recent_scans JSON;
  v_today_ist DATE;
BEGIN
  -- Verify the username is a valid, active security user
  IF NOT EXISTS (
    SELECT 1 FROM public.security_users
    WHERE username = p_username
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive security user';
  END IF;
  
  -- Get today's date in IST
  v_today_ist := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;
  
  -- Get today's valid entry count (IST timezone, Filtered by Approval)
  SELECT COUNT(*)
  INTO v_today_count
  FROM public.pass_scans ps
  LEFT JOIN public.entry_passes ep ON ps.pass_id = ep.id
  LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
  LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
  WHERE ps.scan_result = 'valid'
  AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist
  AND (
    (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL) -- VIP/Manual
    OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
    OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
  );
  
  -- Get recent valid scans (last 10, today only in IST, Filtered by Approval)
  SELECT json_agg(
    json_build_object(
      'id', id,
      'participant_name', participant_name,
      'scanned_at', scanned_at,
      'scan_result', scan_result,
      'pass_type', pass_type
    )
    ORDER BY scanned_at DESC
  )
  INTO v_recent_scans
  FROM (
    SELECT ps.id, ps.participant_name, ps.scanned_at, ps.scan_result, ps.pass_type
    FROM public.pass_scans ps
    LEFT JOIN public.entry_passes ep ON ps.pass_id = ep.id
    LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
    LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
    WHERE ps.scan_result = 'valid'
    AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist
    AND (
      (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
      OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
      OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
    )
    ORDER BY ps.scanned_at DESC
    LIMIT 10
  ) recent;
  
  -- Return combined stats
  RETURN json_build_object(
    'today_count', v_today_count,
    'recent_scans', COALESCE(v_recent_scans, '[]'::json)
  );
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.get_security_dashboard_stats TO anon, authenticated;
