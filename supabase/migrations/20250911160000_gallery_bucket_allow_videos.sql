/*
  # Allow video uploads (MP4 & MOV) in gallery-images bucket

  1. Updates bucket constraints to include common image + video mime types
  2. Increases file size limit to 60MB (was unrestricted) for safety
  3. Supports background hero video uploads including QuickTime (video/quicktime)
*/

-- Update allowed mime types and size limit for gallery-images bucket
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime'
],
file_size_limit = 62914560 -- 60MB
WHERE id = 'gallery-images';

-- Safety: ensure bucket exists (idempotent insert if missing)
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-images', 'gallery-images', true)
ON CONFLICT (id) DO NOTHING;

-- Note: existing RLS policies already allow public read & authenticated writes.