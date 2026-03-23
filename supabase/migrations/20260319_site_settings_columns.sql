-- Add missing site_settings columns that the frontend expects
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS homepage_hero_title  text,
  ADD COLUMN IF NOT EXISTS coming_soon_ended_text text,
  ADD COLUMN IF NOT EXISTS registration_institution_visible  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS registration_institution_optional boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_participant_types    jsonb,
  ADD COLUMN IF NOT EXISTS chat_locked                       boolean NOT NULL DEFAULT false;
