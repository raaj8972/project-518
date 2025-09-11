/*
  # Create homepage settings table

  1. New Tables
    - `homepage_settings`
      - `id` (integer, primary key, default 1)
      - `hero_media_url` (text, nullable)
      - `hero_media_type` (text, default 'image')
      - `hero_title` (text, default 'RICORRENZA')
      - `hero_subtitle` (text, default 'Experience the Future')
      - `hero_description` (text, default 'Experience the future of Healthcare, Technology, and Creativity')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `homepage_settings` table
    - Add policy for public read access
    - Add policy for authenticated users to update
*/

CREATE TABLE IF NOT EXISTS homepage_settings (
  id integer PRIMARY KEY DEFAULT 1,
  hero_media_url text,
  hero_media_type text DEFAULT 'image' CHECK (hero_media_type IN ('image', 'video')),
  hero_title text DEFAULT 'RICORRENZA',
  hero_subtitle text DEFAULT 'Experience the Future',
  hero_description text DEFAULT 'Experience the future of Healthcare, Technology, and Creativity',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE homepage_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to homepage_settings"
  ON homepage_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update homepage_settings"
  ON homepage_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert homepage_settings"
  ON homepage_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default settings
INSERT INTO homepage_settings (id, hero_media_url, hero_media_type, hero_title, hero_subtitle, hero_description)
VALUES (
  1,
  'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'image',
  'RICORRENZA',
  'Experience the Future',
  'Experience the future of Healthcare, Technology, and Creativity'
)
ON CONFLICT (id) DO NOTHING;