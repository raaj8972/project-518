/*
  # Create faculty heads table

  1. New Tables
    - `faculty_heads`
      - `id` (integer, primary key)
      - `name` (text, required)
      - `title` (text, required)
      - `image` (text, required)
      - `description` (text, required)
      - `achievements` (text array, default empty)
      - `order` (integer, for display ordering)
      - `enabled` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `faculty_heads` table
    - Add policy for public read access
    - Add policy for authenticated users to manage faculty heads
*/

CREATE TABLE IF NOT EXISTS faculty_heads (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text NOT NULL,
  title text NOT NULL,
  image text NOT NULL,
  description text NOT NULL,
  achievements text[] DEFAULT '{}',
  order_position integer DEFAULT 0,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE faculty_heads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to faculty_heads"
  ON faculty_heads
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true);

CREATE POLICY "Allow authenticated users to insert faculty_heads"
  ON faculty_heads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update faculty_heads"
  ON faculty_heads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete faculty_heads"
  ON faculty_heads
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert default faculty head
INSERT INTO faculty_heads (name, title, image, description, achievements, order_position, enabled) VALUES (
  'Dr. Priya Sharma',
  'Festival Director & Department Head',
  'https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg?auto=compress&cs=tinysrgb&w=400',
  'Leading RICORRENZA 2025 with over 15 years of experience in medical education and innovation. Dr. Sharma has been instrumental in transforming medical college festivals into platforms for future healthcare leaders.',
  ARRAY[
    'Published 50+ research papers in medical education',
    'Recipient of Excellence in Teaching Award 2023',
    'Pioneer in integrating technology with medical training',
    'Mentor to 200+ medical students and residents'
  ],
  1,
  true
) ON CONFLICT DO NOTHING;