/*
  # Add relationship between sponsorship_settings and contact_sections

  1. Schema Changes
    - Add `sponsorship_settings_id` column to `contact_sections` table
    - Add foreign key constraint linking to `sponsorship_settings.id`
    - Set default value to 1 for existing records

  2. Data Migration
    - Update existing contact_sections to reference sponsorship_settings id 1
    - Ensure sponsorship_settings has a record with id 1

  3. Security
    - No changes to existing RLS policies needed
*/

-- First ensure we have a sponsorship_settings record with id 1
INSERT INTO sponsorship_settings (id, brochure_title, intro_text, call_to_action_text)
VALUES (1, 'Download Sponsorship Brochure', 'RICORRENZA 2025 is made possible by the generous support of our sponsors.', 'Interested in Sponsoring?')
ON CONFLICT (id) DO NOTHING;

-- Add sponsorship_settings_id column to contact_sections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_sections' AND column_name = 'sponsorship_settings_id'
  ) THEN
    ALTER TABLE contact_sections ADD COLUMN sponsorship_settings_id integer NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'contact_sections_sponsorship_settings_id_fkey'
  ) THEN
    ALTER TABLE contact_sections 
    ADD CONSTRAINT contact_sections_sponsorship_settings_id_fkey 
    FOREIGN KEY (sponsorship_settings_id) REFERENCES sponsorship_settings(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update existing contact_sections to reference sponsorship_settings id 1
UPDATE contact_sections SET sponsorship_settings_id = 1 WHERE sponsorship_settings_id IS NULL;