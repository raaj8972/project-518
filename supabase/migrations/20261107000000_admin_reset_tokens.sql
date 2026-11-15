-- Password recovery tokens are private to the server's service-role client.
CREATE TABLE IF NOT EXISTS public.admin_reset_tokens (
  email text PRIMARY KEY,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_reset_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_reset_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_reset_tokens TO service_role;

NOTIFY pgrst, 'reload schema';
