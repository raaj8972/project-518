/*
  # Create Sponsorship Management Tables

  1. New Tables
    - `sponsorship_settings` - Global sponsorship page settings
    - `contact_sections` - Dynamic contact sections for sponsors page

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access and admin write access

  3. Features
    - Customizable contact sections with icons and ordering
    - Brochure upload functionality
    - Editable intro text and call-to-action text
*/

-- Create sponsorship_settings table
CREATE TABLE IF NOT EXISTS sponsorship_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  brochure_url TEXT,
  brochure_title TEXT NOT NULL DEFAULT 'Download Sponsorship Brochure',
  intro_text TEXT NOT NULL DEFAULT 'RICORRENZA 2025 is made possible by the generous support of our sponsors.',
  call_to_action_text TEXT NOT NULL DEFAULT 'Interested in Sponsoring?',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contact_sections table
CREATE TABLE IF NOT EXISTS contact_sections (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('email', 'phone', 'address', 'custom')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Mail',
  enabled BOOLEAN DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE sponsorship_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_sections ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to sponsorship_settings"
  ON sponsorship_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to contact_sections"
  ON contact_sections FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create policies for authenticated users (admin) write access
CREATE POLICY "Allow authenticated users to insert sponsorship_settings"
  ON sponsorship_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update sponsorship_settings"
  ON sponsorship_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete sponsorship_settings"
  ON sponsorship_settings FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert contact_sections"
  ON contact_sections FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update contact_sections"
  ON contact_sections FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete contact_sections"
  ON contact_sections FOR DELETE
  TO authenticated
  USING (true);

-- Insert default sponsorship settings
INSERT INTO sponsorship_settings (id, brochure_title, intro_text, call_to_action_text) VALUES
  (1, 'Download Sponsorship Brochure', 'RICORRENZA 2025 is made possible by the generous support of our sponsors. We thank all our partners for their commitment to education, innovation, and community development.', 'Interested in Sponsoring?')
ON CONFLICT (id) DO NOTHING;

-- Insert default contact sections
INSERT INTO contact_sections (type, title, content, icon, enabled, "order") VALUES
  ('email', 'Email Us', 'sponsors@ricorrenza2025.edu', 'Mail', true, 1),
  ('phone', 'Call Us', '+1 (555) 123-4567', 'Phone', true, 2),
  ('address', 'Visit Us', 'College Campus, Event Office', 'MapPin', true, 3)
ON CONFLICT DO NOTHING;