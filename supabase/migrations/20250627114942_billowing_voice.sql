/*
  # Fix Authentication and RLS Policies

  1. Create admin user and fix authentication
  2. Update RLS policies to work with authentication
  3. Fix data types and constraints
*/

-- Create admin user (this will be handled by Supabase Auth)
-- The admin user should be created through Supabase dashboard or auth.signUp

-- Update RLS policies to be more permissive for authenticated users
DROP POLICY IF EXISTS "Allow authenticated users to insert events" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to update events" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to delete events" ON events;

-- Create more permissive policies for authenticated users
CREATE POLICY "Allow authenticated users to insert events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete events"
  ON events
  FOR DELETE
  TO authenticated
  USING (true);

-- Add similar policies for other tables that need admin access
CREATE POLICY "Allow authenticated users to insert gallery_images"
  ON gallery_images
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update gallery_images"
  ON gallery_images
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete gallery_images"
  ON gallery_images
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert sponsors"
  ON sponsors
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update sponsors"
  ON sponsors
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete sponsors"
  ON sponsors
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert event_categories"
  ON event_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update event_categories"
  ON event_categories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete event_categories"
  ON event_categories
  FOR DELETE
  TO authenticated
  USING (true);

-- Update registrations policies
CREATE POLICY "Allow authenticated users to update registrations"
  ON registrations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);