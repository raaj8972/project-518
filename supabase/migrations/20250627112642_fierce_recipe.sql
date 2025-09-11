/*
  # Add RLS policies for events table

  1. Security Updates
    - Add INSERT policy for authenticated users to create events
    - Add UPDATE policy for authenticated users to modify events  
    - Add DELETE policy for authenticated users to remove events

  This enables full CRUD operations on the events table for authenticated users,
  which is required for the admin dashboard functionality.
*/

-- Add INSERT policy for events
CREATE POLICY "Allow authenticated users to insert events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add UPDATE policy for events
CREATE POLICY "Allow authenticated users to update events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add DELETE policy for events
CREATE POLICY "Allow authenticated users to delete events"
  ON events
  FOR DELETE
  TO authenticated
  USING (true);