/*
  # Create Storage Buckets and Policies

  1. Storage Buckets
    - `event-images` - For event photos
    - `gallery-images` - For gallery photos  
    - `sponsor-logos` - For sponsor logos

  2. Storage Policies
    - Allow public read access to all buckets
    - Allow authenticated users to upload/update/delete files
    - Secure file management for admin users

  3. RLS Policies
    - Enable proper access control for file operations
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('event-images', 'event-images', true),
  ('gallery-images', 'gallery-images', true),
  ('sponsor-logos', 'sponsor-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for event-images bucket
CREATE POLICY "Public read access for event images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can upload event images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update event images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'event-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete event images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'event-images' AND auth.role() = 'authenticated');

-- Create storage policies for gallery-images bucket
CREATE POLICY "Public read access for gallery images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery-images');

CREATE POLICY "Authenticated users can upload gallery images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gallery-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update gallery images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'gallery-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete gallery images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'gallery-images' AND auth.role() = 'authenticated');

-- Create storage policies for sponsor-logos bucket
CREATE POLICY "Public read access for sponsor logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sponsor-logos');

CREATE POLICY "Authenticated users can upload sponsor logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'sponsor-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update sponsor logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'sponsor-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete sponsor logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'sponsor-logos' AND auth.role() = 'authenticated');