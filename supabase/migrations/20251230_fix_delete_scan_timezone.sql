-- Update delete_pass_scan_for_date to be IST-aware
-- This ensures that deletions in the UI correctly match the records in the DB,
-- especially for early-morning scans (12 AM - 5:30 AM IST).

CREATE OR REPLACE FUNCTION public.delete_pass_scan_for_date(p_pass_id UUID, p_date DATE)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
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
  
  RETURN json_build_object('success', true, 'message', 'Scan deleted successfully');
END; $func$;
