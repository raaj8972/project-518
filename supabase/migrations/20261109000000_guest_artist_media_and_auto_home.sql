-- The artist editor stores card media and profile audio. Older deployments lack these fields.
ALTER TABLE public.guest_artists
  ADD COLUMN IF NOT EXISTS card_media_url text,
  ADD COLUMN IF NOT EXISTS card_media_is_video boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS detail_music_url text;

-- Featuring is automatic for artists; enabled remains the only publication control.
ALTER TABLE public.guest_artists ALTER COLUMN is_featured SET DEFAULT true;
UPDATE public.guest_artists SET is_featured = true WHERE is_featured IS DISTINCT FROM true;
NOTIFY pgrst, 'reload schema';
