-- Guest artist card media support: allow uploading either a motion-poster video or a static image
-- Adds nullable columns to preserve backwards compatibility.

ALTER TABLE public.guest_artists
  ADD COLUMN IF NOT EXISTS card_media_url text,
  ADD COLUMN IF NOT EXISTS card_media_is_video boolean DEFAULT false;

COMMENT ON COLUMN public.guest_artists.card_media_url IS 'Optional media (video or image) used on the homepage guest artist card strip.';
COMMENT ON COLUMN public.guest_artists.card_media_is_video IS 'True if card_media_url points to a video asset; false for images.';

-- Normalize null booleans to default false for existing rows
UPDATE public.guest_artists
SET card_media_is_video = false
WHERE card_media_is_video IS NULL;
