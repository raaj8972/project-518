/*
  # Add direction controls to homepage_settings

  1. Schema Changes
    - Add sponsors_belt_direction text (CHECK in ('left','right')) DEFAULT 'left'
    - Add committee_marquee_direction text (CHECK in ('left','right')) DEFAULT 'right'

  2. Safety
    - Guard with IF NOT EXISTS
    - Backfill id=1 with defaults if null
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsors_belt_direction'
  ) THEN
    ALTER TABLE homepage_settings
      ADD COLUMN sponsors_belt_direction text DEFAULT 'left' CHECK (sponsors_belt_direction IN ('left','right'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'committee_marquee_direction'
  ) THEN
    ALTER TABLE homepage_settings
      ADD COLUMN committee_marquee_direction text DEFAULT 'right' CHECK (committee_marquee_direction IN ('left','right'));
  END IF;

  UPDATE homepage_settings
  SET 
    sponsors_belt_direction = COALESCE(sponsors_belt_direction, 'left'),
    committee_marquee_direction = COALESCE(committee_marquee_direction, 'right'),
    updated_at = now()
  WHERE id = 1;
END $$;
