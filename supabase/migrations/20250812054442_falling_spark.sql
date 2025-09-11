/*
  # Add sponsor logo to homepage settings

  1. Schema Changes
    - Add `sponsor_logo_url` column to `homepage_settings` table
    - Add `sponsor_logo_enabled` column to control visibility
    - Add `sponsor_logo_text` column for optional text/name

  2. Security
    - Existing RLS policies will apply to new columns
*/

DO $$
BEGIN
  -- Add sponsor logo URL column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_logo_url'
  ) THEN
    ALTER TABLE homepage_settings ADD COLUMN sponsor_logo_url text;
  END IF;

  -- Add sponsor logo enabled column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_logo_enabled'
  ) THEN
    ALTER TABLE homepage_settings ADD COLUMN sponsor_logo_enabled boolean DEFAULT false;
  END IF;

  -- Add sponsor logo text column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_logo_text'
  ) THEN
    ALTER TABLE homepage_settings ADD COLUMN sponsor_logo_text text DEFAULT 'Powered by';
  END IF;
END $$;