/*
  # Create auditions and memberships tables

  1. New Tables
    - `auditions`
      - `id` (uuid, primary key)
      - `full_name` (text, not null)
      - `email` (text, not null)
      - `phone` (text, not null)
      - `instrument_role` (text, not null)
      - `experience_motivation` (text)
      - `portfolio_link` (text, nullable)
      - `status` (text, default 'pending')
      - `created_at` (timestamp)
    - `memberships`
      - `id` (uuid, primary key)
      - `full_name` (text, not null)
      - `email` (text, not null)
      - `phone` (text, not null)
      - `college_department` (text, not null)
      - `motivation` (text)
      - `status` (text, default 'pending')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for public insert and authenticated read/update
*/

-- Create auditions table
CREATE TABLE IF NOT EXISTS auditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  instrument_role text NOT NULL,
  experience_motivation text DEFAULT '',
  portfolio_link text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT auditions_status_check CHECK (status IN ('pending', 'reviewed', 'contacted'))
);

-- Create memberships table
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  college_department text NOT NULL,
  motivation text DEFAULT '',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT memberships_status_check CHECK (status IN ('pending', 'reviewed', 'accepted'))
);

-- Enable RLS
ALTER TABLE auditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Auditions policies
CREATE POLICY "Allow public to create auditions"
  ON auditions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public to read auditions"
  ON auditions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update auditions"
  ON auditions
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete auditions"
  ON auditions
  FOR DELETE
  TO authenticated
  USING (true);

-- Memberships policies
CREATE POLICY "Allow public to create memberships"
  ON memberships
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public to read memberships"
  ON memberships
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update memberships"
  ON memberships
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete memberships"
  ON memberships
  FOR DELETE
  TO authenticated
  USING (true);