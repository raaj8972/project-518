/*
  # Fix sponsorship settings foreign key relationship

  1. Schema Updates
    - Ensure foreign key constraint exists between contact_sections and sponsorship_settings
    - Refresh schema cache by recreating the constraint if needed
  
  2. Data Integrity
    - Ensure sponsorship_settings record exists
    - Update any orphaned contact_sections records
*/

-- Ensure we have a sponsorship_settings record
INSERT INTO sponsorship_settings (id, brochure_title, intro_text, call_to_action_text)
VALUES (1, 'Download Sponsorship Brochure', 'RICORRENZA 2025 is made possible by the generous support of our sponsors.', 'Interested in Sponsoring?')
ON CONFLICT (id) DO NOTHING;

-- Update any contact_sections that might have NULL sponsorship_settings_id
UPDATE contact_sections 
SET sponsorship_settings_id = 1 
WHERE sponsorship_settings_id IS NULL;

-- Drop and recreate the foreign key constraint to refresh schema cache
ALTER TABLE contact_sections 
DROP CONSTRAINT IF EXISTS contact_sections_sponsorship_settings_id_fkey;

ALTER TABLE contact_sections 
ADD CONSTRAINT contact_sections_sponsorship_settings_id_fkey 
FOREIGN KEY (sponsorship_settings_id) 
REFERENCES sponsorship_settings(id) 
ON DELETE CASCADE;

-- Refresh the schema cache by analyzing the tables
ANALYZE sponsorship_settings;
ANALYZE contact_sections;