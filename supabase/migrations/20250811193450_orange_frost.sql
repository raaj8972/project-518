/*
  # Add featured column to sponsors table

  1. Schema Changes
    - Add `featured` column to `sponsors` table with default value false
    - This allows sponsors to be marked as featured for homepage display

  2. Data Migration
    - All existing sponsors will have featured = false by default
    - Admins can then mark specific sponsors as featured through the admin panel
*/

-- Add featured column to sponsors table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsors' AND column_name = 'featured'
  ) THEN
    ALTER TABLE sponsors ADD COLUMN featured boolean DEFAULT false;
  END IF;
END $$;