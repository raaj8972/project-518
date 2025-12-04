/*
  # Add show_max_participants column to events table

  1. Changes
    - Add `show_max_participants` column to `events` table with default value `true`
    - This column controls whether to display the participant counter on event cards

  2. Security
    - No changes to RLS policies needed as existing policies cover the new column
*/

-- Add show_max_participants column to events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'show_max_participants'
  ) THEN
    ALTER TABLE events ADD COLUMN show_max_participants boolean DEFAULT true;
  END IF;
END $$;
