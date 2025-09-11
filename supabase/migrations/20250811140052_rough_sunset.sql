/*
  # Add featured sponsors functionality

  1. Schema Changes
    - Add `featured` column to `sponsors` table to mark sponsors for homepage display
    - Add `order_position` column to control display order of featured sponsors

  2. Security
    - Update existing RLS policies to include new columns
*/

-- Add featured and order_position columns to sponsors table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsors' AND column_name = 'featured'
  ) THEN
    ALTER TABLE sponsors ADD COLUMN featured boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsors' AND column_name = 'order_position'
  ) THEN
    ALTER TABLE sponsors ADD COLUMN order_position integer DEFAULT 1;
  END IF;
END $$;