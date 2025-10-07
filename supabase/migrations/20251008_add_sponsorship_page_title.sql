/*
  Migration: add page_title to sponsorship_settings
  - Adds a text column `page_title` if it does not exist
  - Seeds existing rows with a sensible default
  - Idempotent: safe to run multiple times
*/

DO $$
BEGIN
  -- Add page_title if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsorship_settings' AND column_name = 'page_title'
  ) THEN
    ALTER TABLE sponsorship_settings ADD COLUMN page_title TEXT DEFAULT 'OUR SPONSORS';
  END IF;
END $$;

-- Seed existing record(s) with a default if currently null
UPDATE sponsorship_settings
SET page_title = COALESCE(page_title, 'OUR SPONSORS'),
    updated_at = now()
WHERE id IS NOT NULL;

-- Optional: drop the column default if you prefer explicit values only
-- ALTER TABLE sponsorship_settings ALTER COLUMN page_title DROP DEFAULT;
