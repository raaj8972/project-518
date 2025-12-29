-- Function to reset pass usage (Admin only)
CREATE OR REPLACE FUNCTION public.reset_pass_usage(p_pass_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can reset passes'; 
  END IF;

  -- Delete scans
  DELETE FROM public.pass_scans WHERE pass_id = p_pass_id;
  
  -- Reset pass status
  UPDATE public.entry_passes 
  SET is_used = false 
  WHERE id = p_pass_id;

  RETURN json_build_object('success', true, 'message', 'Pass usage reset successfully');
END; $func$;

GRANT EXECUTE ON FUNCTION public.reset_pass_usage(UUID) TO authenticated;
