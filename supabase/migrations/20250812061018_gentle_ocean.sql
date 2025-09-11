/*
  # Update homepage settings for multiple sponsor logos

  1. Schema Changes
    - Add sponsor_logos JSONB column to homepage_settings table
    - Add sponsor_section_enabled boolean column
    - Add sponsor_section_text text column
    - Remove old single sponsor logo columns (sponsor_logo_url, sponsor_logo_enabled, sponsor_logo_text)

  2. Data Migration
    - Migrate existing single sponsor logo data to new multiple logos format
    - Set default values for new columns

  3. Security
    - Maintain existing RLS policies
*/

-- Add new columns for multiple sponsor logos
DO $$
BEGIN
  -- Add sponsor_logos JSONB column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_logos'
  ) THEN
    ALTER TABLE homepage_settings ADD COLUMN sponsor_logos JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add sponsor_section_enabled column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_section_enabled'
  ) THEN
    ALTER TABLE homepage_settings ADD COLUMN sponsor_section_enabled BOOLEAN DEFAULT false;
  END IF;

  -- Add sponsor_section_text column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_section_text'
  ) THEN
    ALTER TABLE homepage_settings ADD COLUMN sponsor_section_text TEXT DEFAULT 'Powered by';
  END IF;
END $$;

-- Migrate existing single sponsor logo data to new format
DO $$
DECLARE
  existing_record RECORD;
  new_sponsor_logo JSONB;
BEGIN
  -- Check if there's existing data to migrate
  SELECT * INTO existing_record FROM homepage_settings WHERE id = 1;
  
  IF FOUND AND existing_record.sponsor_logo_url IS NOT NULL AND existing_record.sponsor_logo_url != '' THEN
    -- Create new sponsor logo object from existing data
    new_sponsor_logo := jsonb_build_object(
      'id', 'migrated_' || extract(epoch from now())::text,
      'name', 'Main Sponsor',
      'logo_url', existing_record.sponsor_logo_url,
      'website', '',
      'enabled', COALESCE(existing_record.sponsor_logo_enabled, false),
      'order', 1
    );
    
    -- Update the record with migrated data
    UPDATE homepage_settings 
    SET 
      sponsor_logos = jsonb_build_array(new_sponsor_logo),
      sponsor_section_enabled = COALESCE(existing_record.sponsor_logo_enabled, false),
      sponsor_section_text = COALESCE(existing_record.sponsor_logo_text, 'Powered by'),
      updated_at = now()
    WHERE id = 1;
  ELSE
    -- No existing data, just set defaults
    UPDATE homepage_settings 
    SET 
      sponsor_logos = '[]'::jsonb,
      sponsor_section_enabled = false,
      sponsor_section_text = 'Powered by',
      updated_at = now()
    WHERE id = 1;
  END IF;
  
  -- If no record exists, create one with defaults
  IF NOT FOUND THEN
    INSERT INTO homepage_settings (
      id,
      hero_media_url,
      hero_media_type,
      hero_title,
      hero_subtitle,
      hero_description,
      sponsor_logos,
      sponsor_section_enabled,
      sponsor_section_text,
      created_at,
      updated_at
    ) VALUES (
      1,
      NULL,
      'image',
      'RICORRENZA',
      'Experience the Future',
      'Experience the future of Healthcare, Technology, and Creativity',
      '[]'::jsonb,
      false,
      'Powered by',
      now(),
      now()
    );
  END IF;
END $$;

-- Remove old single sponsor logo columns after migration
DO $$
BEGIN
  -- Drop old columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_logo_url'
  ) THEN
    ALTER TABLE homepage_settings DROP COLUMN sponsor_logo_url;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_logo_enabled'
  ) THEN
    ALTER TABLE homepage_settings DROP COLUMN sponsor_logo_enabled;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_logo_text'
  ) THEN
    ALTER TABLE homepage_settings DROP COLUMN sponsor_logo_text;
  END IF;
END $$;