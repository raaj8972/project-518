/*
  # Hero media storage bucket

  Provides dedicated bucket for homepage hero background images & videos.
  Allows MP4, MOV (QuickTime), WEBM plus standard image formats.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hero-media',
  'hero-media',
  true,
  83886080, -- 80MB limit
  ARRAY[
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Public read hero media" ON storage.objects
  FOR SELECT TO public
  USING ( bucket_id = 'hero-media');

-- Authenticated write policies
CREATE POLICY "Auth insert hero media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK ( bucket_id = 'hero-media');

CREATE POLICY "Auth update hero media" ON storage.objects
  FOR UPDATE TO authenticated
  USING ( bucket_id = 'hero-media')
  WITH CHECK ( bucket_id = 'hero-media');

CREATE POLICY "Auth delete hero media" ON storage.objects
  FOR DELETE TO authenticated
  USING ( bucket_id = 'hero-media');