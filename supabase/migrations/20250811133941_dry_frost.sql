/*
  # Add guest artists table and storage setup

  1. New Tables
    - `guest_artists`
      - `id` (bigint, primary key)
      - `name` (text, artist name)
      - `title` (text, artist title/role)
      - `image` (text, profile image URL)
      - `video` (text, video URL)
      - `description` (text, artist description)
      - `specialty` (text, artist specialty)
      - `achievements` (text[], list of achievements)
      - `social_links` (jsonb, social media links)
      - `order_position` (integer, display order)
      - `enabled` (boolean, visibility toggle)
      - `is_featured` (boolean, featured on homepage)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `guest_artists` table
    - Add policies for public read access and authenticated user management

  3. Storage
    - Note: Create 'guest-artist-images' and 'guest-artist-videos' buckets manually in Supabase dashboard
*/

CREATE TABLE IF NOT EXISTS guest_artists (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  title text NOT NULL,
  image text NOT NULL,
  video text,
  description text NOT NULL,
  specialty text NOT NULL,
  achievements text[] DEFAULT '{}',
  social_links jsonb DEFAULT '{}',
  order_position integer DEFAULT 1,
  enabled boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE guest_artists ENABLE ROW LEVEL SECURITY;

-- Policies for guest_artists table
CREATE POLICY "Enable read access for all users"
  ON guest_artists
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON guest_artists
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON guest_artists
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
  ON guest_artists
  FOR DELETE
  TO authenticated
  USING (true);