BEGIN;
ALTER TABLE public.guest_artists ADD COLUMN IF NOT EXISTS artist_kind text;
ALTER TABLE public.guest_artists ADD COLUMN IF NOT EXISTS stage_media_mode text NOT NULL DEFAULT 'photos';
ALTER TABLE public.guest_artists ADD COLUMN IF NOT EXISTS stage_clip_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.guest_artists ADD COLUMN IF NOT EXISTS stage_clip_seconds integer NOT NULL DEFAULT 30;
ALTER TABLE public.guest_artists ADD COLUMN IF NOT EXISTS spotify_collection_url text NOT NULL DEFAULT '';
ALTER TABLE public.guest_artists ADD COLUMN IF NOT EXISTS featured_songs jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.guest_artists SET artist_kind=CASE
 WHEN concat_ws(' ',title,specialty) ~* '\m(band|duo|group)\M' THEN 'band'
 WHEN concat_ws(' ',title,specialty) ~* '\mdj\M' THEN 'dj'
 ELSE 'artist' END WHERE artist_kind IS NULL;
ALTER TABLE public.guest_artists ALTER COLUMN artist_kind SET DEFAULT 'artist';
ALTER TABLE public.guest_artists ALTER COLUMN artist_kind SET NOT NULL;

DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.guest_artists'::regclass AND conname='guest_artists_profile_kind') THEN
  ALTER TABLE public.guest_artists ADD CONSTRAINT guest_artists_profile_kind CHECK(artist_kind IN ('artist','band','dj'));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.guest_artists'::regclass AND conname='guest_artists_stage_media_mode') THEN
  ALTER TABLE public.guest_artists ADD CONSTRAINT guest_artists_stage_media_mode CHECK(stage_media_mode IN ('photos','clips'));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.guest_artists'::regclass AND conname='guest_artists_stage_clip_limit') THEN
  ALTER TABLE public.guest_artists ADD CONSTRAINT guest_artists_stage_clip_limit CHECK(
   cardinality(stage_clip_urls)<=3 AND array_ndims(stage_clip_urls) IS NOT DISTINCT FROM CASE WHEN cardinality(stage_clip_urls)=0 THEN NULL::integer ELSE 1 END
   AND array_position(stage_clip_urls,NULL) IS NULL AND NOT(''=ANY(stage_clip_urls)));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.guest_artists'::regclass AND conname='guest_artists_stage_clip_seconds') THEN
  ALTER TABLE public.guest_artists ADD CONSTRAINT guest_artists_stage_clip_seconds CHECK(stage_clip_seconds IN (30,60));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.guest_artists'::regclass AND conname='guest_artists_featured_songs_limit') THEN
  ALTER TABLE public.guest_artists ADD CONSTRAINT guest_artists_featured_songs_limit CHECK(jsonb_typeof(featured_songs)='array' AND jsonb_array_length(featured_songs)<=12);
 END IF;
END $$;
COMMENT ON COLUMN public.guest_artists.stage_clip_urls IS 'Up to three uploaded/direct video URLs for the main artist screen. Existing artist video storage policies apply.';
COMMENT ON COLUMN public.guest_artists.stage_clip_seconds IS 'Maximum autoplay duration for each stage clip; clips advance at their end or this 30/60-second limit.';
COMMENT ON COLUMN public.guest_artists.spotify_collection_url IS 'Spotify artist, album, playlist or track URL used by the profile player; social_links.spotify is the fallback.';
COMMENT ON COLUMN public.guest_artists.featured_songs IS 'Up to twelve curated title/url objects, linking to Spotify or YouTube.';
NOTIFY pgrst,'reload schema';
COMMIT;
