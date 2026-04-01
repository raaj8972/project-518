-- Fix RLS policies for site_settings to allow Admins to save changes
DO $$ 
BEGIN
    -- Ensure RLS is enabled
    ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

    -- Policy for public read
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'site_settings' AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" ON public.site_settings
            FOR SELECT USING (true);
    END IF;

    -- Policy for authenticated update
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'site_settings' AND policyname = 'Allow authenticated update'
    ) THEN
        CREATE POLICY "Allow authenticated update" ON public.site_settings
            FOR UPDATE TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;

    -- Policy for authenticated insert (required for upsert)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'site_settings' AND policyname = 'Allow authenticated insert'
    ) THEN
        CREATE POLICY "Allow authenticated insert" ON public.site_settings
            FOR INSERT TO authenticated
            WITH CHECK (true);
    END IF;
END $$;
