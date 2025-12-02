/* Migration: Add missing site_settings columns
   Run this in your Supabase SQL editor */

-- Add events_poster_fit column (for event poster display mode)
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS events_poster_fit TEXT DEFAULT 'contain' CHECK (events_poster_fit IN ('contain', 'cover'));

-- Add coming_soon_ended_text column (text shown when countdown ends)
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS coming_soon_ended_text TEXT;

-- Add homepage_hero_title column (quick edit for hero title)
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS homepage_hero_title TEXT;

-- Add registration_institution_visible column (show/hide institution field)
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS registration_institution_visible BOOLEAN DEFAULT true;

-- Add registration_institution_optional column (make institution field optional)
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS registration_institution_optional BOOLEAN DEFAULT false;

-- Add registration_participant_types column (define participant categories)
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS registration_participant_types JSONB DEFAULT '["1st Year","2nd Year","3rd Year","4th Year"]'::jsonb;

-- Add registration_participant_quotas column (set limits per participant type)
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS registration_participant_quotas JSONB DEFAULT '{}'::jsonb;

-- Add registration_form_fields column (custom form fields configuration)
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS registration_form_fields JSONB;

-- Add registration_photo_default_label column
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS registration_photo_default_label TEXT DEFAULT 'Participant Photo';

-- Add registration_photo_default_required column
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS registration_photo_default_required BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN site_settings.events_poster_fit IS 'Display mode for event posters: contain (no cropping) or cover (fill card)';
COMMENT ON COLUMN site_settings.coming_soon_ended_text IS 'Text shown after coming soon countdown ends';
COMMENT ON COLUMN site_settings.homepage_hero_title IS 'Quick override for homepage hero title';
COMMENT ON COLUMN site_settings.registration_institution_visible IS 'Show institution field in registration forms';
COMMENT ON COLUMN site_settings.registration_institution_optional IS 'Make institution field optional in registration';
COMMENT ON COLUMN site_settings.registration_participant_types IS 'Array of participant type options';
COMMENT ON COLUMN site_settings.registration_participant_quotas IS 'Object mapping participant types to quota limits';
COMMENT ON COLUMN site_settings.registration_form_fields IS 'Custom form fields configuration';

/* Verify columns were added successfully */
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'site_settings' 
  AND column_name IN (
    'events_poster_fit',
    'coming_soon_ended_text',
    'homepage_hero_title',
    'registration_institution_visible',
    'registration_institution_optional',
    'registration_participant_types',
    'registration_participant_quotas',
    'registration_form_fields',
    'registration_photo_default_label',
    'registration_photo_default_required'
  )
ORDER BY column_name;
