/*
  # Add participant type to auditions and memberships tables

  1. Table Updates
    - Add `participant_type` column to `auditions` table
    - Add `participant_type` column to `memberships` table
  
  2. Data Migration
    - Set default value for existing records
    - Add NOT NULL constraint after setting defaults
*/

-- Add participant_type to auditions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auditions' AND column_name = 'participant_type'
  ) THEN
    ALTER TABLE auditions ADD COLUMN participant_type text DEFAULT '1st Year';
    
    -- Update existing records to have a default value
    UPDATE auditions SET participant_type = '1st Year' WHERE participant_type IS NULL;
    
    -- Make the column NOT NULL after setting defaults
    ALTER TABLE auditions ALTER COLUMN participant_type SET NOT NULL;
  END IF;
END $$;

-- Add participant_type to memberships table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memberships' AND column_name = 'participant_type'
  ) THEN
    ALTER TABLE memberships ADD COLUMN participant_type text DEFAULT '1st Year';
    
    -- Update existing records to have a default value
    UPDATE memberships SET participant_type = '1st Year' WHERE participant_type IS NULL;
    
    -- Make the column NOT NULL after setting defaults
    ALTER TABLE memberships ALTER COLUMN participant_type SET NOT NULL;
  END IF;
END $$;