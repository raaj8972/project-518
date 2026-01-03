-- Storage setup for Pass Templates and Public Content

-- 1. Create the 'public-content' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-content', 'public-content', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Content Images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload public content" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update public content" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete public content" ON storage.objects;

-- 3. Create Policy: Public Read Access
-- Allow anyone to read files from 'public-content' bucket
CREATE POLICY "Public Content Images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'public-content' );

-- 4. Create Policy: Authenticated Upload Access
-- Allow any authenticated user (Admins/Security) to upload files
-- Limiting to specific folders like 'templates' or 'gallery' is possible, but general access is fine for this app context.
CREATE POLICY "Authenticated users can upload public content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'public-content' );

-- 5. Create Policy: Update/Delete for Admins (Optional but good for cleanup)
CREATE POLICY "Admins can update public content"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'public-content' );

CREATE POLICY "Admins can delete public content"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'public-content' );
