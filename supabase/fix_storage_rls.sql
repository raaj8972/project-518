-- Allow public (anon) uploads for AI Scanner buckets
-- Run this in the Supabase SQL Editor

-- 1. Band Images (Homebound)
DROP POLICY IF EXISTS "Allow anon insert to band-images" ON storage.objects;
CREATE POLICY "Allow anon insert to band-images" ON storage.objects 
FOR INSERT TO public WITH CHECK (bucket_id = 'band-images');

DROP POLICY IF EXISTS "Allow anon update to band-images" ON storage.objects;
CREATE POLICY "Allow anon update to band-images" ON storage.objects 
FOR UPDATE TO public USING (bucket_id = 'band-images');

-- 2. Sponsor Logos
DROP POLICY IF EXISTS "Allow anon insert to sponsor-logos" ON storage.objects;
CREATE POLICY "Allow anon insert to sponsor-logos" ON storage.objects 
FOR INSERT TO public WITH CHECK (bucket_id = 'sponsor-logos');

DROP POLICY IF EXISTS "Allow anon update to sponsor-logos" ON storage.objects;
CREATE POLICY "Allow anon update to sponsor-logos" ON storage.objects 
FOR UPDATE TO public USING (bucket_id = 'sponsor-logos');

-- 3. Team Images (Core Team)
DROP POLICY IF EXISTS "Allow anon insert to team-images" ON storage.objects;
CREATE POLICY "Allow anon insert to team-images" ON storage.objects 
FOR INSERT TO public WITH CHECK (bucket_id = 'team-images');

DROP POLICY IF EXISTS "Allow anon update to team-images" ON storage.objects;
CREATE POLICY "Allow anon update to team-images" ON storage.objects 
FOR UPDATE TO public USING (bucket_id = 'team-images');

-- 4. Event Images
DROP POLICY IF EXISTS "Allow anon insert to event-images" ON storage.objects;
CREATE POLICY "Allow anon insert to event-images" ON storage.objects 
FOR INSERT TO public WITH CHECK (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Allow anon update to event-images" ON storage.objects;
CREATE POLICY "Allow anon update to event-images" ON storage.objects 
FOR UPDATE TO public USING (bucket_id = 'event-images');
