/*
  Allow HEIC/HEIF image MIME types in all image-centric buckets.
  Safe to run multiple times; it updates allowed_mime_types via ON CONFLICT.
*/

DO $$ BEGIN
  -- Helper procedure to upsert bucket allowed types merging existing list with new entries
  PERFORM 1; -- no-op to satisfy DO block
END $$;

-- Update buckets to include HEIC/HEIF
UPDATE storage.buckets
SET allowed_mime_types = (
  SELECT ARRAY(SELECT DISTINCT unnest(coalesce(allowed_mime_types, ARRAY[]::text[]))
               UNION SELECT 'image/heic'
               UNION SELECT 'image/heif')
)
WHERE id IN (
  'band-images','event-images','gallery-images','team-images','faculty-images','guest-artist-images','hero-media','sponsor-logos','documents'
);
