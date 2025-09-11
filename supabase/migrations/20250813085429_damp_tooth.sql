/*
  # Add social links to core team members

  1. Schema Changes
    - Add `social_links` column to `core_team_members` table
    - Column type: jsonb with default empty object
    - Allows storing Instagram, YouTube, Spotify links

  2. Security
    - No changes to existing RLS policies
    - Social links inherit existing permissions
*/

-- Add social_links column to core_team_members table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'core_team_members' AND column_name = 'social_links'
  ) THEN
    ALTER TABLE core_team_members 
    ADD COLUMN social_links jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;