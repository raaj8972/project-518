-- Migration: Add motion_poster_autoplay to events
-- Date: 2025-10-07
-- Adds a per-event flag to control whether the motion poster video should autoplay on the public event card.

BEGIN;

-- Add the column if it doesn't exist. Default false so existing rows won't autoplay.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS motion_poster_autoplay boolean DEFAULT false;

-- Optional: provide a descriptive comment on the column
COMMENT ON COLUMN public.events.motion_poster_autoplay IS 'Whether the motion poster should autoplay on the event card (admin-controlled)';

COMMIT;
