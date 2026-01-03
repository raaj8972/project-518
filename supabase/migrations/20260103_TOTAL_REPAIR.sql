-- FINAL COMPREHENSIVE REPAIR: Scan History & Status Tracking
-- This script fixes missing columns, triggers, and RPC mismatches.

-- 1. Ensure Table Structure
ALTER TABLE public.entry_passes 
ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

ALTER TABLE public.pass_scans 
ADD COLUMN IF NOT EXISTS pass_token TEXT,
ADD COLUMN IF NOT EXISTS guard_name TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_pass_scans_token ON public.pass_scans(pass_token);
CREATE INDEX IF NOT EXISTS idx_pass_scans_scanned_at ON public.pass_scans(scanned_at DESC);

-- 2. Pass ID Resolution Function (For Offline Sync)
CREATE OR REPLACE FUNCTION public.resolve_pass_id_from_token()
RETURNS TRIGGER AS $$
BEGIN
  -- If pass_id is null but token is present, find the pass
  IF NEW.pass_id IS NULL AND NEW.pass_token IS NOT NULL THEN
    SELECT id INTO NEW.pass_id FROM public.entry_passes WHERE pass_token = NEW.pass_token;
  END IF;
  
  -- If we still don't have a pass_id (e.g. invalid token), we allow the scan but mark as invalid
  IF NEW.pass_id IS NULL THEN
    NEW.scan_result := 'invalid';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_resolve_pass_id ON public.pass_scans;
CREATE TRIGGER tr_resolve_pass_id
BEFORE INSERT ON public.pass_scans
FOR EACH ROW EXECUTE FUNCTION public.resolve_pass_id_from_token();

-- 3. Pass Usage Sync Function
CREATE OR REPLACE FUNCTION public.handle_pass_scan_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update pass status for valid scans
  IF NEW.scan_result = 'valid' AND NEW.pass_id IS NOT NULL THEN
    UPDATE public.entry_passes 
    SET 
      is_used = true,
      used_at = COALESCE(NEW.scanned_at, NOW())
    WHERE id = NEW.pass_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_pass_usage ON public.pass_scans;
CREATE TRIGGER tr_sync_pass_usage
AFTER INSERT ON public.pass_scans
FOR EACH ROW EXECUTE FUNCTION public.handle_pass_scan_sync();

-- 4. Corrected Scan Processing RPC
CREATE OR REPLACE FUNCTION public.process_pass_scan_v3(
  p_pass_token TEXT,
  p_guard_name TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_pass RECORD;
  v_participant_name TEXT;
  v_pass_type public.pass_type;
BEGIN
  -- 1. Find the pass
  SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token;
  
  -- 2. Handle Invalid Token
  IF v_pass IS NULL THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, guard_name, pass_token)
    VALUES (NULL, 'system', 'invalid', p_guard_name, p_pass_token);
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Invalid Pass Token',
      'participant_name', 'Unknown',
      'pass_type', NULL
    );
  END IF;

  v_participant_name := v_pass.participant_name;
  v_pass_type := v_pass.pass_type;

  -- 3. Check if active
  IF NOT v_pass.is_active THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name, pass_token)
    VALUES (v_pass.id, 'system', 'inactive', v_participant_name, v_pass_type, p_guard_name, p_pass_token);
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Pass is Inactive',
      'participant_name', v_participant_name,
      'pass_type', v_pass_type
    );
  END IF;

  -- 4. Check if already used
  -- Note: We still record the attempt in pass_scans
  IF v_pass.is_used THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name, pass_token)
    VALUES (v_pass.id, 'system', 'already_used', v_participant_name, v_pass_type, p_guard_name, p_pass_token);
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Pass Already Scanned',
      'participant_name', v_participant_name,
      'pass_type', v_pass_type
    );
  END IF;

  -- 5. Record Valid Scan
  -- Note: The trigger 'tr_sync_pass_usage' will automatically handle UPDATE entry_passes
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name, pass_token)
  VALUES (v_pass.id, 'system', 'valid', v_participant_name, v_pass_type, p_guard_name, p_pass_token);

  RETURN json_build_object(
    'success', true, 
    'message', 'Valid Entry', 
    'participant_name', v_participant_name,
    'pass_type', v_pass_type
  );
END; $$;

-- 5. Update Council History Query (naming clarity)
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

  -- ... (stats queries remain same)
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

  -- UPDATED RECENT SCANS: Use COALESCE for guard name
  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT 
      ps.id, 
      ps.participant_name, 
      ps.pass_type, 
      ps.scan_result, 
      ps.scanned_at, 
      COALESCE(ps.guard_name, ps.scanned_by_username) as guard_name
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
