-- Update validate_entry_pass to allow ONE ENTRY PER DAY
-- This enables multi-day event access with the same pass

CREATE OR REPLACE FUNCTION public.validate_entry_pass(p_pass_token TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_pass RECORD; 
  v_scan_result TEXT; 
  v_username TEXT;
  v_already_scanned_today BOOLEAN;
  v_today DATE;
BEGIN
  v_username := current_user;
  v_today := CURRENT_DATE; -- Uses server date (UTC usually, ensure consistent timezone if needed)

  SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token;
  
  -- 1. Check if exists
  IF NOT FOUND THEN
    v_scan_result := 'invalid';
    -- Log invalid attempt
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (NULL, v_username, v_scan_result, NULL, 'general_entry'); -- logging as generic
    
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Invalid pass token');
  END IF;

  -- 2. Check if manually deactivated
  IF NOT v_pass.is_active THEN
    v_scan_result := 'inactive';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Pass has been deactivated');
  END IF;

  -- 3. Check if ALREADY SCANNED TODAY
  -- We check pass_scans table for a 'valid' scan record for this pass_id created today
  SELECT EXISTS (
    SELECT 1 FROM public.pass_scans 
    WHERE pass_id = v_pass.id 
    AND scan_result = 'valid'
    AND scanned_at::date = v_today
  ) INTO v_already_scanned_today;

  IF v_already_scanned_today THEN
    v_scan_result := 'already_used';
    
    -- Log the attempt (optional, helps track re-entry attempts)
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    
    RETURN json_build_object(
      'valid', false, 
      'result', v_scan_result, 
      'message', 'Already scanned today', 
      'name', COALESCE(v_pass.participant_name, 'Unknown')
    );
  END IF;

  -- 4. VALID ENTRY
  v_scan_result := 'valid';
  
  -- Mark as used (global flag, just to show it's not "fresh" unused pass)
  UPDATE public.entry_passes SET is_used = true WHERE id = v_pass.id;
  
  -- Insert Valid Scan Record
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
  VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
  
  RETURN json_build_object(
    'valid', true, 
    'result', v_scan_result, 
    'message', 'Valid entry', 
    'name', COALESCE(v_pass.participant_name, 'VIP Guest'), 
    'pass_type', v_pass.pass_type
  );
END; $func$;
