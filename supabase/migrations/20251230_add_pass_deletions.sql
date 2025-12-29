-- Deletion functions for Entry Passes and Registrations

-- 1. Delete a specific VIP or General Entry Pass
CREATE OR REPLACE FUNCTION public.delete_entry_pass(p_pass_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can delete passes'; 
  END IF;

  -- Scans will be deleted automatically if ON DELETE CASCADE is set, 
  -- otherwise we do it manually to be safe.
  DELETE FROM public.pass_scans WHERE pass_id = p_pass_id;
  
  -- Delete the pass
  DELETE FROM public.entry_passes WHERE id = p_pass_id;

  -- Also check if it was linked to a registration and null it out there
  UPDATE public.pass_registrations SET pass_id = NULL WHERE pass_id = p_pass_id;
  
  RETURN json_build_object('success', true, 'message', 'Pass deleted successfully');
END; $func$;

-- 2. Delete a Pass Registration request
CREATE OR REPLACE FUNCTION public.delete_pass_registration(p_reg_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
  v_pass_id UUID;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can delete registrations'; 
  END IF;

  -- Get associated pass_id
  SELECT pass_id INTO v_pass_id FROM public.pass_registrations WHERE id = p_reg_id;

  -- Delete the registration
  DELETE FROM public.pass_registrations WHERE id = p_reg_id;

  -- If there was an associated pass, delete it too (cleanup)
  IF v_pass_id IS NOT NULL THEN
     PERFORM public.delete_entry_pass(v_pass_id);
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Registration deleted successfully');
END; $func$;

GRANT EXECUTE ON FUNCTION public.delete_entry_pass(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_pass_registration(UUID) TO authenticated;
