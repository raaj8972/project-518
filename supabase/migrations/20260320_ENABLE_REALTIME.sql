-- FINAL STEP: ENABLE REALTIME FOR GOVERNANCE TABLES (IDEMPOTENT)
-- This version checks if tables are already in the publication to avoid errors.

DO $$
BEGIN
    -- 1. Add 'shoutouts' if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'shoutouts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE shoutouts;
    END IF;

    -- 2. Add 'site_settings' if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'site_settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE site_settings;
    END IF;
END $$;

-- 3. Ensure Anyone can read site_settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'site_settings' AND policyname = 'Anyone can read site_settings'
    ) THEN
        ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY; -- Just in case
        CREATE POLICY "Anyone can read site_settings" ON site_settings
        FOR SELECT USING (true);
    END IF;
END $$;
