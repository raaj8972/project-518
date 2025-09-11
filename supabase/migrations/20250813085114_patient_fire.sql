/*
  # Add foreign key constraint for contact_sections

  1. Foreign Key Relationship
    - Add foreign key constraint from `contact_sections.sponsorship_settings_id` to `sponsorship_settings.id`
    - Enable CASCADE delete to maintain data integrity
  
  2. Schema Update
    - This will allow Supabase to properly recognize the relationship
    - Fixes the schema cache error when querying related data
*/

-- Add foreign key constraint if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contact_sections_sponsorship_settings_id_fkey'
    AND table_name = 'contact_sections'
  ) THEN
    ALTER TABLE public.contact_sections 
    ADD CONSTRAINT contact_sections_sponsorship_settings_id_fkey 
    FOREIGN KEY (sponsorship_settings_id) 
    REFERENCES public.sponsorship_settings(id) 
    ON DELETE CASCADE;
  END IF;
END $$;