/*
  # Storage Bucket Policies Setup

  1. Storage Buckets
    - Creates required storage buckets if they don't exist
    - `guest-artist-images` - For guest artist profile images
    - `guest-artist-videos` - For guest artist videos
    - `event-images` - For event images
    - `gallery-images` - For gallery images
    - `band-images` - For band member images
    - `team-images` - For core team member images
    - `faculty-images` - For faculty head images

  2. Security Policies
    - Allow public read access to all buckets
    - Allow authenticated users to upload files
    - Allow authenticated users to update/delete files
*/

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('guest-artist-images', 'guest-artist-images', true),
  ('guest-artist-videos', 'guest-artist-videos', true),
  ('event-images', 'event-images', true),
  ('gallery-images', 'gallery-images', true),
  ('band-images', 'band-images', true),
  ('team-images', 'team-images', true),
  ('faculty-images', 'faculty-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to all buckets
CREATE POLICY "Public read access for guest-artist-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'guest-artist-images');

CREATE POLICY "Public read access for guest-artist-videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'guest-artist-videos');

CREATE POLICY "Public read access for event-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'event-images');

CREATE POLICY "Public read access for gallery-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'gallery-images');

CREATE POLICY "Public read access for band-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'band-images');

CREATE POLICY "Public read access for team-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'team-images');

CREATE POLICY "Public read access for faculty-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'faculty-images');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload to guest-artist-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'guest-artist-images');

CREATE POLICY "Authenticated users can upload to guest-artist-videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'guest-artist-videos');

CREATE POLICY "Authenticated users can upload to event-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can upload to gallery-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'gallery-images');

CREATE POLICY "Authenticated users can upload to band-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'band-images');

CREATE POLICY "Authenticated users can upload to team-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'team-images');

CREATE POLICY "Authenticated users can upload to faculty-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'faculty-images');

-- Allow authenticated users to update files
CREATE POLICY "Authenticated users can update guest-artist-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'guest-artist-images');

CREATE POLICY "Authenticated users can update guest-artist-videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'guest-artist-videos');

CREATE POLICY "Authenticated users can update event-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can update gallery-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'gallery-images');

CREATE POLICY "Authenticated users can update band-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'band-images');

CREATE POLICY "Authenticated users can update team-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'team-images');

CREATE POLICY "Authenticated users can update faculty-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'faculty-images');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete from guest-artist-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'guest-artist-images');

CREATE POLICY "Authenticated users can delete from guest-artist-videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'guest-artist-videos');

CREATE POLICY "Authenticated users can delete from event-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can delete from gallery-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'gallery-images');

CREATE POLICY "Authenticated users can delete from band-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'band-images');

CREATE POLICY "Authenticated users can delete from team-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'team-images');

CREATE POLICY "Authenticated users can delete from faculty-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'faculty-images');