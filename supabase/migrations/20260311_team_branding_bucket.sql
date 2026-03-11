-- Migration: Team Branding Storage Bucket
-- Creates a dedicated bucket for Team Logos, Leader Photos, and Player Photos.

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'team-branding', 'team-branding', true, 10485760, -- 10MB limit
       ARRAY['image/png','image/jpeg','image/jpg','image/gif','image/webp']
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'team-branding'
);

-- 2. Set up RLS Policies

-- Public can read objects from this bucket
DROP POLICY IF EXISTS "Public read team-branding" ON storage.objects;
CREATE POLICY "Public read team-branding"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'team-branding');

-- Anonymous (and authenticated) users can upload to this bucket for registrations
DROP POLICY IF EXISTS "Anon insert team-branding" ON storage.objects;
CREATE POLICY "Anon insert team-branding"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'team-branding');

-- Allow authenticated users (Admins) to manage (update/delete)
DROP POLICY IF EXISTS "Auth update team-branding" ON storage.objects;
CREATE POLICY "Auth update team-branding"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'team-branding')
  WITH CHECK (bucket_id = 'team-branding');

DROP POLICY IF EXISTS "Auth delete team-branding" ON storage.objects;
CREATE POLICY "Auth delete team-branding"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'team-branding');
