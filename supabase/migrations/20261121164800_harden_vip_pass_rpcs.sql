-- Harden VIP pass RPCs: fix text/uuid type comparison with auth.uid()
-- Ensure SECURITY DEFINER and strict search_path = public, extensions

CREATE OR REPLACE FUNCTION public.create_vip_pass_v3(
  p_council_password text DEFAULT NULL::text,
  p_name text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_valid_date date DEFAULT NULL::date
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_pass_id UUID;
  v_pass_token TEXT;
  v_settings RECORD;
BEGIN
  -- Admin Check
  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text) INTO v_is_authorized;
  END IF;

  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = extensions.crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to create VIP passes'; END IF;

  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_by, valid_date)
  VALUES (v_pass_token, 'vip', p_name, p_notes, auth.uid(), p_valid_date) RETURNING id INTO v_pass_id;

  RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_entry_pass_v3(
  p_council_password text DEFAULT NULL::text,
  p_pass_id uuid DEFAULT NULL::uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_settings RECORD;
BEGIN
  -- Admin Check
  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text) INTO v_is_authorized;
  END IF;

  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings IS NULL THEN RAISE EXCEPTION 'Security settings [id=1] not found'; END IF;
     IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured in settings'; END IF;

     IF v_settings.council_password_hash = extensions.crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to delete passes'; END IF;
  IF p_pass_id IS NULL THEN RAISE EXCEPTION 'Pass ID is required'; END IF;

  -- 1. Delete associated scans first
  DELETE FROM public.pass_scans WHERE pass_id = p_pass_id;

  -- 2. Hard Delete the pass
  DELETE FROM public.entry_passes WHERE id = p_pass_id;

  RETURN json_build_object('success', true, 'message', 'Pass and associated scans deleted permanently');
END;
$$;

REVOKE ALL ON FUNCTION public.create_vip_pass_v3(text, text, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_vip_pass_v3(text, text, text, date) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.delete_entry_pass_v3(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_entry_pass_v3(text, uuid) TO anon, authenticated, service_role;
