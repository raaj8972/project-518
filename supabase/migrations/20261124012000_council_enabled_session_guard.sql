-- Both login and every sealed-session request must honor the live access switch.
BEGIN;
CREATE OR REPLACE FUNCTION public.verify_council_password(p_password text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$
 SELECT EXISTS(SELECT 1 FROM public.security_settings WHERE id=1 AND councils_enabled IS TRUE
  AND council_password_hash IS NOT NULL AND council_password_hash=extensions.crypt(p_password,council_password_hash))
$fn$;
REVOKE ALL ON FUNCTION public.verify_council_password(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_council_password(text) TO service_role;
COMMIT;
