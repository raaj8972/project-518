/* 
  FIX MULTI-DAY VIP SCANS
  This migration updates the scan processing logic to allow VIP passes to be used on multiple days
  while still preventing "double scanning" (multiple entries on the same day).
*/

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
  v_already_scanned_today BOOLEAN := false;
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

  -- 4. Multi-Day / Same-Day Logic
  -- Check if this pass was already scanned TODAY (IST)
  SELECT EXISTS (
    SELECT 1 FROM public.pass_scans 
    WHERE pass_id = v_pass.id 
    AND scan_result = 'valid' 
    AND (scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
  ) INTO v_already_scanned_today;

  -- Block if already scanned TODAY (prevents passing the same QR back for immediate reuse)
  IF v_already_scanned_today THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name, pass_token)
    VALUES (v_pass.id, 'system', 'already_used', v_participant_name, v_pass_type, p_guard_name, p_pass_token);
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Already Scanned Today',
      'participant_name', v_participant_name,
      'pass_type', v_pass_type
    );
  END IF;

  -- 5. Standard Pass Check (non-VIP)
  -- If not a VIP and already used on a previous day, block it.
  IF v_pass.is_used AND v_pass_type != 'vip' THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name, pass_token)
    VALUES (v_pass.id, 'system', 'already_used', v_participant_name, v_pass_type, p_guard_name, p_pass_token);
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Single-Entry Pass Already Used',
      'participant_name', v_participant_name,
      'pass_type', v_pass_type
    );
  END IF;

  -- 6. Record Valid Scan
  -- The trigger 'tr_sync_pass_usage' will update entry_passes.is_used = true and used_at
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name, pass_token)
  VALUES (v_pass.id, 'system', 'valid', v_participant_name, v_pass_type, p_guard_name, p_pass_token);

  RETURN json_build_object(
    'success', true, 
    'message', 'Valid Entry', 
    'participant_name', v_participant_name,
    'pass_type', v_pass_type
  );
END; $$;
