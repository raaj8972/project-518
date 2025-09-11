/*
  # Add Social Media Settings

  1. New Table
    - `social_media_settings` - Store Instagram and YouTube links

  2. Security
    - Enable RLS on the table
    - Add policies for public read access and admin write access

  3. Features
    - Instagram and YouTube URL fields
    - Enabled/disabled toggles for each platform
    - Admin can edit through dashboard
*/

-- Create social_media_settings table
CREATE TABLE IF NOT EXISTS social_media_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  instagram_url TEXT,
  instagram_enabled BOOLEAN DEFAULT true,
  youtube_url TEXT,
  youtube_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE social_media_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to social_media_settings"
  ON social_media_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create policies for authenticated users (admin) write access
CREATE POLICY "Allow authenticated users to insert social_media_settings"
  ON social_media_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update social_media_settings"
  ON social_media_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete social_media_settings"
  ON social_media_settings FOR DELETE
  TO authenticated
  USING (true);

-- Insert default social media settings
INSERT INTO social_media_settings (id, instagram_enabled, youtube_enabled) VALUES
  (1, true, true)
ON CONFLICT (id) DO NOTHING;