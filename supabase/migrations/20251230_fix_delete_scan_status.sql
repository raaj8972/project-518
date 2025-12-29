-- Improve delete_pass_scan_for_date to handle pass status reset
-- If all scans for a pass are deleted, the pass should be marked as NOT used.

CREATE OR REPLACE FUNCTION public.delete_pass_scan_for_date(p_pass_id UUID, p_date DATE)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
  v_scans_left INTEGER;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can delete scans'; 
  END IF;

  -- Delete scans for that date, explicitly converting scanned_at to IST
  DELETE FROM public.pass_scans 
  WHERE pass_id = p_pass_id 
  AND (scanned_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = p_date;

  -- Check if any VALID scans remain for this pass
  SELECT COUNT(*) INTO v_scans_left 
  FROM public.pass_scans 
  WHERE pass_id = p_pass_id AND scan_result = 'valid';

  -- If NO scans remain, mark the pass as NOT used
  IF v_scans_left = 0 THEN
    UPDATE public.entry_passes SET is_used = false WHERE id = p_pass_id;
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Scan deleted successfully',
    'scans_remaining', v_scans_left
  );
END; $func$;
