-- Increase file_size_limit to at least 30MB for all image-centric buckets
-- Safe/idempotent: will only increase limits if currently lower or null
-- Run in Supabase SQL editor or include in your migration workflow

BEGIN;

-- List of image buckets in this project
WITH targets AS (
  SELECT unnest(ARRAY[
    'band-images',
    'event-images',
    'gallery-images',
    'team-images',
    'faculty-images',
    'guest-artist-images',
    'sponsor-logos',
    'sports-images',
    'registration-photos',
    'hero-media'
  ]) AS id
)
UPDATE storage.buckets b
SET file_size_limit = GREATEST(COALESCE(b.file_size_limit, 0), 31457280)  -- 30MB
FROM targets t
WHERE b.id = t.id;

-- Optional: ensure these buckets exist (no-ops if already there)
INSERT INTO storage.buckets (id, name, public)
SELECT id, id, TRUE FROM (VALUES
  ('band-images'),('event-images'),('gallery-images'),('team-images'),('faculty-images'),('guest-artist-images'),('sponsor-logos'),('sports-images'),('hero-media')
) v(id)
ON CONFLICT (id) DO NOTHING;

-- Keep registration-photos private if present
UPDATE storage.buckets SET public = FALSE WHERE id = 'registration-photos';

-- Reload PostgREST to pick up any changes
DO $$ BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN others THEN
  NULL;
END $$;

COMMIT;
