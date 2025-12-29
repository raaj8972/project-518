-- FIXED CONSOLIDATED DELETION FUNCTIONS
-- This version corrects the "pass_id" column error and leverages CASCADE deletes.

-- 1. Function to delete a security user
CREATE OR REPLACE FUNCTION public.delete_security_user(p_user_id INTEGER)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Only admins can delete security users'; END IF;

  DELETE FROM public.security_users WHERE id = p_user_id;
  RETURN json_build_object('success', true, 'message', 'Security user deleted successfully');
END; $func$;

-- 2. Function to delete an entry pass (VIP or General)
CREATE OR REPLACE FUNCTION public.delete_entry_pass(p_pass_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Only admins can delete passes'; END IF;

  -- Deleting from entry_passes will automatically delete scans due to ON DELETE CASCADE
  DELETE FROM public.entry_passes WHERE id = p_pass_id;
  
  RETURN json_build_object('success', true, 'message', 'Pass deleted successfully');
END; $func$;

-- 3. Function to delete a pass registration
CREATE OR REPLACE FUNCTION public.delete_pass_registration(p_reg_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Only admins can delete registrations'; END IF;

  -- Deleting from pass_registrations will automatically delete the entry_pass and its scans due to ON DELETE CASCADE
  DELETE FROM public.pass_registrations WHERE id = p_reg_id;
  
  RETURN json_build_object('success', true, 'message', 'Registration deleted successfully');
END; $func$;

GRANT EXECUTE ON FUNCTION public.delete_security_user(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_entry_pass(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_pass_registration(UUID) TO authenticated;
