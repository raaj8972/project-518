-- Create missing buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('gallery', 'gallery', true),
  ('sports-images', 'sports-images', true)
ON CONFLICT (id) DO NOTHING;

-- Fix Storage RLS Policies for ANON users
-- This allows the frontend (using Firebase Auth) to upload files to Supabase

CREATE POLICY "Allow public select on all buckets"
ON storage.objects FOR SELECT
TO public
USING (true);

-- Gallery bucket policies
DROP POLICY IF EXISTS "Allow anon insert to gallery" ON storage.objects;
CREATE POLICY "Allow anon insert to gallery"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'gallery');

DROP POLICY IF EXISTS "Allow anon update to gallery" ON storage.objects;
CREATE POLICY "Allow anon update to gallery"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'gallery');

DROP POLICY IF EXISTS "Allow anon delete from gallery" ON storage.objects;
CREATE POLICY "Allow anon delete from gallery"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'gallery');

-- Sports-images bucket policies
DROP POLICY IF EXISTS "Allow anon insert to sports-images" ON storage.objects;
CREATE POLICY "Allow anon insert to sports-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'sports-images');

DROP POLICY IF EXISTS "Allow anon update to sports-images" ON storage.objects;
CREATE POLICY "Allow anon update to sports-images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'sports-images');

DROP POLICY IF EXISTS "Allow anon delete from sports-images" ON storage.objects;
CREATE POLICY "Allow anon delete from sports-images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'sports-images');

-- Event-images bucket policies
DROP POLICY IF EXISTS "Allow anon insert to event-images" ON storage.objects;
CREATE POLICY "Allow anon insert to event-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'event-images');

-- Gallery-images bucket policies
DROP POLICY IF EXISTS "Allow anon insert to gallery-images" ON storage.objects;
CREATE POLICY "Allow anon insert to gallery-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'gallery-images');

-- Fix Database RLS Policies for Sports Tables
-- Allow public (anon) access for ALL operations so the frontend can sync data

-- Sports Seasons
DROP POLICY IF EXISTS "Public can view sports seasons" ON public.sports_seasons;
DROP POLICY IF EXISTS "Admins can insert sports seasons" ON public.sports_seasons;
DROP POLICY IF EXISTS "Admins can update sports seasons" ON public.sports_seasons;
DROP POLICY IF EXISTS "Admins can delete sports seasons" ON public.sports_seasons;

CREATE POLICY "Allow public all sports_seasons" ON public.sports_seasons
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Sports Teams
DROP POLICY IF EXISTS "Public can view sports teams" ON public.sports_teams;
DROP POLICY IF EXISTS "Admins can insert sports teams" ON public.sports_teams;
DROP POLICY IF EXISTS "Admins can update sports teams" ON public.sports_teams;
DROP POLICY IF EXISTS "Admins can delete sports teams" ON public.sports_teams;

CREATE POLICY "Allow public all sports_teams" ON public.sports_teams
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Sports Players
DROP POLICY IF EXISTS "Public can view sports players" ON public.sports_players;
DROP POLICY IF EXISTS "Admins can insert sports players" ON public.sports_players;
DROP POLICY IF EXISTS "Admins can update sports players" ON public.sports_players;
DROP POLICY IF EXISTS "Admins can delete sports players" ON public.sports_players;

CREATE POLICY "Allow public all sports_players" ON public.sports_players
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Sports Matches
DROP POLICY IF EXISTS "Public can view sports matches" ON public.sports_matches;
DROP POLICY IF EXISTS "Admins can insert sports matches" ON public.sports_matches;
DROP POLICY IF EXISTS "Admins can update sports matches" ON public.sports_matches;
DROP POLICY IF EXISTS "Admins can delete sports matches" ON public.sports_matches;

CREATE POLICY "Allow public all sports_matches" ON public.sports_matches
  FOR ALL TO public USING (true) WITH CHECK (true);
