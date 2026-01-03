-- Add guard_name to pass_scans for accountability
ALTER TABLE public.pass_scans 
ADD COLUMN IF NOT EXISTS guard_name TEXT;

-- Update the main security RPC to handle guard_name
CREATE OR REPLACE FUNCTION public.process_pass_scan_v3(
  p_pass_token TEXT,
  p_guard_name TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_pass RECORD;
  v_result TEXT;
  v_participant_name TEXT;
  v_pass_type public.pass_type;
  v_settings RECORD;
BEGIN
  -- 1. Find the pass
  SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token;
  
  IF v_pass IS NULL THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, guard_name)
    VALUES (NULL, 'system', 'invalid', p_guard_name);
    RETURN json_build_object('success', false, 'message', 'Invalid Pass Token');
  END IF;

  v_participant_name := v_pass.participant_name;
  v_pass_type := v_pass.pass_type;

  -- 2. Check if active
  IF NOT v_pass.is_active THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name)
    VALUES (v_pass.id, 'system', 'inactive', v_participant_name, v_pass_type, p_guard_name);
    RETURN json_build_object('success', false, 'message', 'Pass is Inactive');
  END IF;

  -- 3. Check if already used (unless it's a multi-use type if we ever add one)
  IF v_pass.is_used THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name)
    VALUES (v_pass.id, 'system', 'already_used', v_participant_name, v_pass_type, p_guard_name);
    RETURN json_build_object('success', false, 'message', 'Pass Already Scanned');
  END IF;

  -- 4. Multi-day/Multi-use logic (if any)
  -- For now, all are single use. Mark as used.
  UPDATE public.entry_passes SET is_used = true, used_at = NOW() WHERE id = v_pass.id;

  -- 5. Record valid scan
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name)
  VALUES (v_pass.id, 'system', 'valid', v_participant_name, v_pass_type, p_guard_name);

  RETURN json_build_object(
    'success', true, 
    'message', 'Valid Entry', 
    'participant_name', v_participant_name,
    'pass_type', v_pass_type
  );
END; $$;
