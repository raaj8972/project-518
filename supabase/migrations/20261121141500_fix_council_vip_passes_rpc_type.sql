-- Fix type mismatch in get_council_vip_passes_v3
-- entry_passes.pass_type is text, while original function signature returned public.pass_type
-- causing "structure of query does not match function result type: Returned type text does not match expected type public.pass_type in column 3"

DROP FUNCTION IF EXISTS public.get_council_vip_passes_v3(text);

CREATE OR REPLACE FUNCTION public.get_council_vip_passes_v3(p_password text)
RETURNS TABLE (
  pass_id uuid,
  participant_name text,
  pass_type text,
  created_at timestamptz,
  notes text,
  pass_token text,
  is_used boolean,
  is_active boolean,
  valid_date date,
  usage_logs jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_settings RECORD;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE security_settings.id = 1;
  IF v_settings IS NULL THEN RAISE EXCEPTION 'Security settings not found'; END IF;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != extensions.crypt(p_password, v_settings.council_password_hash) THEN
    RAISE EXCEPTION 'Invalid password';
  END IF;

  RETURN QUERY
  SELECT
    ep.id AS pass_id,
    ep.participant_name,
    ep.pass_type::text,
    ep.created_at,
    ep.notes,
    ep.pass_token,
    ep.is_used,
    ep.is_active,
    ep.valid_date,
    COALESCE(
      (
        SELECT jsonb_agg(ps.scanned_at ORDER BY ps.scanned_at ASC)
        FROM public.pass_scans ps
        WHERE ps.pass_id = ep.id AND ps.scan_result = 'valid'
      ),
      '[]'::jsonb
    ) AS usage_logs
  FROM public.entry_passes ep
  WHERE ep.pass_type = 'vip'
    AND (ep.is_hidden_from_council IS FALSE OR ep.is_hidden_from_council IS NULL)
  ORDER BY ep.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_council_vip_passes_v3(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_council_vip_passes_v3(text) TO anon, authenticated, service_role;
