-- Final refinement for get_council_dashboard_stats: IST Timezone consistency + Recent Scans
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

  -- 4. Get Event Stats (Robust Join + Per-event Batch breakdown)
  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT 
        COALESCE(e.title, r.event_title, 'General/Other') as event_name,
        r.participant_type,
        COUNT(*) as batch_count
      FROM public.registrations r
      LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved')
      AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT 
      event_name,
      SUM(batch_count) as count,
      json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped
    GROUP BY event_name
    ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats (IST Corrected & Filtered by Approval)
  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) 
      FROM public.pass_scans ps
      LEFT JOIN public.entry_passes ep ON ps.pass_id = ep.id
      LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
      LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
      WHERE ps.scan_result = 'valid'
      AND (
        (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL) -- VIP/Manual
        OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
        OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
      )
    ),
    'valid_today', (
      SELECT COUNT(*) 
      FROM public.pass_scans ps
      LEFT JOIN public.entry_passes ep ON ps.pass_id = ep.id
      LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
      LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
      WHERE ps.scan_result = 'valid' 
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
      AND (
        (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
        OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
        OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
      )
    )
  ) INTO v_scan_stats;

  -- 6. Get Recent Scans (Last 10, Filtered by Approval)
  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.pass_type, ps.scan_result, ps.scanned_at
    FROM public.pass_scans ps
    LEFT JOIN public.entry_passes ep ON ps.pass_id = ep.id
    LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
    LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
    WHERE ps.scan_result = 'valid'
    AND (
      (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
      OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
      OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
    )
    ORDER BY ps.scanned_at DESC
    LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb)
  );
END; $func$;
