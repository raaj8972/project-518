/*
  Migration: add sponsor_section_title and sponsor_section_subtitle to homepage_settings
  - Adds nullable text columns if they do not exist
  - Seeds existing row(s) with sensible defaults
  - This migration is idempotent and safe to run multiple times
*/

DO $$
BEGIN
  -- Add sponsor_section_title if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_section_title'
  ) THEN
    ALTER TABLE homepage_settings ADD COLUMN sponsor_section_title TEXT DEFAULT 'OUR PARTNERS';
  END IF;

  -- Add sponsor_section_subtitle if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_section_subtitle'
  ) THEN
    ALTER TABLE homepage_settings ADD COLUMN sponsor_section_subtitle TEXT DEFAULT 'Powered by industry leaders who believe in our vision';
  END IF;
END $$;

-- Seed existing record(s) with defaults if currently null
UPDATE homepage_settings
SET sponsor_section_title = COALESCE(sponsor_section_title, 'OUR PARTNERS'),
    sponsor_section_subtitle = COALESCE(sponsor_section_subtitle, 'Powered by industry leaders who believe in our vision'),
    updated_at = now()
WHERE id IS NOT NULL;

-- Optional: drop column defaults so future changes rely on explicit values (uncomment if desired)
-- ALTER TABLE homepage_settings ALTER COLUMN sponsor_section_title DROP DEFAULT;
-- ALTER TABLE homepage_settings ALTER COLUMN sponsor_section_subtitle DROP DEFAULT;
