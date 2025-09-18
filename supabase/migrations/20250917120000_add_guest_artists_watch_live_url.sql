-- Add watch_live_url column to guest_artists for external live stream links (YouTube, Vimeo, etc.)
-- Safe, idempotent migration.

BEGIN;

ALTER TABLE public.guest_artists
  ADD COLUMN IF NOT EXISTS watch_live_url text;

COMMENT ON COLUMN public.guest_artists.watch_live_url IS 'External URL to watch live performance (YouTube, stream, etc.).';

COMMIT;
