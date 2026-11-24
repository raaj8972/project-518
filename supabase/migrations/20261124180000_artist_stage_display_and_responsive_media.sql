BEGIN;
ALTER TABLE public.homepage_settings ADD COLUMN IF NOT EXISTS artist_stage_settings jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.guest_artists ADD COLUMN IF NOT EXISTS desktop_gallery_images text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.guest_artists ADD COLUMN IF NOT EXISTS desktop_stage_clip_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.guest_artists ADD COLUMN IF NOT EXISTS stage_light_color text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION public.valid_artist_stage_settings(value jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE item jsonb; y integer;
BEGIN
 IF jsonb_typeof(value) IS DISTINCT FROM 'object' THEN RETURN false;END IF;
 IF value?'visible_years' THEN
  IF jsonb_typeof(value->'visible_years') IS DISTINCT FROM 'array' THEN RETURN false;END IF;
  IF jsonb_array_length(value->'visible_years') NOT BETWEEN 1 AND 12 THEN RETURN false;END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(value->'visible_years') LOOP
   IF jsonb_typeof(item)<>'number' OR (item#>>'{}') !~ '^20[0-9]{2}$|^2100$' THEN RETURN false;END IF;
   y=(item#>>'{}')::integer;IF y NOT BETWEEN 2000 AND 2100 THEN RETURN false;END IF;
  END LOOP;
 END IF;
 IF value?'date_label' AND (jsonb_typeof(value->'date_label') IS DISTINCT FROM 'string' OR length(trim(value->>'date_label')) NOT BETWEEN 1 AND 60) THEN RETURN false;END IF;
 IF value?'venue_label' AND (jsonb_typeof(value->'venue_label') IS DISTINCT FROM 'string' OR length(trim(value->>'venue_label')) NOT BETWEEN 1 AND 120) THEN RETURN false;END IF;
 IF value?'lights_enabled' AND jsonb_typeof(value->'lights_enabled') IS DISTINCT FROM 'boolean' THEN RETURN false;END IF;
 IF value?'beat_sync' AND jsonb_typeof(value->'beat_sync') IS DISTINCT FROM 'boolean' THEN RETURN false;END IF;
 RETURN true;
END $$;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.homepage_settings'::regclass AND conname='homepage_artist_stage_settings_valid') THEN ALTER TABLE public.homepage_settings ADD CONSTRAINT homepage_artist_stage_settings_valid CHECK(public.valid_artist_stage_settings(artist_stage_settings));END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.guest_artists'::regclass AND conname='guest_artists_desktop_media_limits') THEN ALTER TABLE public.guest_artists ADD CONSTRAINT guest_artists_desktop_media_limits CHECK(
 cardinality(desktop_gallery_images)<=3 AND cardinality(desktop_stage_clip_urls)<=3
 AND coalesce(array_ndims(desktop_gallery_images),1)=1 AND coalesce(array_ndims(desktop_stage_clip_urls),1)=1
 AND array_position(desktop_gallery_images,NULL) IS NULL AND array_position(desktop_stage_clip_urls,NULL) IS NULL
 AND NOT(''=ANY(desktop_gallery_images)) AND NOT(''=ANY(desktop_stage_clip_urls))
 );END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.guest_artists'::regclass AND conname='guest_artists_stage_light_color_valid') THEN ALTER TABLE public.guest_artists ADD CONSTRAINT guest_artists_stage_light_color_valid CHECK(stage_light_color='' OR stage_light_color ~ '^#[0-9a-fA-F]{6}$');END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
