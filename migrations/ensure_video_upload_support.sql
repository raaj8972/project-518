-- Ensure event-images bucket exists and supports videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  83886080, -- 80MB
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-m4v'
  ]
)
ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  public = EXCLUDED.public;

-- Ensure RLS policies exist for event-images bucket
DROP POLICY IF EXISTS "Public read event-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert event-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update event-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete event-images" ON storage.objects;

CREATE POLICY "Public read event-images" 
  ON storage.objects FOR SELECT 
  TO public 
  USING (bucket_id = 'event-images');

CREATE POLICY "Auth insert event-images" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Auth update event-images" 
  ON storage.objects FOR UPDATE 
  TO authenticated 
  USING (bucket_id = 'event-images') 
  WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Auth delete event-images" 
  ON storage.objects FOR DELETE 
  TO authenticated 
  USING (bucket_id = 'event-images');
