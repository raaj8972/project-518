-- Robust fix for Council Dashboard Event Stats
-- Uses JOIN with events table to ensure titles are captured even if registrations.event_title is NULL
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
BEGIN
  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  
  IF v_settings.council_password_hash IS NULL THEN
     RAISE EXCEPTION 'Council access not configured';
  END IF;

  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password';
  END IF;

  -- 2. Get Total Registrations (Pending + Approved)
  SELECT COUNT(*) INTO v_total_regs 
  FROM public.registrations 
  WHERE status IN ('pending', 'approved')
  AND deleted_at IS NULL;

  -- 3. Get Batch Stats (Group by participant_type)
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations
    WHERE status IN ('pending', 'approved')
    AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other')
    ORDER BY count DESC
  ) t;

  -- 4. Get Event Stats (Robust Join + Fallbacks)
  SELECT json_agg(t) INTO v_event_stats FROM (
    SELECT 
      COALESCE(e.title, r.event_title, 'General/Other') as event_name, 
      COUNT(r.id) as count
    FROM public.registrations r
    LEFT JOIN public.events e ON r.event_id = e.id
    WHERE r.status IN ('pending', 'approved')
    AND r.deleted_at IS NULL
    GROUP BY COALESCE(e.title, r.event_title, 'General/Other')
    ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats
  SELECT json_build_object(
    'total_valid', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid'),
    'valid_today', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid' AND scanned_at::date = CURRENT_DATE)
  ) INTO v_scan_stats;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats
  );
END; $func$;
