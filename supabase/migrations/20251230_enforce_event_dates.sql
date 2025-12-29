-- Create new function with strict date enforcement
CREATE OR REPLACE FUNCTION public.validate_entry_pass(p_pass_token TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_pass RECORD; 
  v_scan_result TEXT; 
  v_username TEXT;
  v_already_scanned_today BOOLEAN;
  v_event_dates JSONB;
  v_today_str TEXT;
  v_day_number INTEGER := 0;
  v_day_label TEXT := '';
  v_date_item TEXT;
  v_idx INTEGER;
BEGIN
  v_username := current_user;
  v_today_str := to_char(CURRENT_DATE, 'YYYY-MM-DD');

  -- Get Event Dates Config
  SELECT event_dates INTO v_event_dates FROM public.security_settings LIMIT 1;
  
  -- Determine "Day X" and Strict Check
  IF v_event_dates IS NOT NULL AND jsonb_array_length(v_event_dates) > 0 THEN
    v_idx := 1;
    FOR v_date_item IN SELECT * FROM jsonb_array_elements_text(v_event_dates)
    LOOP
      IF v_date_item = v_today_str THEN
        v_day_number := v_idx;
        v_day_label := ' (Day ' || v_idx || ')';
      END IF;
      v_idx := v_idx + 1;
    END LOOP;

    -- STRICT CHECK: If dates are configured but today is NOT one of them
    IF v_day_number = 0 THEN
       v_scan_result := 'invalid_date';
       -- Log attempt
       INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type) 
       VALUES (NULL, v_username, v_scan_result, NULL, 'general_entry');
       RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Entry denied: Not an event day');
    END IF;
  END IF;

  SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token;
  
  IF NOT FOUND THEN
    v_scan_result := 'invalid';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type) VALUES (NULL, v_username, v_scan_result, NULL, 'general_entry');
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Invalid pass token');
  END IF;

  IF NOT v_pass.is_active THEN
    v_scan_result := 'inactive';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Pass has been deactivated');
  END IF;

  -- Logic: Check if scanned TODAY
  SELECT EXISTS (
    SELECT 1 FROM public.pass_scans 
    WHERE pass_id = v_pass.id 
    AND scan_result = 'valid'
    AND scanned_at::date = CURRENT_DATE
  ) INTO v_already_scanned_today;

  IF v_already_scanned_today THEN
    v_scan_result := 'already_used';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Pass already used for Day ' || v_day_number, 'name', COALESCE(v_pass.participant_name, 'Unknown'));
  END IF;

  -- VALID ENTRY
  v_scan_result := 'valid';
  UPDATE public.entry_passes SET is_used = true WHERE id = v_pass.id;
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
  VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
  
  RETURN json_build_object('valid', true, 'result', v_scan_result, 'message', 'Valid Entry' || v_day_label, 'name', COALESCE(v_pass.participant_name, 'VIP Guest'), 'pass_type', v_pass.pass_type);
  
END; $func$;
