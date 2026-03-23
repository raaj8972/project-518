-- 1. Hero Media V2 Table (Fixes 404 error)
CREATE TABLE IF NOT EXISTS public.hero_media_v2 (
    id TEXT PRIMARY KEY, -- page_key
    background_type TEXT DEFAULT 'image',
    image_url TEXT,
    mobile_image_url TEXT,
    video_url TEXT,
    mobile_video_url TEXT,
    poster_url TEXT,
    mobile_poster_url TEXT,
    overlay_color TEXT DEFAULT '#000000',
    overlay_opacity FLOAT DEFAULT 0.35,
    enabled BOOLEAN DEFAULT true,
    desktop_zoom FLOAT DEFAULT 1,
    desktop_offset_x FLOAT DEFAULT 0,
    desktop_offset_y FLOAT DEFAULT 0,
    mobile_zoom FLOAT DEFAULT 1,
    mobile_offset_x FLOAT DEFAULT 0,
    mobile_offset_y FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hero_media_v2 ENABLE ROW LEVEL SECURITY;

-- Allow public read access
DROP POLICY IF EXISTS "Allow public read access" ON public.hero_media_v2;
CREATE POLICY "Allow public read access" ON public.hero_media_v2 FOR SELECT USING (true);

-- Allow service role full access
DROP POLICY IF EXISTS "Allow service role full access" ON public.hero_media_v2;
CREATE POLICY "Allow service role full access" ON public.hero_media_v2 FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Seed 'home' if not exists
INSERT INTO public.hero_media_v2 (id, enabled) VALUES ('home', true) ON CONFLICT (id) DO NOTHING;


-- 2. Storage Policies for 'avatars' (Fixes "Bucket not found" error during upload)
-- Note: 'Bucket not found' in the frontend often happens when the user doesn't have 
-- permission to identify/access the bucket metadata during the upload process.

-- Ensure the bucket is public
UPDATE storage.buckets SET public = true WHERE id = 'avatars';

-- Allow any user (even anon) to upload to the avatars bucket
-- In a production environment, you should restrict this to authenticated users 
-- and specific paths, but we are prioritizing fixing the connection first.
DROP POLICY IF EXISTS "Allow public upload to avatars" ON storage.objects;
CREATE POLICY "Allow public upload to avatars" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow public select from avatars" ON storage.objects;
CREATE POLICY "Allow public select from avatars" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow public update to avatars" ON storage.objects;
CREATE POLICY "Allow public update to avatars" 
ON storage.objects FOR UPDATE 
TO public 
USING (bucket_id = 'avatars');
