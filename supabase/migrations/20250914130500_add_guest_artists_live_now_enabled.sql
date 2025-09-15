-- Add live_now_enabled to guest_artists to allow toggling LIVE NOW badge visibility
-- Safe to run multiple times

BEGIN;

ALTER TABLE public.guest_artists
  ADD COLUMN IF NOT EXISTS live_now_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.guest_artists.live_now_enabled IS 'Controls whether LIVE NOW badge is shown after performance start.';

-- Backfill any NULLs to true (older rows)
UPDATE public.guest_artists
SET live_now_enabled = true
WHERE live_now_enabled IS NULL;

COMMIT;
