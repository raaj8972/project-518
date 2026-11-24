-- Artist editions and slideshow media share the existing guest_artists RLS and
-- guest-artist-images / guest-artist-audio storage policies.
BEGIN;
ALTER TABLE public.guest_artists ADD COLUMN IF NOT EXISTS festival_year integer;
ALTER TABLE public.guest_artists ADD COLUMN IF NOT EXISTS gallery_images text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.guest_artists ADD COLUMN IF NOT EXISTS track_title text NOT NULL DEFAULT '';

UPDATE public.guest_artists
SET festival_year = CASE WHEN performance_at IS NOT NULL
  THEN EXTRACT(YEAR FROM performance_at AT TIME ZONE 'Asia/Kolkata')::integer
  ELSE 2026 END
WHERE festival_year IS NULL;
ALTER TABLE public.guest_artists ALTER COLUMN festival_year SET DEFAULT 2026;
ALTER TABLE public.guest_artists ALTER COLUMN festival_year SET NOT NULL;

DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.guest_artists'::regclass AND conname='guest_artists_festival_year_range') THEN
  ALTER TABLE public.guest_artists ADD CONSTRAINT guest_artists_festival_year_range CHECK (festival_year BETWEEN 2000 AND 2100);
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.guest_artists'::regclass AND conname='guest_artists_gallery_limit') THEN
  ALTER TABLE public.guest_artists ADD CONSTRAINT guest_artists_gallery_limit CHECK (
   cardinality(gallery_images)<=3 AND array_ndims(gallery_images) IS NOT DISTINCT FROM CASE WHEN cardinality(gallery_images)=0 THEN NULL::integer ELSE 1 END
   AND array_position(gallery_images,NULL) IS NULL AND NOT (''=ANY(gallery_images))
  );
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.guest_artists'::regclass AND conname='guest_artists_track_title_length') THEN
  ALTER TABLE public.guest_artists ADD CONSTRAINT guest_artists_track_title_length CHECK (char_length(track_title)<=240);
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS guest_artists_edition_order_idx ON public.guest_artists(festival_year DESC,order_position) WHERE enabled=true;
COMMENT ON COLUMN public.guest_artists.festival_year IS 'Festival edition, distinct from scheduled performance time. Existing dated artists retain their performance year.';
COMMENT ON COLUMN public.guest_artists.gallery_images IS 'Up to three slideshow URLs; image is the portrait fallback.';
COMMENT ON COLUMN public.guest_artists.track_title IS 'Public title of the detail_music_url track shown beside the spinning record.';
NOTIFY pgrst,'reload schema';
COMMIT;
