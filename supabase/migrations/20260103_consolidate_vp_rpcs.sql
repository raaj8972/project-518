-- ABSOLUTE CLEANUP AND ALPHABETICAL CONSOLIDATION
-- Resolves "Could not find function in schema cache" by aligning with PostgREST parameter matching.

-- 1. Robustly drop all versions of the problematic functions
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all overloads of create_vip_pass
    FOR r IN (SELECT oid::regprocedure as proc FROM pg_proc WHERE proname = 'create_vip_pass' AND pronamespace = 'public'::regnamespace) LOOP
        EXECUTE 'DROP FUNCTION ' || r.proc;
    END LOOP;

    -- Drop all overloads of delete_entry_pass
    FOR r IN (SELECT oid::regprocedure as proc FROM pg_proc WHERE proname = 'delete_entry_pass' AND pronamespace = 'public'::regnamespace) LOOP
        EXECUTE 'DROP FUNCTION ' || r.proc;
    END LOOP;
END $$;

-- 2. Re-create create_vip_pass with ALPHABETICAL parameters
-- (p_council_password, p_name, p_notes)
CREATE OR REPLACE FUNCTION public.create_vip_pass(
  p_council_password TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_pass_id UUID;
  v_pass_token TEXT;
  v_settings RECORD;
BEGIN
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to create VIP passes'; END IF;
  
  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_by)
  VALUES (v_pass_token, 'vip', p_name, p_notes, auth.uid()) RETURNING id INTO v_pass_id;
  
  RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END; $$;

-- 3. Re-create delete_entry_pass with ALPHABETICAL parameters
-- (p_council_password, p_pass_id)
CREATE OR REPLACE FUNCTION public.delete_entry_pass(
  p_council_password TEXT DEFAULT NULL,
  p_pass_id UUID DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_settings RECORD;
BEGIN
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to delete passes'; END IF;
  IF p_pass_id IS NULL THEN RAISE EXCEPTION 'Pass ID is required'; END IF;

  DELETE FROM public.entry_passes WHERE id = p_pass_id;
  RETURN json_build_object('success', true, 'message', 'Pass deleted successfully');
END; $$;

-- 4. Re-create get_council_vip_passes
CREATE OR REPLACE FUNCTION public.get_council_vip_passes(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_settings RECORD;
  v_passes JSON;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL OR v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password';
  END IF;

  SELECT json_agg(t) INTO v_passes FROM (
    SELECT id, pass_token, pass_type, participant_name, notes, is_used, is_active, created_at
    FROM public.entry_passes WHERE pass_type = 'vip'
    ORDER BY created_at DESC
  ) t;

  RETURN COALESCE(v_passes, '[]'::json);
END; $$;

GRANT EXECUTE ON FUNCTION public.create_vip_pass(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_entry_pass(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_council_vip_passes(TEXT) TO anon, authenticated;
