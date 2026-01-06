-- Migration to hide scans of "Hidden" VIP passes from Council and Security dashboards
-- Filters out scans where entry_passes.is_hidden_from_council IS TRUE

-- 1. Update Council Dashboard Stats
CREATE OR REPLACE FUNCTION get_council_dashboard_stats_v3("p_password" text) 
RETURNS "json"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $BODY$
DECLARE
  v_result json;
  v_valid_auth boolean;
  v_total_registrations bigint;
  v_batch_stats json;
  v_event_stats json;
  v_scan_stats json;
  v_recent_scans json;
  v_event_dates text[];
BEGIN
  -- Authenticate
  SELECT EXISTS (
    SELECT 1 FROM admin_access 
    WHERE role = 'council' AND access_code = p_password
  ) INTO v_valid_auth;

  IF NOT v_valid_auth THEN
    RAISE EXCEPTION 'Invalid password';
  END IF;

  -- 1. Total Registrations
  SELECT COUNT(*) INTO v_total_registrations FROM registrations;

  -- 2. Batch Stats
  SELECT json_agg(stats) INTO v_batch_stats FROM (
    SELECT 
      COALESCE(batch_year, 'Unknown') as batch,
      COUNT(*) as count
    FROM registrations
    GROUP BY batch_year
    ORDER BY batch_year DESC
  ) stats;

  -- 3. Event Stats
  SELECT json_agg(evt) INTO v_event_stats FROM (
    SELECT 
      e.title as event_name,
      COUNT(er.id) as count,
      (
        SELECT json_agg(b) FROM (
          SELECT 
            r.batch_year as batch,
            COUNT(*) as count
          FROM event_registrations er2
          JOIN registrations r ON er2.registration_id = r.id
          WHERE er2.event_id = e.id
          GROUP BY r.batch_year
          ORDER BY count DESC
        ) b
      ) as batch_breakdown
    FROM events e
    LEFT JOIN event_registrations er ON e.id = er.event_id
    GROUP BY e.id, e.title
    ORDER BY count DESC
  ) evt;

  -- 4. Scan Stats (UPDATED TO FILTER HIDDEN PASSES)
  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) 
      FROM pass_scans ps
      JOIN entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid'
      AND (ep.is_hidden_from_council IS FALSE OR ep.is_hidden_from_council IS NULL)
    ),
    'valid_today', (
      SELECT COUNT(*) 
      FROM pass_scans ps
      JOIN entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' 
      AND (ep.is_hidden_from_council IS FALSE OR ep.is_hidden_from_council IS NULL)
      -- Fix timezone to Asia/Kolkata matching implementation
      AND ps.scanned_at >= (now() AT TIME ZONE 'Asia/Kolkata')::date
    )
  ) INTO v_scan_stats;

  -- 5. Recent Scans (UPDATED TO FILTER HIDDEN PASSES)
  SELECT json_agg(scan) INTO v_recent_scans FROM (
    SELECT 
      ps.id,
      COALESCE(ep.participant_name, 'Unknown') as participant_name,
      ep.pass_type,
      ps.scanned_at
    FROM pass_scans ps
    JOIN entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid'
    AND (ep.is_hidden_from_council IS FALSE OR ep.is_hidden_from_council IS NULL)
    ORDER BY ps.scanned_at DESC
    LIMIT 10
  ) scan;

  -- 6. Event Dates
  SELECT ARRAY(
      SELECT DISTINCT (event_date::date)::text 
      FROM events 
      WHERE event_date IS NOT NULL 
      ORDER BY 1
  ) INTO v_event_dates;

  SELECT json_build_object(
    'total_registrations', v_total_registrations,
    'batch_stats', COALESCE(v_batch_stats, '[]'::json),
    'event_stats', COALESCE(v_event_stats, '[]'::json),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::json),
    'event_dates', COALESCE(v_event_dates, ARRAY[]::text[])
  ) INTO v_result;

  RETURN v_result;
END;
$BODY$;

-- 2. Update Security Dashboard Stats
CREATE OR REPLACE FUNCTION get_security_dashboard_stats("p_username" text) 
RETURNS "json"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $BODY$
DECLARE
  v_today_count bigint;
  v_recent_scans json;
BEGIN
  -- We don't strictly enforce username check for stats reading, 
  -- but usually we would check if p_username exists in security_users.

  -- 1. Valid Scans Today (UPDATED TO FILTER HIDDEN PASSES)
  SELECT COUNT(*) INTO v_today_count
  FROM pass_scans ps
  JOIN entry_passes ep ON ps.pass_id = ep.id
  WHERE ps.scan_result = 'valid'
  AND (ep.is_hidden_from_council IS FALSE OR ep.is_hidden_from_council IS NULL)
  AND ps.scanned_at >= (now() AT TIME ZONE 'Asia/Kolkata')::date;

  -- 2. Recent Scans (UPDATED TO FILTER HIDDEN PASSES)
  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT 
      ps.id,
      COALESCE(ep.participant_name, 'Unknown') as participant_name,
      ps.scanned_at,
      ps.scan_result,
      ep.pass_type
    FROM pass_scans ps
    JOIN entry_passes ep ON ps.pass_id = ep.id
    WHERE (ep.is_hidden_from_council IS FALSE OR ep.is_hidden_from_council IS NULL)
    ORDER BY ps.scanned_at DESC
    LIMIT 10
  ) t;

  RETURN json_build_object(
    'today_count', v_today_count,
    'recent_scans', COALESCE(v_recent_scans, '[]'::json)
  );
END;
$BODY$;
