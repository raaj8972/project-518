/*
  # Create social media settings table

  1. New Tables
    - `social_media_settings` - Stores Instagram and YouTube links with enable/disable flags

  2. Security
    - Enable RLS on social_media_settings table
    - Add policies for public read access and admin write access

  3. Features
    - Instagram and YouTube URL management
    - Enable/disable toggles for each platform
    - Singleton pattern with fixed id=1
*/

-- Create social_media_settings table
CREATE TABLE IF NOT EXISTS social_media_settings (
  id integer PRIMARY KEY DEFAULT 1,
  instagram_url text,
  instagram_enabled boolean DEFAULT true,
  youtube_url text,
  youtube_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE social_media_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access to social_media_settings" ON social_media_settings;
DROP POLICY IF EXISTS "Allow authenticated users to insert social_media_settings" ON social_media_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update social_media_settings" ON social_media_settings;
DROP POLICY IF EXISTS "Allow authenticated users to delete social_media_settings" ON social_media_settings;

-- Create policies
CREATE POLICY "Allow public read access to social_media_settings"
  ON social_media_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert social_media_settings"
  ON social_media_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update social_media_settings"
  ON social_media_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete social_media_settings"
  ON social_media_settings
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert default settings row
INSERT INTO social_media_settings (id, instagram_enabled, youtube_enabled)
VALUES (1, true, true)
ON CONFLICT (id) DO NOTHING;