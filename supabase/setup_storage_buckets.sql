
-- 1. Create buckets if they don't exist
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES 
        ('band-images', 'band-images', true),
        ('event-images', 'event-images', true),
        ('pdf-watermarks', 'pdf-watermarks', true),
        ('public-content', 'public-content', true),
        ('registration-photos', 'registration-photos', true),
        ('sponsor-logos', 'sponsor-logos', true),
        ('team-images', 'team-images', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
END $$;

-- 2. Enable RLS on storage.objects (usually already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. DROP existing policies for these buckets to avoid conflicts
DO $$
DECLARE
    bucket_name TEXT;
    buckets_list TEXT[] := ARRAY['band-images', 'event-images', 'pdf-watermarks', 'public-content', 'registration-photos', 'sponsor-logos', 'team-images'];
BEGIN
    FOREACH bucket_name IN ARRAY buckets_list
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public Read Access %I" ON storage.objects', bucket_name);
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated Insert %I" ON storage.objects', bucket_name);
        EXECUTE format('DROP POLICY IF EXISTS "Anon Insert %I" ON storage.objects', bucket_name);
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated Update %I" ON storage.objects', bucket_name);
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated Delete %I" ON storage.objects', bucket_name);
    END LOOP;
END $$;

-- 4. Create common policies for each bucket
DO $$
DECLARE
    bucket_name TEXT;
    buckets_list TEXT[] := ARRAY['band-images', 'event-images', 'pdf-watermarks', 'public-content', 'registration-photos', 'sponsor-logos', 'team-images'];
BEGIN
    FOREACH bucket_name IN ARRAY buckets_list
    LOOP
        -- SELECT: Allow public read
        EXECUTE format('
            CREATE POLICY "Public Read Access %I" ON storage.objects
            FOR SELECT TO public USING (bucket_id = %L)', bucket_name, bucket_name);

        -- INSERT: Allow authenticated users
        EXECUTE format('
            CREATE POLICY "Authenticated Insert %I" ON storage.objects
            FOR INSERT TO authenticated WITH CHECK (bucket_id = %L)', bucket_name, bucket_name);

        -- INSERT: Allow anonymous users (needed for some public forms)
        EXECUTE format('
            CREATE POLICY "Anon Insert %I" ON storage.objects
            FOR INSERT TO anon WITH CHECK (bucket_id = %L)', bucket_name, bucket_name);

        -- UPDATE: Allow authenticated users
        EXECUTE format('
            CREATE POLICY "Authenticated Update %I" ON storage.objects
            FOR UPDATE TO authenticated USING (bucket_id = %L)', bucket_name, bucket_name);

        -- DELETE: Allow authenticated users
        EXECUTE format('
            CREATE POLICY "Authenticated Delete %I" ON storage.objects
            FOR DELETE TO authenticated USING (bucket_id = %L)', bucket_name, bucket_name);
    END LOOP;
END $$;
