/*
  # Fix RLS policies for core team tables

  1. Security Updates
    - Drop existing restrictive RLS policies on core_committees and core_team_members
    - Create new policies that allow authenticated users full CRUD access
    - Ensure admin dashboard can properly manage core team data

  2. Changes Made
    - Updated core_committees policies to allow authenticated users full access
    - Updated core_team_members policies to allow authenticated users full access
    - Maintained public read access for website visitors
*/

-- Drop existing policies for core_committees
DROP POLICY IF EXISTS "Allow authenticated users to delete core_committees" ON core_committees;
DROP POLICY IF EXISTS "Allow authenticated users to insert core_committees" ON core_committees;
DROP POLICY IF EXISTS "Allow authenticated users to update core_committees" ON core_committees;
DROP POLICY IF EXISTS "Allow public read access to core_committees" ON core_committees;

-- Drop existing policies for core_team_members
DROP POLICY IF EXISTS "Allow authenticated users to delete core_team_members" ON core_team_members;
DROP POLICY IF EXISTS "Allow authenticated users to insert core_team_members" ON core_team_members;
DROP POLICY IF EXISTS "Allow authenticated users to update core_team_members" ON core_team_members;
DROP POLICY IF EXISTS "Allow public read access to core_team_members" ON core_team_members;

-- Create new policies for core_committees
CREATE POLICY "Enable read access for all users" ON core_committees
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON core_committees
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON core_committees
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON core_committees
  FOR DELETE TO authenticated USING (true);

-- Create new policies for core_team_members
CREATE POLICY "Enable read access for all users" ON core_team_members
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON core_team_members
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON core_team_members
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON core_team_members
  FOR DELETE TO authenticated USING (true);