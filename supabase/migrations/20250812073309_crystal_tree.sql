/*
  # Create form settings table

  1. New Tables
    - `form_settings`
      - `id` (integer, primary key, default 1)
      - `audition_form_enabled` (boolean, default true)
      - `membership_form_enabled` (boolean, default true)
      - `audition_form_message` (text, optional message when disabled)
      - `membership_form_message` (text, optional message when disabled)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `form_settings` table
    - Add policy for public read access
    - Add policy for authenticated users to update settings

  3. Initial Data
    - Insert default settings record
*/

CREATE TABLE IF NOT EXISTS form_settings (
  id integer PRIMARY KEY DEFAULT 1,
  audition_form_enabled boolean DEFAULT true,
  membership_form_enabled boolean DEFAULT true,
  audition_form_message text DEFAULT 'Auditions are currently closed. Please check back later.',
  membership_form_message text DEFAULT 'Membership applications are currently closed. Please check back later.',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE form_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to form_settings"
  ON form_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update form_settings"
  ON form_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default settings
INSERT INTO form_settings (id, audition_form_enabled, membership_form_enabled)
VALUES (1, true, true)
ON CONFLICT (id) DO NOTHING;

-- Ensure grants complement RLS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE form_settings TO anon, authenticated;
GRANT UPDATE ON TABLE form_settings TO authenticated;