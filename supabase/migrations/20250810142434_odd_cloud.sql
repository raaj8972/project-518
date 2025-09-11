/*
  # Add category field to band members

  1. Changes
    - Add `category` column to `band_members` table
    - Set default category as 'Vocals'
    - Update existing records to have a default category

  2. Categories
    - Vocals (Singers, Lead Vocals, Backup Vocals)
    - Instruments (Guitar, Bass, Drums, Piano, etc.)
    - Production (Sound Engineer, Producer, DJ)
    - Performance (Dancer, Performer, Visual Artist)
*/

-- Add category column to band_members table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'band_members' AND column_name = 'category'
  ) THEN
    ALTER TABLE band_members ADD COLUMN category text DEFAULT 'Vocals' NOT NULL;
  END IF;
END $$;

-- Update existing records to have a default category
UPDATE band_members 
SET category = 'Vocals' 
WHERE category IS NULL OR category = '';