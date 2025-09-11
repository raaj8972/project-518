/*
  # Add rules field to events table

  1. Changes
    - Add `rules` column to `events` table as TEXT array
    - This allows admins to set multiple rules for each event

  2. Security
    - No changes to RLS policies needed as existing policies cover the new column
*/

-- Add rules column to events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'rules'
  ) THEN
    ALTER TABLE events ADD COLUMN rules TEXT[] DEFAULT '{}';
  END IF;
END $$;