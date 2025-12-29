-- Function to delete a security user (Admin only)
CREATE OR REPLACE FUNCTION public.delete_security_user(p_user_id INTEGER)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can delete security users'; 
  END IF;

  -- Delete the scans by this user first to resolve FK constraints if any,
  -- but usually we want to keep audit logs.
  -- If we want to keep audits, we might need to NULL out the scanned_by_username
  -- but since it's a TEXT field in pass_scans, it doesn't strictly depend on the user ID.
  
  -- Delete the security user
  DELETE FROM public.security_users WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Security user deleted successfully');
END; $func$;

GRANT EXECUTE ON FUNCTION public.delete_security_user(INTEGER) TO authenticated;
