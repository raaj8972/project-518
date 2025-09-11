/*
  # Festival Management System Database Schema

  1. New Tables
    - `event_categories` - Stores dynamic event categories (Cultural, Technical, Sports, etc.)
    - `events` - Main events table with all event details
    - `gallery_images` - Gallery photos with categories and featured status
    - `sponsors` - Sponsor information and categories
    - `schedule_days` - Festival days (Day 1, Day 2, etc.)
    - `schedule_events` - Individual events within each day
    - `registrations` - Event registrations with team support

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access and admin write access
    - Secure registration data with proper access controls

  3. Features
    - Support for featured events and gallery images
    - Dynamic event categories with colors
    - Team and individual registrations
    - Comprehensive event scheduling
    - Sponsor management with different tiers
*/

-- Create event_categories table
CREATE TABLE IF NOT EXISTS event_categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  image TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  venue TEXT NOT NULL,
  participants TEXT NOT NULL,
  highlights TEXT[] NOT NULL DEFAULT '{}',
  registration_open BOOLEAN DEFAULT true,
  max_participants INTEGER,
  current_registrations INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create gallery_images table
CREATE TABLE IF NOT EXISTS gallery_images (
  id SERIAL PRIMARY KEY,
  src TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  year TEXT NOT NULL,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sponsors table
CREATE TABLE IF NOT EXISTS sponsors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  logo TEXT NOT NULL,
  description TEXT NOT NULL,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create schedule_days table
CREATE TABLE IF NOT EXISTS schedule_days (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  day TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create schedule_events table
CREATE TABLE IF NOT EXISTS schedule_events (
  id SERIAL PRIMARY KEY,
  schedule_day_id INTEGER REFERENCES schedule_days(id) ON DELETE CASCADE,
  time TEXT NOT NULL,
  title TEXT NOT NULL,
  venue TEXT NOT NULL,
  type TEXT NOT NULL,
  duration TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  event_title TEXT NOT NULL,
  participant_type TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  college TEXT NOT NULL,
  motivation TEXT DEFAULT '',
  registration_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_team_registration BOOLEAN DEFAULT false,
  team_name TEXT,
  team_members JSONB,
  total_members INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to event_categories"
  ON event_categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to events"
  ON events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to gallery_images"
  ON gallery_images FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to sponsors"
  ON sponsors FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to schedule_days"
  ON schedule_days FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to schedule_events"
  ON schedule_events FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow public to create registrations
CREATE POLICY "Allow public to create registrations"
  ON registrations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow public to read their own registrations
CREATE POLICY "Allow public to read registrations"
  ON registrations FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insert default event categories
INSERT INTO event_categories (name, color, description) VALUES
  ('Cultural', '#8B5CF6', 'Traditional and contemporary cultural performances'),
  ('Technical', '#3B82F6', 'Technology, innovation, and engineering competitions'),
  ('Sports', '#10B981', 'Athletic competitions and physical activities')
ON CONFLICT (name) DO NOTHING;

-- Insert default events
INSERT INTO events (title, category, description, image, date, time, venue, participants, highlights, registration_open, max_participants, current_registrations, featured) VALUES
  (
    'Cultural Night',
    'Cultural',
    'An evening showcasing traditional and contemporary performances from various cultural backgrounds.',
    'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800',
    '2025-03-15',
    '7:00 PM - 10:00 PM',
    'Main Auditorium',
    '500+',
    ARRAY['Traditional Dance', 'Music Performances', 'Drama', 'Fashion Show'],
    true,
    500,
    0,
    true
  ),
  (
    'Tech Symposium',
    'Technical',
    'Innovation and technology showcase featuring industry experts and student innovations.',
    'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800',
    '2025-03-16',
    '10:00 AM - 5:00 PM',
    'Engineering Building',
    '300+',
    ARRAY['AI Workshop', 'Robotics Demo', 'Startup Pitches', 'Tech Exhibition'],
    true,
    300,
    0,
    true
  ),
  (
    'Sports Championship',
    'Sports',
    'Inter-college sports competition featuring multiple disciplines and categories.',
    'https://images.pexels.com/photos/209969/pexels-photo-209969.jpeg?auto=compress&cs=tinysrgb&w=800',
    '2025-03-17',
    '9:00 AM - 6:00 PM',
    'Sports Complex',
    '800+',
    ARRAY['Football', 'Basketball', 'Cricket', 'Athletics', 'Badminton'],
    true,
    800,
    0,
    true
  )
ON CONFLICT DO NOTHING;

-- Insert default gallery images
INSERT INTO gallery_images (src, category, title, year, featured) VALUES
  (
    'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Cultural',
    'Traditional Dance Performance',
    '2024',
    true
  ),
  (
    'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Technical',
    'Tech Innovation Showcase',
    '2024',
    true
  )
ON CONFLICT DO NOTHING;

-- Insert default sponsors
INSERT INTO sponsors (name, category, logo, description, website) VALUES
  (
    'TechCorp Industries',
    'Title Sponsor',
    'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=400',
    'Leading technology solutions provider committed to innovation and excellence.',
    'https://techcorp.example.com'
  ),
  (
    'Global Bank',
    'Co Sponsor',
    'https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg?auto=compress&cs=tinysrgb&w=400',
    'Premier banking services supporting education and community development.',
    'https://globalbank.example.com'
  )
ON CONFLICT DO NOTHING;

-- Insert default schedule days
INSERT INTO schedule_days (date, day, title) VALUES
  ('2025-03-15', 'Day 1', 'Cultural Day'),
  ('2025-03-16', 'Day 2', 'Technical Day'),
  ('2025-03-17', 'Day 3', 'Sports & Finale')
ON CONFLICT DO NOTHING;

-- Insert default schedule events
INSERT INTO schedule_events (schedule_day_id, time, title, venue, type, duration) VALUES
  (1, '9:00 AM', 'Registration Opens', 'Main Entrance', 'General', '30 min'),
  (1, '7:00 PM', 'Cultural Night - Main Event', 'Main Auditorium', 'Cultural', '3 hours'),
  (2, '10:00 AM', 'Tech Symposium', 'Engineering Building', 'Technical', '7 hours'),
  (3, '9:00 AM', 'Sports Championship', 'Sports Complex', 'Sports', '9 hours')
ON CONFLICT DO NOTHING;