--Add failed_attempts and last_attempt_at columns to passkeys table for rate limiting
ALTER TABLE public.passkeys 
ADD COLUMN IF NOT EXISTS failed_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON public.passkeys(user_id);
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_expires_at ON public.passkey_challenges(expires_at);

-- Add cleanup function for expired challenges (runs automatically)
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM public.passkey_challenges
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment for documentation
COMMENT ON FUNCTION cleanup_expired_challenges() IS 'Removes expired passkey challenges to prevent database bloat';
