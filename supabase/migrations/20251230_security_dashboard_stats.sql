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
  
  -- Get today's valid entry count (IST timezone)
  SELECT COUNT(*)
  INTO v_today_count
  FROM public.pass_scans
  WHERE scan_result = 'valid'
  AND (scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist;
  
  -- Get recent valid scans (last 10, today only in IST)
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
    SELECT id, participant_name, scanned_at, scan_result, pass_type
    FROM public.pass_scans
    WHERE scan_result = 'valid'
    AND (scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist
    ORDER BY scanned_at DESC
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
