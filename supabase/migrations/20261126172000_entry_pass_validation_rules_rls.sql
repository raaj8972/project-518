-- Enable full Entry Pass management RLS on validation_rules and align pass RPC page checks with student-passes.
BEGIN;

ALTER TABLE public.validation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS validation_rules_admin_manage ON public.validation_rules;
CREATE POLICY validation_rules_admin_manage
  ON public.validation_rules
  FOR ALL
  TO authenticated
  USING (
    public.session_is_current()
    AND public.admin_can_manage_pages(ARRAY['student-passes', 'security-passes'], ARRAY['can_security_passes'])
  )
  WITH CHECK (
    public.session_is_current()
    AND public.admin_can_manage_pages(ARRAY['student-passes', 'security-passes'], ARRAY['can_security_passes'])
  );

-- Ensure Owner can upsert/update security_settings (for Pass Editor templates, dates, and venue)
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS security_settings_owner ON public.security_settings;
CREATE POLICY security_settings_owner
  ON public.security_settings
  FOR ALL
  TO authenticated
  USING (public.session_is_current() AND public.admin_is_owner())
  WITH CHECK (public.session_is_current() AND public.admin_is_owner());

-- Align pass management RPC guards so unified Entry Pass ('student-passes') permission works alongside legacy 'security-passes'.
DO $$ DECLARE f record; body text; definition text;
BEGIN
  FOR f IN
    SELECT p.oid, p.proname, p.prosrc, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(ARRAY[
        'delete_pass_scan_for_date',
        'reset_pass_usage',
        'update_pass_date'
      ])
  LOOP
    body := replace(
      f.prosrc,
      $old$ARRAY['security-passes']$old$,
      $new$ARRAY['student-passes','security-passes']$new$
    );
    IF body <> f.prosrc THEN
      definition := replace(f.def, f.prosrc, body);
      EXECUTE definition;
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', f.oid::regprocedure);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.create_vip_pass_v3(
  p_council_password text DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_valid_date date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
DECLARE pass_id uuid; token text;
BEGIN
  IF NOT coalesce((
    public.admin_can_manage_pages(ARRAY['student-passes', 'security-passes'], ARRAY['can_security_passes'])
    OR (auth.role() = 'service_role' AND public.verify_council_password(p_council_password))
  ), false) THEN
    RAISE EXCEPTION 'Pass management access required' USING ERRCODE = '42501';
  END IF;
  token := 'VIP-' || upper(encode(extensions.gen_random_bytes(24), 'hex'));
  INSERT INTO public.entry_passes(pass_token, pass_type, participant_name, notes, created_by, valid_date)
  VALUES (token, 'vip', p_name, p_notes, auth.uid(), p_valid_date)
  RETURNING id INTO pass_id;
  RETURN json_build_object('success', true, 'pass_id', pass_id, 'pass_token', token);
END
$fn$;

CREATE OR REPLACE FUNCTION public.delete_entry_pass_v3(
  p_council_password text DEFAULT NULL,
  p_pass_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF NOT coalesce((
    public.admin_can_manage_pages(ARRAY['student-passes', 'security-passes'], ARRAY['can_security_passes'])
    OR (auth.role() = 'service_role' AND public.verify_council_password(p_council_password))
  ), false) THEN
    RAISE EXCEPTION 'Pass management access required' USING ERRCODE = '42501';
  END IF;
  IF p_pass_id IS NULL THEN
    RAISE EXCEPTION 'Pass ID is required';
  END IF;
  IF auth.role() = 'service_role' AND NOT EXISTS (
    SELECT 1 FROM public.entry_passes WHERE id = p_pass_id AND pass_type = 'vip'
  ) THEN
    RAISE EXCEPTION 'VIP pass not found';
  END IF;
  DELETE FROM public.pass_scans WHERE pass_id = p_pass_id;
  DELETE FROM public.entry_passes WHERE id = p_pass_id;
  RETURN json_build_object('success', true);
END
$fn$;

REVOKE ALL ON FUNCTION public.create_vip_pass_v3(text, text, text, date), public.delete_entry_pass_v3(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_vip_pass_v3(text, text, text, date), public.delete_entry_pass_v3(text, uuid) TO authenticated, service_role;

COMMIT;
