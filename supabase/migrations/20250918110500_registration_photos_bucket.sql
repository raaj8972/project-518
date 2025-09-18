/*
  # Registration Photos Bucket

  - Creates a dedicated bucket `registration-photos` for participant photos uploaded from the public registration form.
  - Public read so admins can export links and PDFs can fetch thumbnails.
  - Allow anonymous inserts so users without auth can upload during registration.
  - Limit mime types to common images and a reasonable size (5MB) where supported.
*/

-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'registration-photos', 'registration-photos', true, 5242880,
       ARRAY['image/png','image/jpeg','image/jpg','image/gif','image/webp']
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'registration-photos'
);

-- Policies
-- Public can read objects from this bucket
CREATE POLICY IF NOT EXISTS "Public read registration-photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'registration-photos');

-- Anonymous (and authenticated) users can upload to this bucket
CREATE POLICY IF NOT EXISTS "Anon insert registration-photos"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'registration-photos');

-- Allow only owners (broadly) to update/delete if authenticated; public shouldn't update/delete
CREATE POLICY IF NOT EXISTS "Auth update registration-photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'registration-photos')
  WITH CHECK (bucket_id = 'registration-photos');

CREATE POLICY IF NOT EXISTS "Auth delete registration-photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'registration-photos');
