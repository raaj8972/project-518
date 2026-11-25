-- Migration: auth_rate_limit_and_council_sync
-- Timestamp: 20261121132000

BEGIN;

-- 1. Ensure table for tracking rate limits exists
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  ip_address text PRIMARY KEY,
  attempt_count int DEFAULT 0,
  last_attempt_at timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone
);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.auth_rate_limits TO service_role;

-- 2. check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(request_ip text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  rate_record public.auth_rate_limits%rowtype;
BEGIN
  SELECT * INTO rate_record FROM public.auth_rate_limits WHERE ip_address = request_ip;
  IF NOT FOUND THEN
    RETURN json_build_object('allowed', true);
  END IF;

  IF rate_record.blocked_until IS NOT NULL AND rate_record.blocked_until > now() THEN
    RETURN json_build_object(
      'allowed', false,
      'message', 'Too many failed attempts. Please try again later.'
    );
  END IF;

  IF rate_record.blocked_until IS NOT NULL AND rate_record.blocked_until <= now() THEN
    UPDATE public.auth_rate_limits
    SET attempt_count = 0, blocked_until = null, last_attempt_at = now()
    WHERE ip_address = request_ip;
    RETURN json_build_object('allowed', true);
  END IF;

  RETURN json_build_object('allowed', true);
END;
$$;

-- 3. record_failed_attempt function
CREATE OR REPLACE FUNCTION public.record_failed_attempt(request_ip text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  rate_record public.auth_rate_limits%rowtype;
  new_count int;
BEGIN
  SELECT * INTO rate_record FROM public.auth_rate_limits WHERE ip_address = request_ip;
  IF NOT FOUND THEN
    INSERT INTO public.auth_rate_limits (ip_address, attempt_count, last_attempt_at)
    VALUES (request_ip, 1, now());
  ELSE
    IF rate_record.last_attempt_at < now() - interval '1 hour' AND rate_record.blocked_until IS NULL THEN
       new_count := 1;
    ELSE
       new_count := rate_record.attempt_count + 1;
    END IF;

    IF new_count >= 5 THEN
      UPDATE public.auth_rate_limits
      SET attempt_count = new_count,
          last_attempt_at = now(),
          blocked_until = now() + interval '15 minutes'
      WHERE ip_address = request_ip;
    ELSE
      UPDATE public.auth_rate_limits
      SET attempt_count = new_count,
          last_attempt_at = now()
      WHERE ip_address = request_ip;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text) TO service_role;

REVOKE ALL ON FUNCTION public.record_failed_attempt(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_failed_attempt(text) TO service_role;

-- Council credentials must be provisioned from the owner's Access Center.
-- Never seed or reset a shared password from a migration.
