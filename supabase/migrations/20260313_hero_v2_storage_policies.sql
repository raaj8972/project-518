-- Fix Storage RLS Policies for hero_v2 bucket
-- This ensures the Hero Media Studio V2 can upload and manage media files safely.

-- 1. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('hero_v2', 'hero_v2', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow public read access to all objects in hero_v2
DROP POLICY IF EXISTS "Public Read hero_v2" ON storage.objects;
CREATE POLICY "Public Read hero_v2" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'hero_v2');

-- 3. Allow public (anon) insertion
DROP POLICY IF EXISTS "Public Insert hero_v2" ON storage.objects;
CREATE POLICY "Public Insert hero_v2"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'hero_v2');

-- 4. Allow public (anon) updates
DROP POLICY IF EXISTS "Public Update hero_v2" ON storage.objects;
CREATE POLICY "Public Update hero_v2"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'hero_v2');

-- 5. Allow public (anon) deletion
DROP POLICY IF EXISTS "Public Delete hero_v2" ON storage.objects;
CREATE POLICY "Public Delete hero_v2"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'hero_v2');
