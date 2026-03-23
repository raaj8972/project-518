
-- 1. Create buckets (Safe approach)
-- This tries to insert and ignores if already exists
-- If this fails, the buckets should be created manually in the UI
DO $$
BEGIN
    -- Create band-images
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('band-images', 'band-images', true)
    ON CONFLICT (id) DO NOTHING;

    -- Create event-images
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('event-images', 'event-images', true)
    ON CONFLICT (id) DO NOTHING;

    -- Create pdf-watermarks
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('pdf-watermarks', 'pdf-watermarks', true)
    ON CONFLICT (id) DO NOTHING;

    -- Create public-content
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('public-content', 'public-content', true)
    ON CONFLICT (id) DO NOTHING;

    -- Create registration-photos
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('registration-photos', 'registration-photos', true)
    ON CONFLICT (id) DO NOTHING;

    -- Create sponsor-logos
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('sponsor-logos', 'sponsor-logos', true)
    ON CONFLICT (id) DO NOTHING;

    -- Create team-images
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('team-images', 'team-images', true)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- 2. Try to set policies individually
-- If you still get "must be owner of table objects", 
-- please use the Supabase Dashboard UI to create these policies.

-- SELECT: Public Read Access
DROP POLICY IF EXISTS "Public Read Access All" ON storage.objects;
CREATE POLICY "Public Read Access All" ON storage.objects
FOR SELECT TO public USING (true);

-- INSERT: Authenticated Uploads
DROP POLICY IF EXISTS "Authenticated Uploads All" ON storage.objects;
CREATE POLICY "Authenticated Uploads All" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (true);

-- INSERT/UPDATE: Allow anon for public-facing AI scanners
-- This is needed for the frontend AI Scanner to work without auth
DROP POLICY IF EXISTS "Anon Uploads All" ON storage.objects;
CREATE POLICY "Anon Uploads All" ON storage.objects
FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Update All" ON storage.objects;
CREATE POLICY "Anon Update All" ON storage.objects
FOR UPDATE TO anon USING (true);

-- Note: The policies above are broad (allow any bucket). 
-- This is often easier to apply and less likely to hit ownership issues
-- than multiple per-bucket policies in a DO block.
