-- Migration: Harmonize Annual Sports with General Events
-- Description: Adds standard registration and settings columns to annual_sports tables

-- Update annual_sports_events
ALTER TABLE annual_sports_events
ADD COLUMN IF NOT EXISTS registration_participant_types text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS registration_participant_quotas jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS registration_timer_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS registration_opens_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS registration_closes_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS registration_default_mode text DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS registration_mode_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS team_min_members integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS team_max_members integer DEFAULT NULL;

-- Update annual_sports_registrations
ALTER TABLE annual_sports_registrations
ADD COLUMN IF NOT EXISTS college text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS participant_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_team_registration boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS team_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS team_members jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_members integer DEFAULT 1;

-- Migration of existing data
UPDATE annual_sports_registrations
SET participant_type = year
WHERE participant_type IS NULL AND year IS NOT NULL;

UPDATE annual_sports_registrations
SET college = department
WHERE college IS NULL AND department IS NOT NULL;
