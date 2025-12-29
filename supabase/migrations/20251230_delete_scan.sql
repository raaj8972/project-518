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

  -- Delete scans for that date
  DELETE FROM public.pass_scans 
  WHERE pass_id = p_pass_id 
  AND scanned_at::date = p_date;
  
  RETURN json_build_object('success', true, 'message', 'Scan deleted successfully');
END; $func$;

GRANT EXECUTE ON FUNCTION public.delete_pass_scan_for_date(UUID, DATE) TO authenticated;
