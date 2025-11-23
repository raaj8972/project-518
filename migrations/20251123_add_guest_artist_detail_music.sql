-- Add optional looping detail music for guest artist modal
ALTER TABLE public.guest_artists
  ADD COLUMN IF NOT EXISTS detail_music_url text;

COMMENT ON COLUMN public.guest_artists.detail_music_url IS 'Optional looping music track that plays when the detail modal opens.';
