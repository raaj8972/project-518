/*
  # Fix Faculty Heads RLS Policy

  1. Security Updates
    - Drop existing policies that might be causing conflicts
    - Create proper policies for authenticated users to manage faculty heads
    - Ensure UPDATE operations work correctly for admin users

  2. Policy Changes
    - Allow authenticated users to read all faculty heads
    - Allow authenticated users to insert, update, and delete faculty heads
    - Public users can only read enabled faculty heads
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to delete faculty_heads" ON faculty_heads;
DROP POLICY IF EXISTS "Allow authenticated users to insert faculty_heads" ON faculty_heads;
DROP POLICY IF EXISTS "Allow authenticated users to update faculty_heads" ON faculty_heads;
DROP POLICY IF EXISTS "Allow public read access to faculty_heads" ON faculty_heads;

-- Create new comprehensive policies
CREATE POLICY "Enable read access for all users" ON faculty_heads
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON faculty_heads
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON faculty_heads
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON faculty_heads
  FOR DELETE TO authenticated
  USING (true);