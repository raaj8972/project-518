/*
  # Add visible column to events table

  1. Changes
    - Add `visible` column to `events` table with default value `true`
    - This column allows events to be hidden/shown without deleting them

  2. Security
    - No changes to RLS policies needed as existing policies cover the new column
*/

-- Add visible column to events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'visible'
  ) THEN
    ALTER TABLE events ADD COLUMN visible boolean DEFAULT true;
  END IF;
END $$;