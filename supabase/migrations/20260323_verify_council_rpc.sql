-- Function to verify council passcode (Bcrypt)
CREATE OR REPLACE FUNCTION public.verify_council_password(p_password TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_pass_hash TEXT;
BEGIN
  SELECT council_password_hash INTO v_pass_hash 
  FROM public.security_settings 
  WHERE id = 1;

  IF v_pass_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_pass_hash = crypt(p_password, v_pass_hash);
END; $func$;

GRANT EXECUTE ON FUNCTION public.verify_council_password(TEXT) TO anon, authenticated;
