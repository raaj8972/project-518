-- Create a Postgres function to return the caller's public IP and update device session if fingerprint provided.
-- SECURITY DEFINER so that authenticated admins can call it without elevated permissions on table.
-- Assumes table admin_device_sessions has columns: fingerprint (pk/unique), ip_address, last_seen.
-- Adds a lightweight optional block insertion path.

-- 1. Ensure extension for inet functions is available (usually core, but safe):
-- (No-op if already there)
-- CREATE EXTENSION IF NOT EXISTS "ip4r"; -- not strictly needed; commenting out.

-- 2. RPC Function: capture_admin_ip
CREATE OR REPLACE FUNCTION public.capture_admin_ip(p_fingerprint text DEFAULT NULL)
RETURNS TABLE(ip text, updated boolean) AS $$
DECLARE
  v_ip text;
  v_exists boolean := false;
BEGIN
  -- inet_client_addr() returns the remote address of current session
  BEGIN
    v_ip := inet_client_addr()::text;
  EXCEPTION WHEN others THEN
    v_ip := NULL;
  END;

  IF p_fingerprint IS NOT NULL AND v_ip IS NOT NULL THEN
    SELECT TRUE INTO v_exists FROM admin_device_sessions WHERE fingerprint = p_fingerprint;
    IF v_exists THEN
      UPDATE admin_device_sessions
        SET ip_address = COALESCE(ip_address, v_ip), last_seen = NOW()
        WHERE fingerprint = p_fingerprint
        AND ip_address IS NULL; -- only set if was null
      RETURN QUERY SELECT v_ip, TRUE;
      RETURN;
    END IF;
  END IF;
  RETURN QUERY SELECT v_ip, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.capture_admin_ip(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.capture_admin_ip(text) TO authenticated; -- allow signed-in users

-- 3. Hybrid blocking: add a bool column to flag global IP-only blocks vs scoped (ip+fingerprint)
ALTER TABLE IF EXISTS admin_blocked_devices
  ADD COLUMN IF NOT EXISTS ip_only boolean DEFAULT FALSE;

-- 4. Helper view (optional) to see effective block scope
CREATE OR REPLACE VIEW public.v_admin_blocked_effective AS
SELECT fingerprint, ip_address, ip_only,
       CASE
         WHEN ip_only AND ip_address IS NOT NULL THEN 'GLOBAL_IP'::text
         WHEN fingerprint IS NOT NULL THEN 'DEVICE'::text
         ELSE 'UNKNOWN'::text
       END AS block_scope
FROM admin_blocked_devices;

GRANT SELECT ON public.v_admin_blocked_effective TO authenticated;
