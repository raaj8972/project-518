/*
  # Add is_head column to core_team_members table

  1. Changes
    - Add `is_head` column to `core_team_members` table with default false
    - This allows marking team members as committee heads

  2. Security
    - No changes to existing RLS policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'core_team_members' AND column_name = 'is_head'
  ) THEN
    ALTER TABLE core_team_members ADD COLUMN is_head boolean DEFAULT false;
  END IF;
END $$;