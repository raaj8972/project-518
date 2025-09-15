/*
  # Add animation speed controls to homepage_settings

  1. Schema Changes
    - Add sponsors_belt_speed_px_per_sec integer column (default 140)
    - Add committee_marquee_speed_px_per_sec integer column (default 75)

  2. Safety
    - Use IF NOT EXISTS guards so migration is idempotent
    - Backfill defaults on existing row id=1
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsors_belt_speed_px_per_sec'
  ) THEN
    ALTER TABLE homepage_settings
      ADD COLUMN sponsors_belt_speed_px_per_sec integer DEFAULT 140;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'committee_marquee_speed_px_per_sec'
  ) THEN
    ALTER TABLE homepage_settings
      ADD COLUMN committee_marquee_speed_px_per_sec integer DEFAULT 75;
  END IF;

  -- Backfill defaults for existing record
  UPDATE homepage_settings
  SET 
    sponsors_belt_speed_px_per_sec = COALESCE(sponsors_belt_speed_px_per_sec, 140),
    committee_marquee_speed_px_per_sec = COALESCE(committee_marquee_speed_px_per_sec, 75),
    updated_at = now()
  WHERE id = 1;
END $$;
