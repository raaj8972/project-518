/*
  # Create sponsorship packages table

  1. New Tables
    - `sponsorship_packages`
      - `id` (integer, primary key)
      - `tier` (text, sponsorship tier name)
      - `price` (text, price display)
      - `color` (text, gradient color classes)
      - `icon` (text, lucide icon name)
      - `benefits` (text array, list of benefits)
      - `order_position` (integer, display order)
      - `enabled` (boolean, visibility)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `sponsorship_packages` table
    - Add policies for public read access
    - Add policies for authenticated users to manage packages

  3. Initial Data
    - Insert default sponsorship packages
*/

CREATE TABLE IF NOT EXISTS sponsorship_packages (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  tier text NOT NULL,
  price text NOT NULL,
  color text NOT NULL DEFAULT 'from-gray-500 to-gray-600',
  icon text NOT NULL DEFAULT 'Award',
  benefits text[] NOT NULL DEFAULT '{}',
  order_position integer NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sponsorship_packages ENABLE ROW LEVEL SECURITY;

-- Policies for sponsorship_packages
CREATE POLICY "Allow public read access to sponsorship_packages"
  ON sponsorship_packages
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true);

CREATE POLICY "Allow authenticated users to insert sponsorship_packages"
  ON sponsorship_packages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update sponsorship_packages"
  ON sponsorship_packages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete sponsorship_packages"
  ON sponsorship_packages
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert default sponsorship packages
INSERT INTO sponsorship_packages (tier, price, color, icon, benefits, order_position) VALUES
(
  'Title Sponsor',
  '₹200000',
  'from-yellow-400 to-yellow-600',
  'Crown',
  ARRAY[
    'Recognition as the power sponsor of the event',
    'Recognition of the company logo on the main banner',
    'Recognition of the company logo on the stage backdrop',
    'Recognition of the company in fest posters'
  ],
  1
),
(
  'Co Sponsor',
  '₹30,000+',
  'from-blue-400 to-blue-600',
  'Star',
  ARRAY[
    'Premium booth location',
    'Event program advertisement',
    'Stage announcements',
    'Social media coverage',
    'Newsletter inclusion'
  ],
  2
),
(
  'Platinum Sponsor',
  '₹20,000+',
  'from-gray-300 to-gray-500',
  'Gem',
  ARRAY[
    'Premium booth location',
    'Event program advertisement',
    'Stage announcements',
    'Social media coverage',
    'Newsletter inclusion'
  ],
  3
),
(
  'Gold Sponsor',
  '₹10,000+',
  'from-yellow-300 to-yellow-500',
  'Award',
  ARRAY[
    'Standard booth space',
    'Program listing',
    'Website recognition',
    'Welcome reception invite',
    'Digital acknowledgment'
  ],
  4
);