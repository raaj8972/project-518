-- MASTER FIX V3: Council Dashboard & VIP Passes Logic (Hard Delete + Validity)
-- 1. Restores event_dates to stats
-- 2. Ensures VIP pass list includes usage_logs AND valid_date
-- 3. Ensures create_vip_pass accepts valid_date
-- 4. Ensures delete_entry_pass PERMANENTLY deletes pass and scans (Hard Delete)

-- PART 1: FIX STATS (Returns event_dates)
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
  PERFORM public.cleanup_old_scans();

  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

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
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    )
  ) INTO v_scan_stats;

  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT 
      ps.id, 
      ps.participant_name, 
      ps.pass_type, 
      ps.scan_result, 
      ps.scanned_at, 
      ps.scanned_by_username as guard_name
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
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb),
    'event_dates', COALESCE(v_settings.event_dates, '[]'::jsonb)
  );
END; $func$;

-- PART 2: FIX VIP PASSES FETCH (Added valid_date)
DROP FUNCTION IF EXISTS public.get_council_vip_passes_v3(text);

CREATE OR REPLACE FUNCTION public.get_council_vip_passes_v3(p_password TEXT)
RETURNS TABLE (
  pass_id UUID,
  participant_name TEXT,
  pass_type public.pass_type,
  created_at TIMESTAMPTZ,
  notes TEXT,
  pass_token TEXT,
  is_used BOOLEAN,
  is_active BOOLEAN,
  usage_logs JSONB,
  valid_date DATE
) LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE 
  v_settings RECORD;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE security_settings.id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  RETURN QUERY
  SELECT 
    ep.id AS pass_id,
    ep.participant_name,
    ep.pass_type,
    ep.created_at,
    ep.notes,
    ep.pass_token,
    ep.is_used,
    ep.is_active,
    COALESCE(
      (
        SELECT jsonb_agg(ps.scanned_at ORDER BY ps.scanned_at ASC)
        FROM public.pass_scans ps
        WHERE ps.pass_id = ep.id AND ps.scan_result = 'valid'
      ),
      '[]'::jsonb
    ) AS usage_logs,
    ep.valid_date
  FROM public.entry_passes ep
  WHERE ep.pass_type = 'vip'
  ORDER BY ep.created_at DESC;
END;
$$;

-- PART 3: FIX VIP PASS CREATE (Create logic)
CREATE OR REPLACE FUNCTION public.create_vip_pass_v3(
  p_council_password TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_valid_date DATE DEFAULT NULL
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
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to create VIP passes'; END IF;
  
  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_by, valid_date)
  VALUES (v_pass_token, 'vip', p_name, p_notes, auth.uid(), p_valid_date) RETURNING id INTO v_pass_id;
  
  RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END; $$;

-- PART 4: HARD DELETE VIP PASS (Removes pass and its scans)
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
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings IS NULL THEN RAISE EXCEPTION 'Security settings [id=1] not found'; END IF;
     IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured in settings'; END IF;

     IF v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to delete passes'; END IF;
  IF p_pass_id IS NULL THEN RAISE EXCEPTION 'Pass ID is required'; END IF;

  -- 1. Delete associated scans first (Cleanup junk)
  DELETE FROM public.pass_scans WHERE pass_id = p_pass_id;

  -- 2. Hard Delete the pass
  DELETE FROM public.entry_passes WHERE id = p_pass_id;
  
  RETURN json_build_object('success', true, 'message', 'Pass and associated scans deleted permanently');
END; $$;
