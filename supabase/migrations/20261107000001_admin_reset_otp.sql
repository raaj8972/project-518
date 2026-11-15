CREATE TABLE IF NOT EXISTS public.admin_reset_otps (
  email text PRIMARY KEY,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_reset_otps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_reset_otps FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_reset_otps TO service_role;

CREATE OR REPLACE FUNCTION public.issue_admin_reset_otp(p_email text, p_code_hash text)
RETURNS boolean LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO admin_reset_otps(email, code_hash, attempts, expires_at, sent_at)
  VALUES(p_email, p_code_hash, 0, now() + interval '10 minutes', now())
  ON CONFLICT(email) DO UPDATE SET code_hash = EXCLUDED.code_hash, attempts = 0,
    expires_at = EXCLUDED.expires_at, sent_at = EXCLUDED.sent_at
  WHERE admin_reset_otps.sent_at <= now() - interval '60 seconds';
  IF NOT FOUND THEN RETURN false; END IF;
  DELETE FROM admin_reset_tokens WHERE email = p_email;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_admin_reset_otp(p_email text, p_code_hash text, p_reset_hash text)
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE challenge admin_reset_otps%ROWTYPE;
BEGIN
  SELECT * INTO challenge FROM admin_reset_otps WHERE email = p_email FOR UPDATE;
  IF NOT FOUND THEN RETURN 'invalid'; END IF;
  IF challenge.expires_at <= now() THEN RETURN 'expired'; END IF;
  IF challenge.attempts >= 5 THEN RETURN 'locked'; END IF;
  UPDATE admin_reset_otps SET attempts = attempts + 1 WHERE email = p_email;
  IF challenge.code_hash <> p_code_hash THEN RETURN 'invalid'; END IF;
  INSERT INTO admin_reset_tokens(email, token, expires_at)
    VALUES(p_email, p_reset_hash, now() + interval '10 minutes')
    ON CONFLICT(email) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at;
  DELETE FROM admin_reset_otps WHERE email = p_email;
  RETURN 'verified';
END;
$$;

REVOKE ALL ON FUNCTION public.issue_admin_reset_otp(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_admin_reset_otp(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_admin_reset_otp(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_admin_reset_otp(text, text, text) TO service_role;
NOTIFY pgrst, 'reload schema';
