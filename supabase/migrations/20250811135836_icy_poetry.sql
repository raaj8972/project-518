/*
  # Fix guest_artists id column auto-increment

  1. Database Changes
    - Update `guest_artists` table `id` column to use auto-increment (GENERATED ALWAYS AS IDENTITY)
    - This will automatically generate unique IDs for new guest artist records

  2. Security
    - No changes to existing RLS policies
    - Maintains current security configuration
*/

-- Update the id column to use auto-increment
ALTER TABLE guest_artists 
ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;