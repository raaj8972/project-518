-- Fix Scan Sync logic (Missing column and RPC repair)

-- 1. Add used_at column to entry_passes
ALTER TABLE public.entry_passes 
ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

-- 2. Repair process_pass_scan_v3 (Ensure it works with used_at)
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

  -- 3. Check if already used logic (multi-day compatible)
  -- If we want to allow re-entry on same day, we'd check pass_scans here.
  -- For now, consistent with offline: mark as used globally.
  IF v_pass.is_used THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name)
    VALUES (v_pass.id, 'system', 'already_used', v_participant_name, v_pass_type, p_guard_name);
    RETURN json_build_object('success', false, 'message', 'Pass Already Scanned');
  END IF;

  -- 4. Mark as used
  UPDATE public.entry_passes 
  SET is_used = true, used_at = NOW() 
  WHERE id = v_pass.id;

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

-- 3. Repair sync trigger
CREATE OR REPLACE FUNCTION public.handle_pass_scan_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scan_result = 'valid' THEN
    UPDATE public.entry_passes 
    SET 
      is_used = true,
      used_at = COALESCE(NEW.scanned_at, NOW())
    WHERE id = NEW.pass_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
