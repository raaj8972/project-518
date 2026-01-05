-- Migration: Hide VIP Passes from Council
-- 1. Add is_hidden_from_council column to entry_passes
ALTER TABLE public.entry_passes 
ADD COLUMN IF NOT EXISTS is_hidden_from_council BOOLEAN DEFAULT FALSE;

-- 2. Update get_council_vip_passes_v3 to filter hidden passes
DROP FUNCTION IF EXISTS public.get_council_vip_passes_v3(text);

CREATE OR REPLACE FUNCTION public.get_council_vip_passes_v3(p_password TEXT)
RETURNS TABLE (
  pass_id UUID,
  participant_name TEXT,
  pass_type public.pass_type,
  created_at TIMESTAMPTZ,
  notes TEXT,
  pass_token TEXT,
  is_used BOOLEAN,
  is_active BOOLEAN,
  usage_logs JSONB
) LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE 
  v_settings RECORD;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE security_settings.id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  RETURN QUERY
  SELECT 
    ep.id AS pass_id,
    ep.participant_name,
    ep.pass_type,
    ep.created_at,
    ep.notes,
    ep.pass_token,
    ep.is_used,
    ep.is_active,
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

-- 3. RPC to Toggle Visibility (Admin Only)
CREATE OR REPLACE FUNCTION public.toggle_pass_council_visibility(
  p_pass_id UUID,
  p_hidden BOOLEAN
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
BEGIN
  -- Admin Authorization Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  IF NOT v_is_authorized THEN 
     RAISE EXCEPTION 'Not authorized'; 
  END IF;

  UPDATE public.entry_passes
  SET is_hidden_from_council = p_hidden
  WHERE id = p_pass_id;

  RETURN json_build_object('success', true, 'message', 'Visibility updated');
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_pass_council_visibility(UUID, BOOLEAN) TO authenticated;
