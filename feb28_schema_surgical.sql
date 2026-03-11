-- ========= Source Migration: 20250627112241_proud_surf.sql =========
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
DROP POLICY IF EXISTS "Allow public read access to event_categories" ON event_categories;
CREATE POLICY "Allow public read access to event_categories"
  ON event_categories FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public read access to events" ON events;
CREATE POLICY "Allow public read access to events"
  ON events FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public read access to gallery_images" ON gallery_images;
CREATE POLICY "Allow public read access to gallery_images"
  ON gallery_images FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public read access to sponsors" ON sponsors;
CREATE POLICY "Allow public read access to sponsors"
  ON sponsors FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public read access to schedule_days" ON schedule_days;
CREATE POLICY "Allow public read access to schedule_days"
  ON schedule_days FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public read access to schedule_events" ON schedule_events;
CREATE POLICY "Allow public read access to schedule_events"
  ON schedule_events FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow public to create registrations
DROP POLICY IF EXISTS "Allow public to create registrations" ON registrations;
CREATE POLICY "Allow public to create registrations"
  ON registrations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow public to read their own registrations
DROP POLICY IF EXISTS "Allow public to read registrations" ON registrations;
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
INSERT INTO events (title, category, description, image, date, time, venue, participants, highlights, registration_open, max_participants, current_registrations, featured)
SELECT title, category, description, image, date, time, venue, participants, highlights, registration_open, max_participants, current_registrations, featured
FROM (VALUES
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
) AS t(title, category, description, image, date, time, venue, participants, highlights, registration_open, max_participants, current_registrations, featured)
WHERE NOT EXISTS (
  SELECT 1 FROM events WHERE events.title = t.title AND events.date = t.date
);

-- Insert default gallery images
INSERT INTO gallery_images (src, category, title, year, featured)
SELECT src, category, title, year, featured
FROM (VALUES
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
) AS t(src, category, title, year, featured)
WHERE NOT EXISTS (
  SELECT 1 FROM gallery_images WHERE gallery_images.src = t.src
);

-- Insert default sponsors
INSERT INTO sponsors (name, category, logo, description, website)
SELECT name, category, logo, description, website
FROM (VALUES
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
) AS t(name, category, logo, description, website)
WHERE NOT EXISTS (
  SELECT 1 FROM sponsors WHERE sponsors.name = t.name
);

-- Insert default schedule days
INSERT INTO schedule_days (id, date, day, title) VALUES
  (1, '2025-03-15', 'Day 1', 'Cultural Day'),
  (2, '2025-03-16', 'Day 2', 'Technical Day'),
  (3, '2025-03-17', 'Day 3', 'Sports & Finale')
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  day = EXCLUDED.day,
  title = EXCLUDED.title;

-- Sync sequence
SELECT setval('schedule_days_id_seq', COALESCE((SELECT MAX(id) FROM schedule_days), 1));

-- Insert default schedule events
INSERT INTO schedule_events (schedule_day_id, time, title, venue, type, duration)
SELECT schedule_day_id, time, title, venue, type, duration
FROM (VALUES
  (1, '9:00 AM', 'Registration Opens', 'Main Entrance', 'General', '30 min'),
  (1, '7:00 PM', 'Cultural Night - Main Event', 'Main Auditorium', 'Cultural', '3 hours'),
  (2, '10:00 AM', 'Tech Symposium', 'Engineering Building', 'Technical', '7 hours'),
  (3, '9:00 AM', 'Sports Championship', 'Sports Complex', 'Sports', '9 hours')
) AS t(schedule_day_id, time, title, venue, type, duration)
WHERE NOT EXISTS (
  SELECT 1 FROM schedule_events WHERE schedule_events.schedule_day_id = t.schedule_day_id AND schedule_events.title = t.title
);

-- ========= Source Migration: 20250627112642_fierce_recipe.sql =========
/*
  # Add RLS policies for events table

  1. Security Updates
    - Add INSERT policy for authenticated users to create events
    - Add UPDATE policy for authenticated users to modify events  
    - Add DELETE policy for authenticated users to remove events

  This enables full CRUD operations on the events table for authenticated users,
  which is required for the admin dashboard functionality.
*/

-- Add INSERT policy for events
DROP POLICY IF EXISTS "Allow authenticated users to insert events" ON events;
CREATE POLICY "Allow authenticated users to insert events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add UPDATE policy for events
DROP POLICY IF EXISTS "Allow authenticated users to update events" ON events;
CREATE POLICY "Allow authenticated users to update events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add DELETE policy for events
DROP POLICY IF EXISTS "Allow authenticated users to delete events" ON events;
CREATE POLICY "Allow authenticated users to delete events"
  ON events
  FOR DELETE
  TO authenticated
  USING (true);

-- ========= Source Migration: 20250627114942_billowing_voice.sql =========
/*
  # Fix Authentication and RLS Policies

  1. Create admin user and fix authentication
  2. Update RLS policies to work with authentication
  3. Fix data types and constraints
*/

-- Create admin user (this will be handled by Supabase Auth)
-- The admin user should be created through Supabase dashboard or auth.signUp

-- Update RLS policies to be more permissive for authenticated users

-- Create more permissive policies for authenticated users
DROP POLICY IF EXISTS "Allow authenticated users to insert events" ON events;
CREATE POLICY "Allow authenticated users to insert events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update events" ON events;
CREATE POLICY "Allow authenticated users to update events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete events" ON events;
CREATE POLICY "Allow authenticated users to delete events"
  ON events
  FOR DELETE
  TO authenticated
  USING (true);

-- Add similar policies for other tables that need admin access
DROP POLICY IF EXISTS "Allow authenticated users to insert gallery_images" ON gallery_images;
CREATE POLICY "Allow authenticated users to insert gallery_images"
  ON gallery_images
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update gallery_images" ON gallery_images;
CREATE POLICY "Allow authenticated users to update gallery_images"
  ON gallery_images
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete gallery_images" ON gallery_images;
CREATE POLICY "Allow authenticated users to delete gallery_images"
  ON gallery_images
  FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert sponsors" ON sponsors;
CREATE POLICY "Allow authenticated users to insert sponsors"
  ON sponsors
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update sponsors" ON sponsors;
CREATE POLICY "Allow authenticated users to update sponsors"
  ON sponsors
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete sponsors" ON sponsors;
CREATE POLICY "Allow authenticated users to delete sponsors"
  ON sponsors
  FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert event_categories" ON event_categories;
CREATE POLICY "Allow authenticated users to insert event_categories"
  ON event_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update event_categories" ON event_categories;
CREATE POLICY "Allow authenticated users to update event_categories"
  ON event_categories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete event_categories" ON event_categories;
CREATE POLICY "Allow authenticated users to delete event_categories"
  ON event_categories
  FOR DELETE
  TO authenticated
  USING (true);

-- Update registrations policies
DROP POLICY IF EXISTS "Allow authenticated users to update registrations" ON registrations;
CREATE POLICY "Allow authenticated users to update registrations"
  ON registrations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ========= Source Migration: 20250628034550_wispy_dew.sql =========
/*
  # Create Storage Buckets and Policies

  1. Storage Buckets
    - `event-images` - For event photos
    - `gallery-images` - For gallery photos  
    - `sponsor-logos` - For sponsor logos

  2. Storage Policies
    - Allow public read access to all buckets
    - Allow authenticated users to upload/update/delete files
    - Secure file management for admin users

  3. RLS Policies
    - Enable proper access control for file operations
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('event-images', 'event-images', true),
  ('gallery-images', 'gallery-images', true),
  ('sponsor-logos', 'sponsor-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for event-images bucket
DROP POLICY IF EXISTS "Public read access for event images" ON storage.objects;
CREATE POLICY "Public read access for event images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
CREATE POLICY "Authenticated users can upload event images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update event images" ON storage.objects;
CREATE POLICY "Authenticated users can update event images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'event-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete event images" ON storage.objects;
CREATE POLICY "Authenticated users can delete event images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'event-images' AND auth.role() = 'authenticated');

-- Create storage policies for gallery-images bucket
DROP POLICY IF EXISTS "Public read access for gallery images" ON storage.objects;
CREATE POLICY "Public read access for gallery images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery-images');

DROP POLICY IF EXISTS "Authenticated users can upload gallery images" ON storage.objects;
CREATE POLICY "Authenticated users can upload gallery images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gallery-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update gallery images" ON storage.objects;
CREATE POLICY "Authenticated users can update gallery images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'gallery-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete gallery images" ON storage.objects;
CREATE POLICY "Authenticated users can delete gallery images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'gallery-images' AND auth.role() = 'authenticated');

-- Create storage policies for sponsor-logos bucket
DROP POLICY IF EXISTS "Public read access for sponsor logos" ON storage.objects;
CREATE POLICY "Public read access for sponsor logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sponsor-logos');

DROP POLICY IF EXISTS "Authenticated users can upload sponsor logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload sponsor logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'sponsor-logos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update sponsor logos" ON storage.objects;
CREATE POLICY "Authenticated users can update sponsor logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'sponsor-logos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete sponsor logos" ON storage.objects;
CREATE POLICY "Authenticated users can delete sponsor logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'sponsor-logos' AND auth.role() = 'authenticated');

-- ========= Source Migration: 20250628101247_rustic_queen.sql =========
/*
  # Add RLS policies for schedule management

  1. Security Updates
    - Add INSERT, UPDATE, DELETE policies for authenticated users on schedule_days
    - Add INSERT, UPDATE, DELETE policies for authenticated users on schedule_events

  This enables full CRUD operations on the schedule tables for authenticated users,
  which is required for the admin dashboard schedule management functionality.
*/

-- Add policies for schedule_days table
DROP POLICY IF EXISTS "Allow authenticated users to insert schedule_days" ON schedule_days;
CREATE POLICY "Allow authenticated users to insert schedule_days"
  ON schedule_days
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update schedule_days" ON schedule_days;
CREATE POLICY "Allow authenticated users to update schedule_days"
  ON schedule_days
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete schedule_days" ON schedule_days;
CREATE POLICY "Allow authenticated users to delete schedule_days"
  ON schedule_days
  FOR DELETE
  TO authenticated
  USING (true);

-- Add policies for schedule_events table
DROP POLICY IF EXISTS "Allow authenticated users to insert schedule_events" ON schedule_events;
CREATE POLICY "Allow authenticated users to insert schedule_events"
  ON schedule_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update schedule_events" ON schedule_events;
CREATE POLICY "Allow authenticated users to update schedule_events"
  ON schedule_events
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete schedule_events" ON schedule_events;
CREATE POLICY "Allow authenticated users to delete schedule_events"
  ON schedule_events
  FOR DELETE
  TO authenticated
  USING (true);

-- ========= Source Migration: 20250628104843_azure_scene.sql =========
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
DROP POLICY IF EXISTS "Allow public read access to sponsorship_settings" ON sponsorship_settings;
CREATE POLICY "Allow public read access to sponsorship_settings"
  ON sponsorship_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public read access to contact_sections" ON contact_sections;
CREATE POLICY "Allow public read access to contact_sections"
  ON contact_sections FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create policies for authenticated users (admin) write access
DROP POLICY IF EXISTS "Allow authenticated users to insert sponsorship_settings" ON sponsorship_settings;
CREATE POLICY "Allow authenticated users to insert sponsorship_settings"
  ON sponsorship_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update sponsorship_settings" ON sponsorship_settings;
CREATE POLICY "Allow authenticated users to update sponsorship_settings"
  ON sponsorship_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete sponsorship_settings" ON sponsorship_settings;
CREATE POLICY "Allow authenticated users to delete sponsorship_settings"
  ON sponsorship_settings FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert contact_sections" ON contact_sections;
CREATE POLICY "Allow authenticated users to insert contact_sections"
  ON contact_sections FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update contact_sections" ON contact_sections;
CREATE POLICY "Allow authenticated users to update contact_sections"
  ON contact_sections FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete contact_sections" ON contact_sections;
CREATE POLICY "Allow authenticated users to delete contact_sections"
  ON contact_sections FOR DELETE
  TO authenticated
  USING (true);

-- Insert default sponsorship settings
INSERT INTO sponsorship_settings (id, brochure_title, intro_text, call_to_action_text) VALUES
  (1, 'Download Sponsorship Brochure', 'RICORRENZA 2025 is made possible by the generous support of our sponsors. We thank all our partners for their commitment to education, innovation, and community development.', 'Interested in Sponsoring?')
ON CONFLICT (id) DO NOTHING;

-- Insert default contact sections
INSERT INTO contact_sections (type, title, content, icon, enabled, "order")
SELECT type, title, content, icon, enabled, "order"
FROM (VALUES
  ('email', 'Email Us', 'sponsors@ricorrenza2025.edu', 'Mail', true, 1),
  ('phone', 'Call Us', '+1 (555) 123-4567', 'Phone', true, 2),
  ('address', 'Visit Us', 'College Campus, Event Office', 'MapPin', true, 3)
) AS t(type, title, content, icon, enabled, "order")
WHERE NOT EXISTS (
  SELECT 1 FROM contact_sections WHERE contact_sections.type = t.type
);

-- ========= Source Migration: 20250628105013_turquoise_night.sql =========
/*
  # Add relationship between sponsorship_settings and contact_sections

  1. Schema Changes
    - Add `sponsorship_settings_id` column to `contact_sections` table
    - Add foreign key constraint linking to `sponsorship_settings.id`
    - Set default value to 1 for existing records

  2. Data Migration
    - Update existing contact_sections to reference sponsorship_settings id 1
    - Ensure sponsorship_settings has a record with id 1

  3. Security
    - No changes to existing RLS policies needed
*/

-- First ensure we have a sponsorship_settings record with id 1
INSERT INTO sponsorship_settings (id, brochure_title, intro_text, call_to_action_text)
VALUES (1, 'Download Sponsorship Brochure', 'RICORRENZA 2025 is made possible by the generous support of our sponsors.', 'Interested in Sponsoring?')
ON CONFLICT (id) DO NOTHING;

-- Add sponsorship_settings_id column to contact_sections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_sections' AND column_name = 'sponsorship_settings_id'
  ) THEN
    ALTER TABLE contact_sections ADD COLUMN sponsorship_settings_id integer NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'contact_sections_sponsorship_settings_id_fkey'
  ) THEN
    ALTER TABLE contact_sections 
    ADD CONSTRAINT contact_sections_sponsorship_settings_id_fkey 
    FOREIGN KEY (sponsorship_settings_id) REFERENCES sponsorship_settings(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update existing contact_sections to reference sponsorship_settings id 1
UPDATE contact_sections SET sponsorship_settings_id = 1 WHERE sponsorship_settings_id IS NULL;

-- ========= Source Migration: 20250628105242_purple_sun.sql =========
/*
  # Fix sponsorship settings foreign key relationship

  1. Schema Updates
    - Ensure foreign key constraint exists between contact_sections and sponsorship_settings
    - Refresh schema cache by recreating the constraint if needed
  
  2. Data Integrity
    - Ensure sponsorship_settings record exists
    - Update any orphaned contact_sections records
*/

-- Ensure we have a sponsorship_settings record
INSERT INTO sponsorship_settings (id, brochure_title, intro_text, call_to_action_text)
VALUES (1, 'Download Sponsorship Brochure', 'RICORRENZA 2025 is made possible by the generous support of our sponsors.', 'Interested in Sponsoring?')
ON CONFLICT (id) DO NOTHING;

-- Update any contact_sections that might have NULL sponsorship_settings_id
UPDATE contact_sections 
SET sponsorship_settings_id = 1 
WHERE sponsorship_settings_id IS NULL;

-- Drop and recreate the foreign key constraint to refresh schema cache
ALTER TABLE contact_sections 
DROP CONSTRAINT IF EXISTS contact_sections_sponsorship_settings_id_fkey;

ALTER TABLE contact_sections 
ADD CONSTRAINT contact_sections_sponsorship_settings_id_fkey 
FOREIGN KEY (sponsorship_settings_id) 
REFERENCES sponsorship_settings(id) 
ON DELETE CASCADE;

-- Refresh the schema cache by analyzing the tables
ANALYZE sponsorship_settings;
ANALYZE contact_sections;

-- ========= Source Migration: 20250628112616_bitter_paper.sql =========
/*
  # Add visible column to events table

  1. Changes
    - Add `visible` column to `events` table with default value `true`
    - This column allows events to be hidden/shown without deleting them

  2. Security
    - No changes to RLS policies needed as existing policies cover the new column
*/

-- Add visible column to events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'visible'
  ) THEN
    ALTER TABLE events ADD COLUMN visible boolean DEFAULT true;
  END IF;
END $$;

-- ========= Source Migration: 20250629060727_nameless_block.sql =========
/*
  # Add documents storage bucket for PDF uploads

  1. Storage Bucket
    - `documents` - For PDF files like sponsorship brochures

  2. Storage Policies
    - Allow public read access to documents
    - Allow authenticated users to upload/update/delete documents
*/

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for documents bucket
DROP POLICY IF EXISTS "Public read access for documents" ON storage.objects;
CREATE POLICY "Public read access for documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
CREATE POLICY "Authenticated users can update documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- ========= Source Migration: 20250629061531_heavy_glade.sql =========
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
DROP POLICY IF EXISTS "Allow public read access to social_media_settings" ON social_media_settings;
CREATE POLICY "Allow public read access to social_media_settings"
  ON social_media_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create policies for authenticated users (admin) write access
DROP POLICY IF EXISTS "Allow authenticated users to insert social_media_settings" ON social_media_settings;
CREATE POLICY "Allow authenticated users to insert social_media_settings"
  ON social_media_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update social_media_settings" ON social_media_settings;
CREATE POLICY "Allow authenticated users to update social_media_settings"
  ON social_media_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete social_media_settings" ON social_media_settings;
CREATE POLICY "Allow authenticated users to delete social_media_settings"
  ON social_media_settings FOR DELETE
  TO authenticated
  USING (true);

-- Insert default social media settings
INSERT INTO social_media_settings (id, instagram_enabled, youtube_enabled) VALUES
  (1, true, true)
ON CONFLICT (id) DO NOTHING;

-- ========= Source Migration: 20250629062110_emerald_prism.sql =========
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

-- Create policies
DROP POLICY IF EXISTS "Allow public read access to social_media_settings" ON social_media_settings;
CREATE POLICY "Allow public read access to social_media_settings"
  ON social_media_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert social_media_settings" ON social_media_settings;
CREATE POLICY "Allow authenticated users to insert social_media_settings"
  ON social_media_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update social_media_settings" ON social_media_settings;
CREATE POLICY "Allow authenticated users to update social_media_settings"
  ON social_media_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete social_media_settings" ON social_media_settings;
CREATE POLICY "Allow authenticated users to delete social_media_settings"
  ON social_media_settings
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert default settings row
INSERT INTO social_media_settings (id, instagram_enabled, youtube_enabled)
VALUES (1, true, true)
ON CONFLICT (id) DO NOTHING;

-- ========= Source Migration: 20250703001327_graceful_field.sql =========
/*
  # Add rules field to events table

  1. Changes
    - Add `rules` column to `events` table as TEXT array
    - This allows admins to set multiple rules for each event

  2. Security
    - No changes to RLS policies needed as existing policies cover the new column
*/

-- Add rules column to events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'rules'
  ) THEN
    ALTER TABLE events ADD COLUMN rules TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- ========= Source Migration: 20250810114750_shrill_meadow.sql =========
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

DROP POLICY IF EXISTS "Allow public read access to faculty_heads" ON faculty_heads;
CREATE POLICY "Allow public read access to faculty_heads"
  ON faculty_heads
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true);

DROP POLICY IF EXISTS "Allow authenticated users to insert faculty_heads" ON faculty_heads;
CREATE POLICY "Allow authenticated users to insert faculty_heads"
  ON faculty_heads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update faculty_heads" ON faculty_heads;
CREATE POLICY "Allow authenticated users to update faculty_heads"
  ON faculty_heads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete faculty_heads" ON faculty_heads;
CREATE POLICY "Allow authenticated users to delete faculty_heads"
  ON faculty_heads
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert default faculty head
INSERT INTO faculty_heads (name, title, image, description, achievements, order_position, enabled)
SELECT name, title, image, description, achievements, order_position, enabled
FROM (VALUES (
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
)) AS t(name, title, image, description, achievements, order_position, enabled)
WHERE NOT EXISTS (
  SELECT 1 FROM faculty_heads WHERE faculty_heads.name = t.name
);

-- ========= Source Migration: 20250810121427_fading_hall.sql =========
/*
  # Create Core Team Management Tables

  1. New Tables
    - `core_committees`
      - `id` (bigint, primary key)
      - `name` (text, committee name)
      - `description` (text, committee description)
      - `color` (text, theme color for UI)
      - `is_core` (boolean, marks core committees)
      - `order_position` (integer, display order)
      - `enabled` (boolean, visibility control)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `core_team_members`
      - `id` (bigint, primary key)
      - `committee_id` (bigint, foreign key to core_committees)
      - `name` (text, member name)
      - `role` (text, member role/position)
      - `image` (text, profile image URL)
      - `description` (text, member bio)
      - `specialty` (text, area of expertise)
      - `achievements` (text array, list of accomplishments)
      - `order_position` (integer, display order within committee)
      - `enabled` (boolean, visibility control)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for public read access
    - Add policies for authenticated users to manage data

  3. Sample Data
    - Creates Technical Team committee with sample members
    - Demonstrates the structure for other committees
*/

-- Create core_committees table
CREATE TABLE IF NOT EXISTS public.core_committees (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    description text NOT NULL,
    color text DEFAULT '#3B82F6'::text NOT NULL,
    is_core boolean DEFAULT false NOT NULL,
    order_position integer DEFAULT 1 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on core_committees
ALTER TABLE public.core_committees ENABLE ROW LEVEL SECURITY;

-- Create policies for core_committees
DROP POLICY IF EXISTS "Allow public read access to core_committees" ON public.core_committees;
CREATE POLICY "Allow public read access to core_committees"
  ON public.core_committees
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true);

DROP POLICY IF EXISTS "Allow authenticated users to insert core_committees" ON public.core_committees;
CREATE POLICY "Allow authenticated users to insert core_committees"
  ON public.core_committees
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update core_committees" ON public.core_committees;
CREATE POLICY "Allow authenticated users to update core_committees"
  ON public.core_committees
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete core_committees" ON public.core_committees;
CREATE POLICY "Allow authenticated users to delete core_committees"
  ON public.core_committees
  FOR DELETE
  TO authenticated
  USING (true);

-- Create core_team_members table
CREATE TABLE IF NOT EXISTS public.core_team_members (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    committee_id bigint NOT NULL REFERENCES public.core_committees(id) ON DELETE CASCADE,
    name text NOT NULL,
    role text NOT NULL,
    image text NOT NULL,
    description text NOT NULL,
    specialty text NOT NULL,
    achievements text[] DEFAULT '{}'::text[] NOT NULL,
    order_position integer DEFAULT 1 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on core_team_members
ALTER TABLE public.core_team_members ENABLE ROW LEVEL SECURITY;

-- Create policies for core_team_members
DROP POLICY IF EXISTS "Allow public read access to core_team_members" ON public.core_team_members;
CREATE POLICY "Allow public read access to core_team_members"
  ON public.core_team_members
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true);

DROP POLICY IF EXISTS "Allow authenticated users to insert core_team_members" ON public.core_team_members;
CREATE POLICY "Allow authenticated users to insert core_team_members"
  ON public.core_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update core_team_members" ON public.core_team_members;
CREATE POLICY "Allow authenticated users to update core_team_members"
  ON public.core_team_members
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete core_team_members" ON public.core_team_members;
CREATE POLICY "Allow authenticated users to delete core_team_members"
  ON public.core_team_members
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert sample core committees (4 core + 6 specialized = 10 total)
INSERT INTO public.core_committees (id, name, description, color, is_core, order_position, enabled) VALUES
(1, 'Technical Team', 'Responsible for all technical aspects including web development, app development, and technical infrastructure', '#3B82F6', true, 1, true),
(2, 'Creative Team', 'Handles all creative content including graphics, videos, and visual design', '#8B5CF6', true, 2, true),
(3, 'Event Management', 'Coordinates and manages all event logistics and operations', '#10B981', true, 3, true),
(4, 'Marketing Team', 'Manages promotional activities, social media, and outreach', '#F59E0B', true, 4, true),
(5, 'Registration Team', 'Handles participant registration and coordination', '#EF4444', false, 5, true),
(6, 'Sponsorship Team', 'Manages sponsor relationships and partnerships', '#06B6D4', false, 6, true),
(7, 'Content Team', 'Creates and manages written content and documentation', '#84CC16', false, 7, true),
(8, 'Security Team', 'Ensures event security and safety protocols', '#6B7280', false, 8, true),
(9, 'Media Team', 'Handles photography, videography, and media coverage', '#EC4899', false, 9, true),
(10, 'Logistics Team', 'Manages venue, equipment, and operational logistics', '#F97316', false, 10, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  is_core = EXCLUDED.is_core,
  order_"position" = EXCLUDED.order_position,
  enabled = EXCLUDED.enabled;

-- Sync sequence for core_committees
SELECT setval('core_committees_id_seq', COALESCE((SELECT MAX(id) FROM core_committees), 1));

-- Insert sample team members for Technical Team
INSERT INTO public.core_team_members (id, committee_id, name, role, image, description, specialty, achievements, order_position, enabled) VALUES
(1, 1, 'Alex Chen', 'Lead Developer', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400', 'Full-stack developer with expertise in React and Node.js', 'Web Development', ARRAY['Built 5+ production applications', 'Expert in React ecosystem', 'Database optimization specialist'], 1, true),
(2, 1, 'Sarah Kumar', 'Mobile App Developer', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400', 'Mobile development specialist focusing on cross-platform solutions', 'Mobile Development', ARRAY['Published 3 mobile apps', 'Flutter expert', 'UI/UX design skills'], 2, true),
(3, 1, 'David Rodriguez', 'DevOps Engineer', 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400', 'Infrastructure and deployment specialist ensuring smooth operations', 'DevOps & Infrastructure', ARRAY['AWS certified', 'Docker containerization expert', 'CI/CD pipeline specialist'], 3, true)
ON CONFLICT (id) DO UPDATE SET
  committee_id = EXCLUDED.committee_id,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  image = EXCLUDED.image,
  description = EXCLUDED.description,
  specialty = EXCLUDED.specialty,
  achievements = EXCLUDED.achievements,
  order_"position" = EXCLUDED.order_position,
  enabled = EXCLUDED.enabled;

-- Sync sequence for core_team_members
SELECT setval('core_team_members_id_seq', COALESCE((SELECT MAX(id) FROM core_team_members), 1));

-- ========= Source Migration: 20250810122401_damp_leaf.sql =========
/*
  # Add Full Team Committee

  1. New Committee
    - Add "Full Team" committee to core_committees table
    - Set as core committee with high priority order
    - Use distinctive color for Full Team

  2. Security
    - Uses existing RLS policies from core_committees table
*/

-- Insert Full Team committee
INSERT INTO core_committees (id, name, description, color, is_core, order_position, enabled)
VALUES (
  11,
  'Full Team',
  'Complete team of organizers, coordinators, and contributors working together to make RICORRENZA 2025 a success',
  '#FF6B35',
  true,
  1,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  is_core = EXCLUDED.is_core,
  order_"position" = EXCLUDED.order_position,
  enabled = EXCLUDED.enabled;

-- ========= Source Migration: 20250810123622_sparkling_villa.sql =========
/*
  # Add Full Team Members for All Committees

  1. Team Members Added
    - Technical Team: 6 members (Lead, Frontend, Backend, Mobile, DevOps, UI/UX)
    - Creative Team: 5 members (Lead, Graphic Designer, Video Editor, Content Writer, Social Media)
    - Event Management: 4 members (Lead, Coordinator, Logistics, Volunteer Manager)
    - Marketing Team: 4 members (Lead, Digital Marketing, PR Manager, Brand Manager)
    - Finance Team: 3 members (Lead, Treasurer, Auditor)
    - Security Team: 3 members (Lead, Cyber Security, Physical Security)
    - Media Team: 4 members (Lead, Photographer, Videographer, Live Streaming)
    - Hospitality Team: 3 members (Lead, Guest Relations, Catering Coordinator)
    - Logistics Team: 4 members (Lead, Transport, Equipment, Venue Manager)
    - Documentation Team: 3 members (Lead, Content Manager, Archive Manager)

  2. Member Details
    - Each member has complete profile information
    - Professional headshot images from Pexels
    - Detailed role descriptions and specialties
    - Key achievements for each member
    - Proper ordering within committees

  3. Security
    - All members are enabled by default
    - Proper committee associations maintained
*/

-- Technical Team Members (Committee ID: 1)
INSERT INTO core_team_members (id, committee_id, name, role, image, description, specialty, achievements, order_position, enabled) VALUES
(101, 1, 'Alex Chen', 'Technical Lead', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400', 'Leading the technical vision and architecture for RICORRENZA 2025. Expert in full-stack development and system design.', 'Full-Stack Architecture', ARRAY['Led development of 5+ major web applications', 'Expert in React, Node.js, and cloud technologies', 'Mentored 20+ junior developers'], 1, true),
(102, 1, 'Sarah Johnson', 'Frontend Developer', 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=400', 'Creating stunning user interfaces and seamless user experiences for the festival platform.', 'Frontend Development', ARRAY['Specialized in React and modern CSS frameworks', 'Created award-winning UI designs', 'Performance optimization expert'], 2, true),
(103, 1, 'Michael Rodriguez', 'Backend Developer', 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400', 'Building robust server-side solutions and database architectures for scalable festival management.', 'Backend Systems', ARRAY['Expert in Node.js and database design', 'Built high-performance APIs', 'Security and scalability specialist'], 3, true),
(104, 1, 'Emily Wang', 'Mobile Developer', 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=400', 'Developing cross-platform mobile applications for enhanced festival experience.', 'Mobile Development', ARRAY['React Native and Flutter expert', 'Published 3+ mobile apps', 'Mobile UX optimization specialist'], 4, true),
(105, 1, 'David Kim', 'DevOps Engineer', 'https://images.pexels.com/photos/2182975/pexels-photo-2182975.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing cloud infrastructure and deployment pipelines for reliable festival operations.', 'Cloud Infrastructure', ARRAY['AWS and Docker containerization expert', 'Automated CI/CD pipeline implementation', 'System monitoring and optimization'], 5, true),
(106, 1, 'Lisa Thompson', 'UI/UX Designer', 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400', 'Designing intuitive and engaging user experiences for all festival digital touchpoints.', 'User Experience Design', ARRAY['Award-winning UI/UX designer', 'User research and testing expert', 'Accessibility and inclusive design advocate'], 6, true),
-- Creative Team Members (Committee ID: 2)
(201, 2, 'Maya Patel', 'Creative Director', 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400', 'Leading the creative vision and artistic direction for RICORRENZA 2025 cyberpunk theme.', 'Creative Direction', ARRAY['Led creative campaigns for 10+ major events', 'Award-winning graphic design portfolio', 'Brand identity and visual storytelling expert'], 1, true),
(202, 2, 'James Wilson', 'Graphic Designer', 'https://images.pexels.com/photos/2182969/pexels-photo-2182969.jpeg?auto=compress&cs=tinysrgb&w=400', 'Creating stunning visual assets and cyberpunk-themed designs for all festival materials.', 'Graphic Design', ARRAY['Adobe Creative Suite master', 'Cyberpunk and futuristic design specialist', 'Created visual identity for 15+ brands'], 2, true),
(203, 2, 'Sophia Martinez', 'Video Editor', 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=400', 'Producing dynamic video content and promotional materials for the festival.', 'Video Production', ARRAY['Professional video editing and motion graphics', 'Created viral promotional videos', 'Expert in After Effects and Premiere Pro'], 3, true),
(204, 2, 'Ryan O''Connor', 'Content Writer', 'https://images.pexels.com/photos/2182973/pexels-photo-2182973.jpeg?auto=compress&cs=tinysrgb&w=400', 'Crafting compelling content and cyberpunk narratives for all festival communications.', 'Content Creation', ARRAY['Published author and copywriter', 'SEO and digital content expert', 'Created content for 50+ campaigns'], 4, true),
(205, 2, 'Zoe Anderson', 'Social Media Manager', 'https://images.pexels.com/photos/3184317/pexels-photo-3184317.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing social media presence and digital engagement strategies for the festival.', 'Social Media Strategy', ARRAY['Grew social media following by 300%', 'Viral content creation specialist', 'Community management expert'], 5, true),
-- Event Management Team Members (Committee ID: 3)
(301, 3, 'Kevin Zhang', 'Event Manager', 'https://images.pexels.com/photos/2182974/pexels-photo-2182974.jpeg?auto=compress&cs=tinysrgb&w=400', 'Overseeing all event planning and execution for a seamless festival experience.', 'Event Planning', ARRAY['Managed 25+ large-scale events', 'Expert in event logistics and coordination', 'Crisis management and problem-solving specialist'], 1, true),
(302, 3, 'Amanda Foster', 'Event Coordinator', 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400', 'Coordinating between different teams and ensuring smooth event operations.', 'Event Coordination', ARRAY['Coordinated events for 1000+ participants', 'Multi-team collaboration expert', 'Timeline and resource management specialist'], 2, true),
(303, 3, 'Carlos Mendez', 'Logistics Coordinator', 'https://images.pexels.com/photos/2182971/pexels-photo-2182971.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing venue logistics, equipment, and operational requirements for all events.', 'Logistics Management', ARRAY['Streamlined logistics for major events', 'Vendor management and negotiation expert', 'Cost optimization and efficiency specialist'], 3, true),
(304, 3, 'Rachel Green', 'Volunteer Manager', 'https://images.pexels.com/photos/3184340/pexels-photo-3184340.jpeg?auto=compress&cs=tinysrgb&w=400', 'Recruiting, training, and managing volunteers for the festival operations.', 'Volunteer Management', ARRAY['Managed teams of 100+ volunteers', 'Training and development specialist', 'Community engagement expert'], 4, true),
-- Marketing Team Members (Committee ID: 4)
(401, 4, 'Jessica Liu', 'Marketing Director', 'https://images.pexels.com/photos/3184341/pexels-photo-3184341.jpeg?auto=compress&cs=tinysrgb&w=400', 'Developing comprehensive marketing strategies to promote RICORRENZA 2025 across all channels.', 'Marketing Strategy', ARRAY['Increased event attendance by 200%', 'Digital marketing campaign expert', 'Brand positioning and market research specialist'], 1, true),
(402, 4, 'Tom Bradley', 'Digital Marketing Specialist', 'https://images.pexels.com/photos/2182972/pexels-photo-2182972.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing online marketing campaigns and digital advertising for maximum reach.', 'Digital Marketing', ARRAY['Google Ads and Facebook Marketing certified', 'ROI optimization expert', 'Data-driven marketing specialist'], 2, true),
(403, 4, 'Nina Sharma', 'PR Manager', 'https://images.pexels.com/photos/3184343/pexels-photo-3184343.jpeg?auto=compress&cs=tinysrgb&w=400', 'Building relationships with media and managing public relations for the festival.', 'Public Relations', ARRAY['Secured coverage in 50+ media outlets', 'Crisis communication expert', 'Influencer partnership specialist'], 3, true),
(404, 4, 'Chris Evans', 'Brand Manager', 'https://images.pexels.com/photos/2182976/pexels-photo-2182976.jpeg?auto=compress&cs=tinysrgb&w=400', 'Maintaining brand consistency and developing brand partnerships for the festival.', 'Brand Management', ARRAY['Developed brand guidelines for major events', 'Partnership negotiation expert', 'Brand identity and positioning specialist'], 4, true),
-- Finance Team Members (Committee ID: 5)
(501, 5, 'Robert Johnson', 'Finance Director', 'https://images.pexels.com/photos/2182977/pexels-photo-2182977.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing festival budget, financial planning, and ensuring fiscal responsibility.', 'Financial Management', ARRAY['CPA with 10+ years experience', 'Managed budgets exceeding $500K', 'Financial planning and analysis expert'], 1, true),
(502, 5, 'Grace Kim', 'Treasurer', 'https://images.pexels.com/photos/3184344/pexels-photo-3184344.jpeg?auto=compress&cs=tinysrgb&w=400', 'Handling day-to-day financial operations and expense tracking for the festival.', 'Financial Operations', ARRAY['Expert in financial software and systems', 'Expense management and reporting specialist', 'Audit and compliance expert'], 2, true),
(503, 5, 'Daniel Lee', 'Financial Auditor', 'https://images.pexels.com/photos/2182978/pexels-photo-2182978.jpeg?auto=compress&cs=tinysrgb&w=400', 'Ensuring financial transparency and conducting audits for festival operations.', 'Financial Auditing', ARRAY['Certified Internal Auditor', 'Risk assessment and mitigation expert', 'Compliance and regulatory specialist'], 3, true),
-- Security Team Members (Committee ID: 6)
(601, 6, 'Marcus Thompson', 'Security Director', 'https://images.pexels.com/photos/2182979/pexels-photo-2182979.jpeg?auto=compress&cs=tinysrgb&w=400', 'Overseeing all security aspects of the festival including cyber and physical security.', 'Security Management', ARRAY['15+ years in security management', 'Certified Security Professional', 'Emergency response and crisis management expert'], 1, true),
(602, 6, 'Elena Volkov', 'Cyber Security Specialist', 'https://images.pexels.com/photos/3184345/pexels-photo-3184345.jpeg?auto=compress&cs=tinysrgb&w=400', 'Protecting digital assets and ensuring cybersecurity for all festival systems.', 'Cybersecurity', ARRAY['Certified Ethical Hacker', 'Prevented 100+ security incidents', 'Penetration testing and vulnerability assessment expert'], 2, true),
(603, 6, 'Jake Morrison', 'Physical Security Lead', 'https://images.pexels.com/photos/2182980/pexels-photo-2182980.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing on-site security operations and ensuring participant safety.', 'Physical Security', ARRAY['Former law enforcement officer', 'Crowd control and event security expert', 'Emergency medical response certified'], 3, true),
-- Media Team Members (Committee ID: 7)
(701, 7, 'Isabella Garcia', 'Media Director', 'https://images.pexels.com/photos/3184346/pexels-photo-3184346.jpeg?auto=compress&cs=tinysrgb&w=400', 'Leading media coverage and documentation of all festival events and activities.', 'Media Production', ARRAY['Award-winning documentary filmmaker', 'Covered 30+ major events', 'Media strategy and content planning expert'], 1, true),
(702, 7, 'Nathan Cooper', 'Lead Photographer', 'https://images.pexels.com/photos/2182981/pexels-photo-2182981.jpeg?auto=compress&cs=tinysrgb&w=400', 'Capturing the essence and energy of RICORRENZA through professional photography.', 'Event Photography', ARRAY['Professional photographer for 8+ years', 'Specialized in event and portrait photography', 'Published in major photography magazines'], 2, true),
(703, 7, 'Olivia Brown', 'Videographer', 'https://images.pexels.com/photos/3184347/pexels-photo-3184347.jpeg?auto=compress&cs=tinysrgb&w=400', 'Creating dynamic video content and live coverage of festival highlights.', 'Video Production', ARRAY['Produced videos with 1M+ views', 'Live streaming and broadcast expert', 'Drone photography and aerial videography certified'], 3, true),
(704, 7, 'Tyler Davis', 'Live Streaming Coordinator', 'https://images.pexels.com/photos/2182982/pexels-photo-2182982.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing live streaming operations and real-time broadcast of festival events.', 'Live Broadcasting', ARRAY['Managed live streams for 50+ events', 'Multi-platform streaming expert', 'Technical broadcast and AV specialist'], 4, true),
-- Hospitality Team Members (Committee ID: 8)
(801, 8, 'Hannah Wilson', 'Hospitality Director', 'https://images.pexels.com/photos/3184348/pexels-photo-3184348.jpeg?auto=compress&cs=tinysrgb&w=400', 'Ensuring exceptional guest experience and hospitality services throughout the festival.', 'Hospitality Management', ARRAY['Hospitality industry veteran with 12+ years', 'Guest satisfaction rating of 98%', 'Event hospitality and VIP services expert'], 1, true),
(802, 8, 'Andrew Miller', 'Guest Relations Manager', 'https://images.pexels.com/photos/2182983/pexels-photo-2182983.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing guest services and ensuring positive experiences for all festival attendees.', 'Guest Services', ARRAY['Customer service excellence award winner', 'Multilingual communication specialist', 'Conflict resolution and guest satisfaction expert'], 2, true),
(803, 8, 'Chloe Taylor', 'Catering Coordinator', 'https://images.pexels.com/photos/3184349/pexels-photo-3184349.jpeg?auto=compress&cs=tinysrgb&w=400', 'Coordinating food and beverage services for participants and guests.', 'Catering Management', ARRAY['Managed catering for events with 2000+ attendees', 'Dietary restrictions and nutrition expert', 'Vendor management and quality control specialist'], 3, true),
-- Logistics Team Members (Committee ID: 9)
(901, 9, 'Brandon Clark', 'Logistics Director', 'https://images.pexels.com/photos/2182984/pexels-photo-2182984.jpeg?auto=compress&cs=tinysrgb&w=400', 'Overseeing all logistical operations and ensuring smooth execution of festival activities.', 'Operations Management', ARRAY['Supply chain and logistics expert', 'Reduced operational costs by 25%', 'Process optimization and efficiency specialist'], 1, true),
(902, 9, 'Samantha White', 'Transport Coordinator', 'https://images.pexels.com/photos/3184350/pexels-photo-3184350.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing transportation arrangements for participants, guests, and equipment.', 'Transportation Logistics', ARRAY['Coordinated transport for 5000+ participants', 'Route optimization and scheduling expert', 'Fleet management and safety specialist'], 2, true),
(903, 9, 'Jordan Martinez', 'Equipment Manager', 'https://images.pexels.com/photos/2182985/pexels-photo-2182985.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing technical equipment, audio-visual systems, and festival infrastructure.', 'Equipment Management', ARRAY['AV equipment and technical setup expert', 'Inventory management specialist', 'Equipment maintenance and troubleshooting expert'], 3, true),
(904, 9, 'Ashley Johnson', 'Venue Manager', 'https://images.pexels.com/photos/3184351/pexels-photo-3184351.jpeg?auto=compress&cs=tinysrgb&w=400', 'Coordinating venue arrangements and space management for all festival activities.', 'Venue Coordination', ARRAY['Managed 20+ venue setups', 'Space planning and layout optimization expert', 'Vendor coordination and facility management specialist'], 4, true),
-- Documentation Team Members (Committee ID: 10)
(1001, 10, 'Victoria Chang', 'Documentation Lead', 'https://images.pexels.com/photos/3184352/pexels-photo-3184352.jpeg?auto=compress&cs=tinysrgb&w=400', 'Leading documentation efforts and maintaining comprehensive records of festival activities.', 'Documentation Management', ARRAY['Technical writing and documentation expert', 'Created comprehensive documentation systems', 'Information architecture and knowledge management specialist'], 1, true),
(1002, 10, 'Lucas Brown', 'Content Manager', 'https://images.pexels.com/photos/2182986/pexels-photo-2182986.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing content creation and maintaining festival knowledge base and archives.', 'Content Management', ARRAY['Content strategy and CMS expert', 'Digital asset management specialist', 'SEO and content optimization expert'], 2, true),
(1003, 10, 'Megan Davis', 'Archive Manager', 'https://images.pexels.com/photos/3184353/pexels-photo-3184353.jpeg?auto=compress&cs=tinysrgb&w=400', 'Maintaining historical records and creating archives for future festival references.', 'Archive Management', ARRAY['Digital archiving and preservation expert', 'Database management and organization specialist', 'Historical research and documentation expert'], 3, true)
ON CONFLICT (id) DO UPDATE SET
  committee_id = EXCLUDED.committee_id,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  image = EXCLUDED.image,
  description = EXCLUDED.description,
  specialty = EXCLUDED.specialty,
  achievements = EXCLUDED.achievements,
  order_"position" = EXCLUDED.order_position,
  enabled = EXCLUDED.enabled;

-- Sync sequence for core_team_members
SELECT setval('core_team_members_id_seq', COALESCE((SELECT MAX(id) FROM core_team_members), 1));

-- ========= Source Migration: 20250810123920_noisy_dawn.sql =========
/*
  # Fix RLS policies for core team tables

  1. Security Updates
    - Drop existing restrictive RLS policies on core_committees and core_team_members
    - Create new policies that allow authenticated users full CRUD access
    - Ensure admin dashboard can properly manage core team data

  2. Changes Made
    - Updated core_committees policies to allow authenticated users full access
    - Updated core_team_members policies to allow authenticated users full access
    - Maintained public read access for website visitors
*/

-- Drop existing policies for core_committees

-- Drop existing policies for core_team_members

-- Create new policies for core_committees
DROP POLICY IF EXISTS "Enable read access for all users" ON core_committees;
CREATE POLICY "Enable read access for all users" ON core_committees
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON core_committees;
CREATE POLICY "Enable insert for authenticated users" ON core_committees
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON core_committees;
CREATE POLICY "Enable update for authenticated users" ON core_committees
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON core_committees;
CREATE POLICY "Enable delete for authenticated users" ON core_committees
  FOR DELETE TO authenticated USING (true);

-- Create new policies for core_team_members
DROP POLICY IF EXISTS "Enable read access for all users" ON core_team_members;
CREATE POLICY "Enable read access for all users" ON core_team_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON core_team_members;
CREATE POLICY "Enable insert for authenticated users" ON core_team_members
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON core_team_members;
CREATE POLICY "Enable update for authenticated users" ON core_team_members
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON core_team_members;
CREATE POLICY "Enable delete for authenticated users" ON core_team_members
  FOR DELETE TO authenticated USING (true);

-- ========= Source Migration: 20250810140308_peaceful_stream.sql =========
/*
  # Add is_head column to core_team_members table

  1. Changes
    - Add `is_head` column to `core_team_members` table with default false
    - This allows marking team members as committee heads

  2. Security
    - No changes to existing RLS policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'core_team_members' AND column_name = 'is_head'
  ) THEN
    ALTER TABLE core_team_members ADD COLUMN is_head boolean DEFAULT false;
  END IF;
END $$;

-- ========= Source Migration: 20250810141849_golden_dawn.sql =========
/*
  # Create band members table for Home Bound band management

  1. New Tables
    - `band_members`
      - `id` (bigint, primary key)
      - `name` (text, required)
      - `role` (text, required) 
      - `image` (text, required)
      - `description` (text, required)
      - `specialty` (text, required)
      - `achievements` (text array)
      - `order_position` (integer, default 1)
      - `enabled` (boolean, default true)
      - `is_featured` (boolean, default false)
      - `social_links` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `band_members` table
    - Add policies for public read access
    - Add policies for authenticated user management
*/

CREATE TABLE IF NOT EXISTS band_members (
  id bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  name text NOT NULL,
  role text NOT NULL,
  image text NOT NULL,
  description text NOT NULL,
  specialty text NOT NULL,
  achievements text[] DEFAULT '{}',
  order_position integer DEFAULT 1,
  enabled boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  social_links jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE band_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON band_members;
CREATE POLICY "Enable read access for all users"
  ON band_members
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON band_members;
CREATE POLICY "Enable insert for authenticated users"
  ON band_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON band_members;
CREATE POLICY "Enable update for authenticated users"
  ON band_members
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON band_members;
CREATE POLICY "Enable delete for authenticated users"
  ON band_members
  FOR DELETE
  TO authenticated
  USING (true);

-- ========= Source Migration: 20250810142434_odd_cloud.sql =========
/*
  # Add category field to band members

  1. Changes
    - Add `category` column to `band_members` table
    - Set default category as 'Vocals'
    - Update existing records to have a default category

  2. Categories
    - Vocals (Singers, Lead Vocals, Backup Vocals)
    - Instruments (Guitar, Bass, Drums, Piano, etc.)
    - Production (Sound Engineer, Producer, DJ)
    - Performance (Dancer, Performer, Visual Artist)
*/

-- Add category column to band_members table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'band_members' AND column_name = 'category'
  ) THEN
    ALTER TABLE band_members ADD COLUMN category text DEFAULT 'Vocals' NOT NULL;
  END IF;
END $$;

-- Update existing records to have a default category
UPDATE band_members 
SET category = 'Vocals' 
WHERE category IS NULL OR category = '';

-- ========= Source Migration: 20250810143620_lingering_summit.sql =========
/*
  # Fix Faculty Heads RLS Policy

  1. Security Updates
    - Drop existing policies that might be causing conflicts
    - Create proper policies for authenticated users to manage faculty heads
    - Ensure UPDATE operations work correctly for admin users

  2. Policy Changes
    - Allow authenticated users to read all faculty heads
    - Allow authenticated users to insert, update, and delete faculty heads
    - Public users can only read enabled faculty heads
*/

-- Drop existing policies to avoid conflicts

-- Create new comprehensive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON faculty_heads;
CREATE POLICY "Enable read access for all users" ON faculty_heads
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON faculty_heads;
CREATE POLICY "Enable insert for authenticated users" ON faculty_heads
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON faculty_heads;
CREATE POLICY "Enable update for authenticated users" ON faculty_heads
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON faculty_heads;
CREATE POLICY "Enable delete for authenticated users" ON faculty_heads
  FOR DELETE TO authenticated
  USING (true);

-- ========= Source Migration: 20250810145415_bitter_math.sql =========
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
DROP POLICY IF EXISTS "Allow public read access to sponsorship_packages" ON sponsorship_packages;
CREATE POLICY "Allow public read access to sponsorship_packages"
  ON sponsorship_packages
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true);

DROP POLICY IF EXISTS "Allow authenticated users to insert sponsorship_packages" ON sponsorship_packages;
CREATE POLICY "Allow authenticated users to insert sponsorship_packages"
  ON sponsorship_packages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update sponsorship_packages" ON sponsorship_packages;
CREATE POLICY "Allow authenticated users to update sponsorship_packages"
  ON sponsorship_packages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete sponsorship_packages" ON sponsorship_packages;
CREATE POLICY "Allow authenticated users to delete sponsorship_packages"
  ON sponsorship_packages
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert default sponsorship packages
INSERT INTO sponsorship_packages (tier, price, color, icon, benefits, order_position)
SELECT tier, price, color, icon, benefits, order_position
FROM (VALUES
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
)) AS t(tier, price, color, icon, benefits, order_position)
WHERE NOT EXISTS (
  SELECT 1 FROM sponsorship_packages WHERE sponsorship_packages.tier = t.tier
);

-- ========= Source Migration: 20250811074544_round_cottage.sql =========
/*
  # Storage Buckets Setup Instructions

  This migration provides the SQL commands to create the required storage buckets
  for the RICORRENZA 2025 application.

  ## Required Storage Buckets
  The following buckets need to be created in your Supabase project:
  
  1. `band-images` - For Home Bound Band member photos
  2. `event-images` - For event photos and thumbnails  
  3. `faculty-images` - For faculty head profile photos
  4. `gallery-images` - For gallery photos and memories
  5. `team-images` - For core team member photos
  6. `sponsor-logos` - For sponsor company logos
  7. `documents` - For PDF documents and brochures

  ## Manual Setup Required
  Since storage buckets cannot be created via SQL migrations, you need to:
  
  1. Go to your Supabase project dashboard
  2. Navigate to Storage section
  3. Create each bucket listed above
  4. Set appropriate policies for each bucket

  ## Storage Policies
  For each bucket, you'll need policies that allow:
  - Authenticated users to upload files
  - Public read access to files
  - Authenticated users to delete their own uploads
*/

-- This is a documentation-only migration
-- Storage buckets must be created manually in the Supabase dashboard

-- Example policies that should be applied to each storage bucket:
-- (These need to be set in the Supabase dashboard, not via SQL)

/*
Policy Name: "Allow authenticated uploads"
Operation: INSERT
Target roles: authenticated
Policy definition: true

Policy Name: "Allow public downloads" 
Operation: SELECT
Target roles: public
Policy definition: true

Policy Name: "Allow authenticated deletes"
Operation: DELETE  
Target roles: authenticated
Policy definition: true
*/

-- Create a table to track storage setup status
CREATE TABLE IF NOT EXISTS storage_setup_status (
  id integer PRIMARY KEY DEFAULT 1,
  buckets_created boolean DEFAULT false,
  policies_configured boolean DEFAULT false,
  setup_notes text DEFAULT 'Storage buckets need to be created manually in Supabase dashboard',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE storage_setup_status ENABLE ROW LEVEL SECURITY;

-- Allow public read access to setup status
DROP POLICY IF EXISTS "Allow public read access to storage_setup_status" ON storage_setup_status;
CREATE POLICY "Allow public read access to storage_setup_status"
  ON storage_setup_status
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to update setup status
DROP POLICY IF EXISTS "Allow authenticated users to update storage_setup_status" ON storage_setup_status;
CREATE POLICY "Allow authenticated users to update storage_setup_status"
  ON storage_setup_status
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert initial status record
INSERT INTO storage_setup_status (id, buckets_created, policies_configured, setup_notes)
VALUES (1, false, false, 'Please create the following storage buckets in your Supabase dashboard: band-images, event-images, faculty-images, gallery-images, team-images, sponsor-logos, documents')
ON CONFLICT (id) DO NOTHING;

-- ========= Source Migration: 20250811133941_dry_frost.sql =========
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
DROP POLICY IF EXISTS "Enable read access for all users" ON guest_artists;
CREATE POLICY "Enable read access for all users"
  ON guest_artists
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON guest_artists;
CREATE POLICY "Enable insert for authenticated users"
  ON guest_artists
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON guest_artists;
CREATE POLICY "Enable update for authenticated users"
  ON guest_artists
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON guest_artists;
CREATE POLICY "Enable delete for authenticated users"
  ON guest_artists
  FOR DELETE
  TO authenticated
  USING (true);

-- ========= Source Migration: 20250811135647_fancy_term.sql =========
/*
  # Storage Bucket Policies Setup

  1. Storage Buckets
    - Creates required storage buckets if they don't exist
    - `guest-artist-images` - For guest artist profile images
    - `guest-artist-videos` - For guest artist videos
    - `event-images` - For event images
    - `gallery-images` - For gallery images
    - `band-images` - For band member images
    - `team-images` - For core team member images
    - `faculty-images` - For faculty head images

  2. Security Policies
    - Allow public read access to all buckets
    - Allow authenticated users to upload files
    - Allow authenticated users to update/delete files
*/

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('guest-artist-images', 'guest-artist-images', true),
  ('guest-artist-videos', 'guest-artist-videos', true),
  ('event-images', 'event-images', true),
  ('gallery-images', 'gallery-images', true),
  ('band-images', 'band-images', true),
  ('team-images', 'team-images', true),
  ('faculty-images', 'faculty-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to all buckets
DROP POLICY IF EXISTS "Public read access for guest-artist-images" ON storage.objects;
CREATE POLICY "Public read access for guest-artist-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'guest-artist-images');

DROP POLICY IF EXISTS "Public read access for guest-artist-videos" ON storage.objects;
CREATE POLICY "Public read access for guest-artist-videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'guest-artist-videos');

DROP POLICY IF EXISTS "Public read access for event-images" ON storage.objects;
CREATE POLICY "Public read access for event-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Public read access for gallery-images" ON storage.objects;
CREATE POLICY "Public read access for gallery-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'gallery-images');

DROP POLICY IF EXISTS "Public read access for band-images" ON storage.objects;
CREATE POLICY "Public read access for band-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'band-images');

DROP POLICY IF EXISTS "Public read access for team-images" ON storage.objects;
CREATE POLICY "Public read access for team-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'team-images');

DROP POLICY IF EXISTS "Public read access for faculty-images" ON storage.objects;
CREATE POLICY "Public read access for faculty-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'faculty-images');

-- Allow authenticated users to upload files
DROP POLICY IF EXISTS "Authenticated users can upload to guest-artist-images" ON storage.objects;
CREATE POLICY "Authenticated users can upload to guest-artist-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'guest-artist-images');

DROP POLICY IF EXISTS "Authenticated users can upload to guest-artist-videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload to guest-artist-videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'guest-artist-videos');

DROP POLICY IF EXISTS "Authenticated users can upload to event-images" ON storage.objects;
CREATE POLICY "Authenticated users can upload to event-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Authenticated users can upload to gallery-images" ON storage.objects;
CREATE POLICY "Authenticated users can upload to gallery-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'gallery-images');

DROP POLICY IF EXISTS "Authenticated users can upload to band-images" ON storage.objects;
CREATE POLICY "Authenticated users can upload to band-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'band-images');

DROP POLICY IF EXISTS "Authenticated users can upload to team-images" ON storage.objects;
CREATE POLICY "Authenticated users can upload to team-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'team-images');

DROP POLICY IF EXISTS "Authenticated users can upload to faculty-images" ON storage.objects;
CREATE POLICY "Authenticated users can upload to faculty-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'faculty-images');

-- Allow authenticated users to update files
DROP POLICY IF EXISTS "Authenticated users can update guest-artist-images" ON storage.objects;
CREATE POLICY "Authenticated users can update guest-artist-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'guest-artist-images');

DROP POLICY IF EXISTS "Authenticated users can update guest-artist-videos" ON storage.objects;
CREATE POLICY "Authenticated users can update guest-artist-videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'guest-artist-videos');

DROP POLICY IF EXISTS "Authenticated users can update event-images" ON storage.objects;
CREATE POLICY "Authenticated users can update event-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Authenticated users can update gallery-images" ON storage.objects;
CREATE POLICY "Authenticated users can update gallery-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'gallery-images');

DROP POLICY IF EXISTS "Authenticated users can update band-images" ON storage.objects;
CREATE POLICY "Authenticated users can update band-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'band-images');

DROP POLICY IF EXISTS "Authenticated users can update team-images" ON storage.objects;
CREATE POLICY "Authenticated users can update team-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'team-images');

DROP POLICY IF EXISTS "Authenticated users can update faculty-images" ON storage.objects;
CREATE POLICY "Authenticated users can update faculty-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'faculty-images');

-- Allow authenticated users to delete files
DROP POLICY IF EXISTS "Authenticated users can delete from guest-artist-images" ON storage.objects;
CREATE POLICY "Authenticated users can delete from guest-artist-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'guest-artist-images');

DROP POLICY IF EXISTS "Authenticated users can delete from guest-artist-videos" ON storage.objects;
CREATE POLICY "Authenticated users can delete from guest-artist-videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'guest-artist-videos');

DROP POLICY IF EXISTS "Authenticated users can delete from event-images" ON storage.objects;
CREATE POLICY "Authenticated users can delete from event-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Authenticated users can delete from gallery-images" ON storage.objects;
CREATE POLICY "Authenticated users can delete from gallery-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'gallery-images');

DROP POLICY IF EXISTS "Authenticated users can delete from band-images" ON storage.objects;
CREATE POLICY "Authenticated users can delete from band-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'band-images');

DROP POLICY IF EXISTS "Authenticated users can delete from team-images" ON storage.objects;
CREATE POLICY "Authenticated users can delete from team-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'team-images');

DROP POLICY IF EXISTS "Authenticated users can delete from faculty-images" ON storage.objects;
CREATE POLICY "Authenticated users can delete from faculty-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'faculty-images');

-- ========= Source Migration: 20250811135836_icy_poetry.sql =========
/*
  # Fix guest_artists id column auto-increment

  1. Database Changes
    - Update `guest_artists` table `id` column to use auto-increment (GENERATED ALWAYS AS IDENTITY)
    - This will automatically generate unique IDs for new guest artist records

  2. Security
    - No changes to existing RLS policies
    - Maintains current security configuration
*/

-- Update the id column to use auto-increment
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'guest_artists' 
    AND column_name = 'id' 
    AND is_identity = 'YES'
  ) THEN
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'guest_artists' AND column_name = 'id' AND is_identity = 'YES'
  ) THEN
    ALTER TABLE guest_artists ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
  END IF;
END $$;
  END IF;
END $$;

-- ========= Source Migration: 20250811140052_rough_sunset.sql =========
/*
  # Add featured sponsors functionality

  1. Schema Changes
    - Add `featured` column to `sponsors` table to mark sponsors for homepage display
    - Add `order_position` column to control display order of featured sponsors

  2. Security
    - Update existing RLS policies to include new columns
*/

-- Add featured and order_position columns to sponsors table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsors' AND column_name = 'featured'
  ) THEN
    ALTER TABLE sponsors ADD COLUMN featured boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsors' AND column_name = 'order_position'
  ) THEN
    ALTER TABLE sponsors ADD COLUMN order_position integer DEFAULT 1;
  END IF;
END $$;

-- ========= Source Migration: 20250811193450_orange_frost.sql =========
/*
  # Add featured column to sponsors table

  1. Schema Changes
    - Add `featured` column to `sponsors` table with default value false
    - This allows sponsors to be marked as featured for homepage display

  2. Data Migration
    - All existing sponsors will have featured = false by default
    - Admins can then mark specific sponsors as featured through the admin panel
*/

-- Add featured column to sponsors table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsors' AND column_name = 'featured'
  ) THEN
    ALTER TABLE sponsors ADD COLUMN featured boolean DEFAULT false;
  END IF;
END $$;

-- ========= Source Migration: 20250812053556_golden_swamp.sql =========
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

DROP POLICY IF EXISTS "Allow public read access to homepage_settings" ON homepage_settings;
CREATE POLICY "Allow public read access to homepage_settings"
  ON homepage_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to update homepage_settings" ON homepage_settings;
CREATE POLICY "Allow authenticated users to update homepage_settings"
  ON homepage_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert homepage_settings" ON homepage_settings;
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

-- ========= Source Migration: 20250812054442_falling_spark.sql =========
/*
  # Add sponsor logo to homepage settings

  1. Schema Changes
    - Add `sponsor_logo_url` column to `homepage_settings` table
    - Add `sponsor_logo_enabled` column to control visibility
    - Add `sponsor_logo_text` column for optional text/name

  2. Security
    - Existing RLS policies will apply to new columns
*/

DO $$
BEGIN
  -- Add sponsor logo URL column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_logo_url'
  ) THEN
    ALTER TABLE homepage_settings ADD COLUMN sponsor_logo_url text;
  END IF;

  -- Add sponsor logo enabled column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_logo_enabled'
  ) THEN
    ALTER TABLE homepage_settings ADD COLUMN sponsor_logo_enabled boolean DEFAULT false;
  END IF;

  -- Add sponsor logo text column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_logo_text'
  ) THEN
    ALTER TABLE homepage_settings ADD COLUMN sponsor_logo_text text DEFAULT 'Powered by';
  END IF;
END $$;

-- ========= Source Migration: 20250812061018_gentle_ocean.sql =========
/*
  # Update homepage settings for multiple sponsor logos

  1. Schema Changes
    - Add sponsor_logos JSONB column to homepage_settings table
    - Add sponsor_section_enabled boolean column
    - Add sponsor_section_text text column
    - Remove old single sponsor logo columns (sponsor_logo_url, sponsor_logo_enabled, sponsor_logo_text)

  2. Data Migration
    - Migrate existing single sponsor logo data to new multiple logos format
    - Set default values for new columns

  3. Security
    - Maintain existing RLS policies
*/

-- Add new columns for multiple sponsor logos
DO $$
BEGIN
  -- Add sponsor_logos JSONB column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_logos'
  ) THEN
    ALTER TABLE homepage_settings ADD COLUMN sponsor_logos JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add sponsor_section_enabled column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_section_enabled'
  ) THEN
    ALTER TABLE homepage_settings ADD COLUMN sponsor_section_enabled BOOLEAN DEFAULT false;
  END IF;

  -- Add sponsor_section_text column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_section_text'
  ) THEN
    ALTER TABLE homepage_settings ADD COLUMN sponsor_section_text TEXT DEFAULT 'Powered by';
  END IF;
END $$;

-- Migrate existing single sponsor logo data to new format
DO $$
DECLARE
  existing_record RECORD;
  new_sponsor_logo JSONB;
BEGIN
  -- Check if there's existing data to migrate
  SELECT * INTO existing_record FROM homepage_settings WHERE id = 1;
  
  IF FOUND AND existing_record.sponsor_logo_url IS NOT NULL AND existing_record.sponsor_logo_url != '' THEN
    -- Create new sponsor logo object from existing data
    new_sponsor_logo := jsonb_build_object(
      'id', 'migrated_' || extract(epoch from now())::text,
      'name', 'Main Sponsor',
      'logo_url', existing_record.sponsor_logo_url,
      'website', '',
      'enabled', COALESCE(existing_record.sponsor_logo_enabled, false),
      'order', 1
    );
    
    -- Update the record with migrated data
    UPDATE homepage_settings 
    SET 
      sponsor_logos = jsonb_build_array(new_sponsor_logo),
      sponsor_section_enabled = COALESCE(existing_record.sponsor_logo_enabled, false),
      sponsor_section_text = COALESCE(existing_record.sponsor_logo_text, 'Powered by'),
      updated_at = now()
    WHERE id = 1;
  ELSE
    -- No existing data, just set defaults
    UPDATE homepage_settings 
    SET 
      sponsor_logos = '[]'::jsonb,
      sponsor_section_enabled = false,
      sponsor_section_text = 'Powered by',
      updated_at = now()
    WHERE id = 1;
  END IF;
  
  -- If no record exists, create one with defaults
  IF NOT FOUND THEN
    INSERT INTO homepage_settings (
      id,
      hero_media_url,
      hero_media_type,
      hero_title,
      hero_subtitle,
      hero_description,
      sponsor_logos,
      sponsor_section_enabled,
      sponsor_section_text,
      created_at,
      updated_at
    ) VALUES (
      1,
      NULL,
      'image',
      'RICORRENZA',
      'Experience the Future',
      'Experience the future of Healthcare, Technology, and Creativity',
      '[]'::jsonb,
      false,
      'Powered by',
      now(),
      now()
    );
  END IF;
END $$;

-- Remove old single sponsor logo columns after migration
DO $$
BEGIN
  -- Drop old columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_logo_url'
  ) THEN
    ALTER TABLE homepage_settings DROP COLUMN sponsor_logo_url;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_logo_enabled'
  ) THEN
    ALTER TABLE homepage_settings DROP COLUMN sponsor_logo_enabled;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_logo_text'
  ) THEN
    ALTER TABLE homepage_settings DROP COLUMN sponsor_logo_text;
  END IF;
END $$;

-- ========= Source Migration: 20250812071618_azure_shape.sql =========
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
DROP POLICY IF EXISTS "Allow public to create auditions" ON auditions;
CREATE POLICY "Allow public to create auditions"
  ON auditions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public to read auditions" ON auditions;
CREATE POLICY "Allow public to read auditions"
  ON auditions
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to update auditions" ON auditions;
CREATE POLICY "Allow authenticated users to update auditions"
  ON auditions
  FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete auditions" ON auditions;
CREATE POLICY "Allow authenticated users to delete auditions"
  ON auditions
  FOR DELETE
  TO authenticated
  USING (true);

-- Memberships policies
DROP POLICY IF EXISTS "Allow public to create memberships" ON memberships;
CREATE POLICY "Allow public to create memberships"
  ON memberships
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public to read memberships" ON memberships;
CREATE POLICY "Allow public to read memberships"
  ON memberships
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to update memberships" ON memberships;
CREATE POLICY "Allow authenticated users to update memberships"
  ON memberships
  FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete memberships" ON memberships;
CREATE POLICY "Allow authenticated users to delete memberships"
  ON memberships
  FOR DELETE
  TO authenticated
  USING (true);

-- ========= Source Migration: 20250812072515_shrill_stream.sql =========
/*
  # Add participant type to auditions and memberships tables

  1. Table Updates
    - Add `participant_type` column to `auditions` table
    - Add `participant_type` column to `memberships` table
  
  2. Data Migration
    - Set default value for existing records
    - Add NOT NULL constraint after setting defaults
*/

-- Add participant_type to auditions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auditions' AND column_name = 'participant_type'
  ) THEN
    ALTER TABLE auditions ADD COLUMN participant_type text DEFAULT '1st Year';
    
    -- Update existing records to have a default value
    UPDATE auditions SET participant_type = '1st Year' WHERE participant_type IS NULL;
    
    -- Make the column NOT NULL after setting defaults
    ALTER TABLE auditions ALTER COLUMN participant_type SET NOT NULL;
  END IF;
END $$;

-- Add participant_type to memberships table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memberships' AND column_name = 'participant_type'
  ) THEN
    ALTER TABLE memberships ADD COLUMN participant_type text DEFAULT '1st Year';
    
    -- Update existing records to have a default value
    UPDATE memberships SET participant_type = '1st Year' WHERE participant_type IS NULL;
    
    -- Make the column NOT NULL after setting defaults
    ALTER TABLE memberships ALTER COLUMN participant_type SET NOT NULL;
  END IF;
END $$;

-- ========= Source Migration: 20250812073309_crystal_tree.sql =========
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

DROP POLICY IF EXISTS "Allow public read access to form_settings" ON form_settings;
CREATE POLICY "Allow public read access to form_settings"
  ON form_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to update form_settings" ON form_settings;
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

-- ========= Source Migration: 20250812074049_foggy_heart.sql =========
/*
  # Update sponsorship settings for PDF upload

  1. Changes
    - Update brochure_url column to handle uploaded PDF files
    - Keep existing data intact
    - No breaking changes to existing functionality

  2. Notes
    - Existing URL-based brochures will continue to work
    - New uploads will use Supabase storage
*/

-- No schema changes needed as brochure_url can handle both URLs and storage URLs
-- The application logic will handle the difference between external URLs and storage URLs

-- ========= Source Migration: 20250812120000_swift_breeze.sql =========
/*
  # Add animation speed controls to homepage_settings

  1. Schema Changes
    - Add sponsors_belt_speed_px_per_sec integer column (default 140)
    - Add committee_marquee_speed_px_per_sec integer column (default 75)

  2. Safety
    - Use IF NOT EXISTS guards so migration is idempotent
    - Backfill defaults on existing row id=1
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsors_belt_speed_px_per_sec'
  ) THEN
    ALTER TABLE homepage_settings
      ADD COLUMN sponsors_belt_speed_px_per_sec integer DEFAULT 140;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'committee_marquee_speed_px_per_sec'
  ) THEN
    ALTER TABLE homepage_settings
      ADD COLUMN committee_marquee_speed_px_per_sec integer DEFAULT 75;
  END IF;

  -- Backfill defaults for existing record
  UPDATE homepage_settings
  SET 
    sponsors_belt_speed_px_per_sec = COALESCE(sponsors_belt_speed_px_per_sec, 140),
    committee_marquee_speed_px_per_sec = COALESCE(committee_marquee_speed_px_per_sec, 75),
    updated_at = now()
  WHERE id = 1;
END $$;


-- ========= Source Migration: 20250812123000_breezy_direction.sql =========
/*
  # Add direction controls to homepage_settings

  1. Schema Changes
    - Add sponsors_belt_direction text (CHECK in ('left','right')) DEFAULT 'left'
    - Add committee_marquee_direction text (CHECK in ('left','right')) DEFAULT 'right'

  2. Safety
    - Guard with IF NOT EXISTS
    - Backfill id=1 with defaults if null
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsors_belt_direction'
  ) THEN
    ALTER TABLE homepage_settings
      ADD COLUMN sponsors_belt_direction text DEFAULT 'left' CHECK (sponsors_belt_direction IN ('left','right'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'committee_marquee_direction'
  ) THEN
    ALTER TABLE homepage_settings
      ADD COLUMN committee_marquee_direction text DEFAULT 'right' CHECK (committee_marquee_direction IN ('left','right'));
  END IF;

  UPDATE homepage_settings
  SET 
    sponsors_belt_direction = COALESCE(sponsors_belt_direction, 'left'),
    committee_marquee_direction = COALESCE(committee_marquee_direction, 'right'),
    updated_at = now()
  WHERE id = 1;
END $$;


-- ========= Source Migration: 20250813083937_bitter_leaf.sql =========
/*
  # Create PDF storage bucket for sponsorship documents

  1. Storage Setup
    - Create `pdf` bucket for PDF document storage
    - Configure bucket for public read access
    - Set file size limits and allowed file types

  2. Security Policies
    - Enable public read access for downloading brochures
    - Allow authenticated users to upload, update, and delete PDFs
    - Restrict file types to PDF only

  3. Bucket Configuration
    - Public bucket for easy access to sponsorship brochures
    - Organized folder structure for different document types
*/

-- Create the pdf storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf',
  'pdf',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the storage.objects table for the pdf bucket
DROP POLICY IF EXISTS "Public read access for pdf bucket" ON storage.objects;
CREATE POLICY "Public read access for pdf bucket"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'pdf');

DROP POLICY IF EXISTS "Authenticated users can upload to pdf bucket" ON storage.objects;
CREATE POLICY "Authenticated users can upload to pdf bucket"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pdf');

DROP POLICY IF EXISTS "Authenticated users can update pdf bucket objects" ON storage.objects;
CREATE POLICY "Authenticated users can update pdf bucket objects"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pdf')
  WITH CHECK (bucket_id = 'pdf');

DROP POLICY IF EXISTS "Authenticated users can delete from pdf bucket" ON storage.objects;
CREATE POLICY "Authenticated users can delete from pdf bucket"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'pdf');

-- ========= Source Migration: 20250813085114_patient_fire.sql =========
/*
  # Add foreign key constraint for contact_sections

  1. Foreign Key Relationship
    - Add foreign key constraint from `contact_sections.sponsorship_settings_id` to `sponsorship_settings.id`
    - Enable CASCADE delete to maintain data integrity
  
  2. Schema Update
    - This will allow Supabase to properly recognize the relationship
    - Fixes the schema cache error when querying related data
*/

-- Add foreign key constraint if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contact_sections_sponsorship_settings_id_fkey'
    AND table_name = 'contact_sections'
  ) THEN
    ALTER TABLE public.contact_sections 
    ADD CONSTRAINT contact_sections_sponsorship_settings_id_fkey 
    FOREIGN KEY (sponsorship_settings_id) 
    REFERENCES public.sponsorship_settings(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- ========= Source Migration: 20250813085429_damp_tooth.sql =========
/*
  # Add social links to core team members

  1. Schema Changes
    - Add `social_links` column to `core_team_members` table
    - Column type: jsonb with default empty object
    - Allows storing Instagram, YouTube, Spotify links

  2. Security
    - No changes to existing RLS policies
    - Social links inherit existing permissions
*/

-- Add social_links column to core_team_members table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'core_team_members' AND column_name = 'social_links'
  ) THEN
    ALTER TABLE core_team_members 
    ADD COLUMN social_links jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ========= Source Migration: 20250813100000_hero_media.sql =========
-- Create a table to manage hero media for each page and a public storage bucket
-- Pages covered: home, events, schedule, gallery, homebound, ricofamily, sponsors

create table if not exists public.hero_media (
  id bigserial primary key,
  page_key text not null unique check (page_key in ('home','events','schedule','gallery','homebound','ricofamily','sponsors')),
  background_type text not null default 'auto' check (background_type in ('image','video','auto')),
  image_url text,
  video_url text,
  poster_url text,
  overlay_color text default '#000000',
  overlay_opacity numeric not null default 0.35 check (overlay_opacity >= 0 and overlay_opacity <= 1),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at current
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

drop trigger if exists trg_hero_media_updated_at on public.hero_media;
create trigger trg_hero_media_updated_at
before update on public.hero_media
for each row execute function public.set_updated_at();

-- RLS
alter table public.hero_media enable row level security;

-- Read for everyone
DROP POLICY IF EXISTS "hero_media_read_all" ON public.hero_media;
create policy "hero_media_read_all" on public.hero_media
for select using (true);

-- Modify for authenticated
DROP POLICY IF EXISTS "hero_media_modify_auth" ON public.hero_media;
create policy "hero_media_modify_auth" on public.hero_media
for all to authenticated using (true) with check (true);

-- Seed rows for each page if missing
insert into public.hero_media (page_key) values
  ('home'),('events'),('schedule'),('gallery'),('homebound'),('ricofamily'),('sponsors')
on conflict (page_key) do nothing;

-- STORAGE: create a public bucket for hero media
-- Requires postgres function storage.create_bucket
select
  case when not exists (select 1 from storage.buckets where id = 'hero-media')
    then storage.create_bucket('hero-media', public := true)
  end;

-- Storage RLS policies
-- Public read
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read hero-media'
  ) then
DROP POLICY IF EXISTS "Public read hero-media" ON storage.objects;
    create policy "Public read hero-media" on storage.objects
      for select
      using (bucket_id = 'hero-media');
  end if;
end $$;

-- Authenticated create/update/delete
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Auth write hero-media'
  ) then
DROP POLICY IF EXISTS "Auth write hero-media" ON storage.objects;
    create policy "Auth write hero-media" on storage.objects
      for all to authenticated
      using (bucket_id = 'hero-media')
      with check (bucket_id = 'hero-media');
  end if;
end $$;

-- Ensure anon can list objects (optional)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Anon list hero-media'
  ) then
DROP POLICY IF EXISTS "Anon list hero-media" ON storage.objects;
    create policy "Anon list hero-media" on storage.objects
      for select to anon
      using (bucket_id = 'hero-media');
  end if;
end $$;

-- Reload PostgREST schema if needed
notify pgrst, 'reload schema';


-- ========= Source Migration: 20250911000000_create_pdf_bucket.sql =========
/*
  # Create 'pdf' storage bucket for brochures and documents

  - Public read access
  - Authenticated users can upload/update/delete
*/

-- Create the 'pdf' bucket if it does not exist
insert into storage.buckets (id, name, public)
values ('pdf', 'pdf', true)
on conflict (id) do nothing;

-- Public can read files from 'pdf'
DROP POLICY IF EXISTS "Public read access for pdf" ON storage.objects;
CREATE POLICY "Public read access for pdf"
  on storage.objects for select
  to public
  using (bucket_id = 'pdf');

-- Authenticated can upload to 'pdf'
DROP POLICY IF EXISTS "Authenticated upload to pdf" ON storage.objects;
CREATE POLICY "Authenticated upload to pdf"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'pdf');

-- Authenticated can update files in 'pdf'
DROP POLICY IF EXISTS "Authenticated update pdf" ON storage.objects;
CREATE POLICY "Authenticated update pdf"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'pdf');

-- Authenticated can delete files from 'pdf'
DROP POLICY IF EXISTS "Authenticated delete from pdf" ON storage.objects;
CREATE POLICY "Authenticated delete from pdf"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'pdf');


-- ========= Source Migration: 20250911000000_roadmap_milestones.sql =========
-- Roadmap milestones table
create table if not exists public.roadmap_milestones (
  id bigserial primary key,
  year int not null,
  title text,
  points text[] default '{}',
  order_position int not null default 0,
  enabled boolean not null default true,
  side text not null default 'auto' check (side in ('auto','left','right')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep order_position unique-ish (soft) per year ordering
create index if not exists roadmap_milestones_order_idx on public.roadmap_milestones(order_position);
create index if not exists roadmap_milestones_year_idx on public.roadmap_milestones(year);

-- Updated at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_roadmap_milestones_updated on public.roadmap_milestones;
create trigger trg_roadmap_milestones_updated
before update on public.roadmap_milestones
for each row execute function public.set_updated_at();

-- RLS
alter table public.roadmap_milestones enable row level security;

-- Policies (adjust auth schema/roles as needed)
-- Allow read to everyone
DROP POLICY IF EXISTS "roadmap_milestones_select" ON public.roadmap_milestones;
create policy "roadmap_milestones_select" on public.roadmap_milestones
for select using ( true );

-- Allow authenticated users to manage (you can refine with auth.uid() = created_by if you add created_by column)
DROP POLICY IF EXISTS "roadmap_milestones_modify" ON public.roadmap_milestones;
create policy "roadmap_milestones_modify" on public.roadmap_milestones
for all using ( auth.role() = 'authenticated' ) with check ( auth.role() = 'authenticated' );

-- Sample seed data
insert into public.roadmap_milestones (year, title, points, order_position, enabled, side) values
  (2015, 'Commencement of Ricorrenza', array['Commencement of Ricorrenza'], 1, true, 'right'),
  (2017, 'Growth Phase', array['20+ events','500+ participants','3 days of cultural extravaganza'], 2, true, 'left'),
  (2019, 'National Recognition', array['Bollywood Artist Mohammad Irfan','Bengals Favourite Anupam Roy','Waves in Town Band','10000+ Footfall'], 3, true, 'right'),
  (2022, 'Expansion', array['Develop branding & marketing campaigns','1000+ Footfall','DJ Night','Guest Artists'], 4, true, 'auto'),
  (2023, 'Artist Spotlight', array['Bollywood Artist Amit Mishra','Ehsaas India Band','DJ Nights','College Band Homeground'], 5, true, 'right'),
  (2025, 'Future Vision', array['Radiant Glow Bands','National Artists','Indo Western Band','Biggest ever in History of RICORRENZA'], 6, true, 'left')
  on conflict do nothing;


-- ========= Source Migration: 20250911091500_register_for_event.sql =========
-- Create a SECURITY DEFINER function to insert a registration and let triggers handle counts
-- This function executes with the owner's privileges to bypass RLS for the insert/trigger path

create or replace function public.register_for_event(
  p_id text,
  p_event_id integer,
  p_event_title text,
  p_participant_type text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_college text,
  p_motivation text,
  p_registration_date timestamptz,
  p_is_team_registration boolean,
  p_team_name text,
  p_team_members jsonb,
  p_total_members integer
) returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id text := coalesce(p_id, 'REG-'||extract(epoch from now())::bigint::text||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)));
begin
  insert into public.registrations(
    id,
    event_id,
    event_title,
    participant_type,
    full_name,
    email,
    phone,
    college,
    motivation,
    registration_date,
    status,
    is_team_registration,
    team_name,
    team_members,
    total_members
  ) values (
    v_id,
    p_event_id,
    p_event_title,
    p_participant_type,
    p_full_name,
    p_email,
    p_phone,
    p_college,
    coalesce(p_motivation, ''),
    coalesce(p_registration_date, now()),
    'pending',
    coalesce(p_is_team_registration, false),
    p_team_name,
    p_team_members,
    coalesce(p_total_members, 1)
  );

  -- Do NOT manually update events here; let triggers (if any) handle counts to avoid double increments.
  return v_id;
end;
$$;

-- Allow public/anon access to execute this function for public forms
grant execute on function public.register_for_event(
  text, integer, text, text, text, text, text, text, text, timestamptz, boolean, text, jsonb, integer
) to anon;


-- ========= Source Migration: 20250911094500_homebound_settings.sql =========
-- HomeBound settings: store Instagram link separately from global social media

create table if not exists public.homebound_settings (
  id integer primary key,
  instagram_url text,
  instagram_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure singleton row with id=1 exists
insert into public.homebound_settings (id, instagram_url, instagram_enabled)
values (1, null, true)
on conflict (id) do nothing;

-- Simple updated_at trigger
create or replace function public.set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

create trigger homebound_settings_set_timestamp
before update on public.homebound_settings
for each row execute procedure public.set_timestamp();

-- RLS and policies
alter table public.homebound_settings enable row level security;

-- Drop any existing policies (idempotent)
do $$
begin
  begin
  exception when undefined_object then null; end;
  begin
  exception when undefined_object then null; end;
end $$;

-- Allow anonymous read so the public page can display the link
DROP POLICY IF EXISTS "anon_select_homebound_settings" ON public.homebound_settings;
create policy "anon_select_homebound_settings"
  on public.homebound_settings
  for select
  to anon
  using (true);

-- Allow authenticated users (admins) to read/update
DROP POLICY IF EXISTS "auth_manage_homebound_settings" ON public.homebound_settings;
create policy "auth_manage_homebound_settings"
  on public.homebound_settings
  for all
  to authenticated
  using (true)
  with check (true);

-- Optional: grants to complement RLS
grant usage on schema public to anon, authenticated;
grant select on table public.homebound_settings to anon;
grant select, insert, update on table public.homebound_settings to authenticated;


-- ========= Source Migration: 20250911100500_remove_cyberpunk_from_text.sql =========
-- Remove occurrences of the word "cyberpunk" from user-visible seeded content
-- This is case-insensitive and removes optional trailing spaces

-- Core team member descriptions (text)
update public.core_team_members
set description = regexp_replace(description, '(?i)cyberpunk[[:space:]]*', '', 'g')
where description ~* 'cyberpunk';

-- Core team member achievements can be either jsonb[] or text[] depending on schema.
-- Detect the column type at runtime and apply the correct transformation.
do $$
declare
  col_type text;
begin
  select atttypid::regtype::text into col_type
  from pg_attribute
  where attrelid = 'public.core_team_members'::regclass
    and attname = 'achievements'
    and not attisdropped;

  if col_type = 'jsonb' then
    -- JSONB array of text values
    update public.core_team_members
    set achievements = (
      select coalesce(
               jsonb_agg(regexp_replace(elem, '(?i)cyberpunk[[:space:]]*', '', 'g')),
               '[]'::jsonb
             )
      from jsonb_array_elements_text(coalesce(achievements, '[]'::jsonb)) as t(elem)
    )
    where achievements::text ~* 'cyberpunk';

  elsif col_type = 'text[]' then
    -- Text array
    update public.core_team_members
    set achievements = (
      select array_agg(regexp_replace(x, '(?i)cyberpunk[[:space:]]*', '', 'g'))
      from unnest(achievements) as x
    )
    where exists (
      select 1 from unnest(achievements) as x where x ~* 'cyberpunk'
    );
  end if;
end $$;


-- ========= Source Migration: 20250911113000_close_audition_membership.sql =========
-- Close auditions and memberships via form_settings flags and RLS-aware policies

-- 1) Ensure form_settings row exists, then disable both forms
insert into public.form_settings (id)
values (1)
on conflict (id) do nothing;

update public.form_settings
set audition_form_enabled = false,
    membership_form_enabled = false,
    updated_at = now()
where id = 1;

-- 2) Gate public inserts into auditions/memberships based on form_settings flags
-- Drop existing permissive insert policies if present and recreate with checks
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'auditions' AND policyname = 'Allow public to create auditions'
  ) THEN
    EXECUTE 'DROP POLICY "Allow public to create auditions" ON public.auditions';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'memberships' AND policyname = 'Allow public to create memberships'
  ) THEN
    EXECUTE 'DROP POLICY "Allow public to create memberships" ON public.memberships';
  END IF;
END $$;

-- Recreate with a WITH CHECK that consults form_settings flags
DROP POLICY IF EXISTS "Allow public to create auditions" ON public.auditions;
create policy "Allow public to create auditions"
  on public.auditions
  for insert
  to anon, authenticated
  with check (
    (select audition_form_enabled from public.form_settings where id = 1) = true
  );

DROP POLICY IF EXISTS "Allow public to create memberships" ON public.memberships;
create policy "Allow public to create memberships"
  on public.memberships
  for insert
  to anon, authenticated
  with check (
    (select membership_form_enabled from public.form_settings where id = 1) = true
  );

-- Note: Reads/updates/deletes policies unchanged


-- ========= Source Migration: 20250911120500_form_settings_fix.sql =========
-- Ensure form_settings row and correct RLS policies/grants so admin updates work

-- 1) Ensure singleton row exists
insert into public.form_settings (id)
values (1)
on conflict (id) do nothing;

-- 2) Ensure RLS is enabled
alter table public.form_settings enable row level security;

-- 3) Reset policies idempotently and recreate
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'form_settings' AND policyname = 'Allow public read access to form_settings'
  ) THEN
    EXECUTE 'DROP POLICY "Allow public read access to form_settings" ON public.form_settings';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'form_settings' AND policyname = 'Allow authenticated users to update form_settings'
  ) THEN
    EXECUTE 'DROP POLICY "Allow authenticated users to update form_settings" ON public.form_settings';
  END IF;
END $$;

DROP POLICY IF EXISTS "Allow public read access to form_settings" ON public.form_settings;
create policy "Allow public read access to form_settings"
  on public.form_settings
  for select
  to anon, authenticated
  using (true);

DROP POLICY IF EXISTS "Allow authenticated users to update form_settings" ON public.form_settings;
create policy "Allow authenticated users to update form_settings"
  on public.form_settings
  for update
  to authenticated
  using (true)
  with check (true);

-- 4) Grants complementing RLS
grant usage on schema public to anon, authenticated;
grant select on table public.form_settings to anon, authenticated;
grant update on table public.form_settings to authenticated;


-- ========= Source Migration: 20250911152000_homepage_carousels.sql =========
-- Add homepage carousel controls and visibility toggles (idempotent)
DO $$
BEGIN
  -- partners (featured sponsors) section toggle
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'homepage_settings' AND column_name = 'featured_partners_enabled'
  ) THEN
    ALTER TABLE public.homepage_settings
      ADD COLUMN featured_partners_enabled boolean NOT NULL DEFAULT true;
  END IF;

  -- leadership section toggles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'homepage_settings' AND column_name = 'show_faculty_heads'
  ) THEN
    ALTER TABLE public.homepage_settings
      ADD COLUMN show_faculty_heads boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'homepage_settings' AND column_name = 'show_committee_heads'
  ) THEN
    ALTER TABLE public.homepage_settings
      ADD COLUMN show_committee_heads boolean NOT NULL DEFAULT true;
  END IF;

  -- carousel speeds (in milliseconds)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'homepage_settings' AND column_name = 'partners_carousel_speed_ms'
  ) THEN
    ALTER TABLE public.homepage_settings
      ADD COLUMN partners_carousel_speed_ms integer NOT NULL DEFAULT 3000;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'homepage_settings' AND column_name = 'leadership_carousel_speed_ms'
  ) THEN
    ALTER TABLE public.homepage_settings
      ADD COLUMN leadership_carousel_speed_ms integer NOT NULL DEFAULT 2500;
  END IF;

  -- Ensure singleton row exists
  INSERT INTO public.homepage_settings (id)
  VALUES (1)
  ON CONFLICT (id) DO NOTHING;
END $$;


-- ========= Source Migration: 20250911160000_gallery_bucket_allow_videos.sql =========
/*
  # Allow video uploads (MP4 & MOV) in gallery-images bucket

  1. Updates bucket constraints to include common image + video mime types
  2. Increases file size limit to 60MB (was unrestricted) for safety
  3. Supports background hero video uploads including QuickTime (video/quicktime)
*/

-- Update allowed mime types and size limit for gallery-images bucket
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime'
],
file_size_limit = 62914560 -- 60MB
WHERE id = 'gallery-images';

-- Safety: ensure bucket exists (idempotent insert if missing)
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-images', 'gallery-images', true)
ON CONFLICT (id) DO NOTHING;

-- Note: existing RLS policies already allow public read & authenticated writes.

-- ========= Source Migration: 20250911160500_hero_media_bucket.sql =========
/*
  # Hero media storage bucket

  Provides dedicated bucket for homepage hero background images & videos.
  Allows MP4, MOV (QuickTime), WEBM plus standard image formats.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hero-media',
  'hero-media',
  true,
  83886080, -- 80MB limit
  ARRAY[
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Public read hero media" ON storage.objects;
CREATE POLICY "Public read hero media" ON storage.objects
  FOR SELECT TO public
  USING ( bucket_id = 'hero-media');

-- Authenticated write policies
DROP POLICY IF EXISTS "Auth insert hero media" ON storage.objects;
CREATE POLICY "Auth insert hero media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK ( bucket_id = 'hero-media');

DROP POLICY IF EXISTS "Auth update hero media" ON storage.objects;
CREATE POLICY "Auth update hero media" ON storage.objects
  FOR UPDATE TO authenticated
  USING ( bucket_id = 'hero-media')
  WITH CHECK ( bucket_id = 'hero-media');

DROP POLICY IF EXISTS "Auth delete hero media" ON storage.objects;
CREATE POLICY "Auth delete hero media" ON storage.objects
  FOR DELETE TO authenticated
  USING ( bucket_id = 'hero-media');

-- ========= Source Migration: 20250911170000_homepage_settings_fix.sql =========
-- Consolidated fix for homepage_settings realtime + columns + policies (idempotent)
-- Safe to re-run.

-- 1. Ensure table exists with minimal primary key
CREATE TABLE IF NOT EXISTS public.homepage_settings (
  id integer PRIMARY KEY
);

-- 2. Ensure all required columns exist with defaults
ALTER TABLE public.homepage_settings
  ADD COLUMN IF NOT EXISTS hero_media_url text,
  ADD COLUMN IF NOT EXISTS hero_media_type text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS hero_title text NOT NULL DEFAULT 'RICORRENZA',
  ADD COLUMN IF NOT EXISTS hero_subtitle text NOT NULL DEFAULT 'Experience the Future',
  ADD COLUMN IF NOT EXISTS hero_description text NOT NULL DEFAULT 'Experience the future of Healthcare, Technology, and Creativity',
  ADD COLUMN IF NOT EXISTS sponsor_logos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sponsor_section_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_section_text text NOT NULL DEFAULT 'Powered by',
  ADD COLUMN IF NOT EXISTS featured_partners_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_faculty_heads boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_committee_heads boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS partners_carousel_speed_ms integer NOT NULL DEFAULT 3000,
  ADD COLUMN IF NOT EXISTS leadership_carousel_speed_ms integer NOT NULL DEFAULT 2500,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3. Maintain updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_homepage_settings_updated_at ON public.homepage_settings;
CREATE TRIGGER trg_homepage_settings_updated_at
BEFORE UPDATE ON public.homepage_settings
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- 4. Ensure singleton row exists
INSERT INTO public.homepage_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 5. Enable RLS
ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;

-- 6. Idempotent policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='homepage_settings_select' AND tablename='homepage_settings'
  ) THEN
DROP POLICY IF EXISTS homepage_settings_select ON public.homepage_settings;
    CREATE POLICY homepage_settings_select
      ON public.homepage_settings FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='homepage_settings_modify' AND tablename='homepage_settings'
  ) THEN
DROP POLICY IF EXISTS homepage_settings_modify ON public.homepage_settings;
    CREATE POLICY homepage_settings_modify
      ON public.homepage_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 7. Add to realtime publication (ignore error if already added)
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_settings';
  EXCEPTION WHEN others THEN
    -- ignore if already in publication
    NULL;
  END;
END $$;

-- 8. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- 9. Verification queries (uncomment to run manually)
-- SELECT column_name FROM information_schema.columns WHERE table_name='homepage_settings' ORDER BY column_name;
-- SELECT * FROM public.homepage_settings WHERE id=1;


-- ========= Source Migration: 20250912090000_gallery_settings.sql =========
-- gallery_settings: singleton configuration for Gallery page animation
create table if not exists public.gallery_settings (
  id integer primary key default 1,
  scroll_per_item integer not null default 650,
  distance integer not null default 1400,
  background_blur_px integer not null default 100,
  card_blur_max integer not null default 8,
  updated_at timestamp with time zone default now()
);

-- Ensure a singleton row exists
insert into public.gallery_settings (id)
  values (1)
  on conflict (id) do nothing;

-- RLS
alter table public.gallery_settings enable row level security;

-- Allow anyone to read settings (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'gallery_settings'
      and policyname = 'gallery_settings_read'
  ) then
DROP POLICY IF EXISTS gallery_settings_read ON public.gallery_settings;
    create policy gallery_settings_read
      on public.gallery_settings for select
      to anon, authenticated
      using (true);
  end if;
end$$;

-- Allow authenticated users to update the singleton row (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'gallery_settings'
      and policyname = 'gallery_settings_update'
  ) then
DROP POLICY IF EXISTS gallery_settings_update ON public.gallery_settings;
    create policy gallery_settings_update
      on public.gallery_settings for update
      to authenticated
      using (id = 1)
      with check (id = 1);
  end if;
end$$;


-- ========= Source Migration: 20250912093000_gallery_settings_reveal.sql =========
-- Adds reveal controls to gallery_settings
-- Safe to run multiple times using IF NOT EXISTS guards where possible

-- Ensure base table exists in case previous migration hasn't run yet
create table if not exists public.gallery_settings (
  id integer primary key default 1,
  scroll_per_item integer not null default 650,
  distance integer not null default 1400,
  background_blur_px integer not null default 100,
  card_blur_max integer not null default 8,
  updated_at timestamp with time zone default now()
);

-- Add boolean flag to enable/disable click reveal overlay
alter table if exists public.gallery_settings
  add column if not exists reveal_enabled boolean not null default true;

-- Add configurable duration for reveal animation (ms)
alter table if exists public.gallery_settings
  add column if not exists reveal_duration_ms integer not null default 800;

-- Orientation for reveal eye animation: 'horizontal' or 'vertical'
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'gallery_settings' and column_name = 'reveal_orientation'
  ) then
    alter table public.gallery_settings add column reveal_orientation text not null default 'horizontal' check (reveal_orientation in ('horizontal','vertical'));
  end if;
end $$;

-- Ensure singleton row has values
insert into public.gallery_settings (id)
values (1)
on conflict (id) do update set
  reveal_enabled = coalesce(public.gallery_settings.reveal_enabled, true),
  reveal_duration_ms = coalesce(public.gallery_settings.reveal_duration_ms, 800),
  reveal_orientation = coalesce(public.gallery_settings.reveal_orientation, 'horizontal');


-- ========= Source Migration: 20250912101000_gallery_settings_one_shot.sql =========
-- One-shot SQL: gallery_settings table + policies + reveal columns
-- Safe to run multiple times; uses DO blocks and IF NOT EXISTS guards

-- 1) Base table
create table if not exists public.gallery_settings (
  id integer primary key default 1,
  scroll_per_item integer not null default 650,
  distance integer not null default 1400,
  background_blur_px integer not null default 100,
  card_blur_max integer not null default 8,
  updated_at timestamp with time zone default now()
);

-- 2) Ensure singleton row exists
insert into public.gallery_settings (id)
  values (1)
  on conflict (id) do nothing;

-- 3) RLS
alter table public.gallery_settings enable row level security;

-- 4) Policies (idempotent via pg_policies)
-- Read
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'gallery_settings'
      and policyname = 'gallery_settings_read'
  ) then
DROP POLICY IF EXISTS gallery_settings_read ON public.gallery_settings;
    create policy gallery_settings_read
      on public.gallery_settings for select
      to anon, authenticated
      using (true);
  end if;
end$$;

-- Update (singleton row only)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'gallery_settings'
      and policyname = 'gallery_settings_update'
  ) then
DROP POLICY IF EXISTS gallery_settings_update ON public.gallery_settings;
    create policy gallery_settings_update
      on public.gallery_settings for update
      to authenticated
      using (id = 1)
      with check (id = 1);
  end if;
end$$;

-- 5) Reveal columns
alter table if exists public.gallery_settings
  add column if not exists reveal_enabled boolean not null default true;

alter table if exists public.gallery_settings
  add column if not exists reveal_duration_ms integer not null default 800;

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'gallery_settings' and column_name = 'reveal_orientation'
  ) then
    alter table public.gallery_settings add column reveal_orientation text not null default 'horizontal' check (reveal_orientation in ('horizontal','vertical'));
  end if;
end $$;

-- 6) Ensure row id=1 has reveal values
insert into public.gallery_settings (id)
values (1)
on conflict (id) do update set
  reveal_enabled = coalesce(public.gallery_settings.reveal_enabled, true),
  reveal_duration_ms = coalesce(public.gallery_settings.reveal_duration_ms, 800),
  reveal_orientation = coalesce(public.gallery_settings.reveal_orientation, 'horizontal');


-- ========= Source Migration: 20250912111000_roadmap_milestones_one_shot.sql =========
-- One-shot, idempotent setup for public.roadmap_milestones
-- Safe to run multiple times

-- 1) Table
create table if not exists public.roadmap_milestones (
  id bigserial primary key,
  year int not null,
  title text,
  points text[] default '{}',
  order_position int not null default 0,
  enabled boolean not null default true,
  side text not null default 'auto' check (side in ('auto','left','right')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Indexes
create index if not exists roadmap_milestones_order_idx on public.roadmap_milestones(order_position);
create index if not exists roadmap_milestones_year_idx on public.roadmap_milestones(year);

-- 3) updated_at trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 4) Trigger
drop trigger if exists trg_roadmap_milestones_updated on public.roadmap_milestones;
create trigger trg_roadmap_milestones_updated
before update on public.roadmap_milestones
for each row execute function public.set_updated_at();

-- 5) RLS and Policies
alter table public.roadmap_milestones enable row level security;

-- Allow read for everyone
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'roadmap_milestones'
      and policyname = 'roadmap_milestones_select'
  ) then
DROP POLICY IF EXISTS "roadmap_milestones_select" ON public.roadmap_milestones;
    create policy "roadmap_milestones_select" on public.roadmap_milestones
      for select using ( true );
  end if;
end$$;

-- Allow authenticated users to modify
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'roadmap_milestones'
      and policyname = 'roadmap_milestones_modify'
  ) then
DROP POLICY IF EXISTS "roadmap_milestones_modify" ON public.roadmap_milestones;
    create policy "roadmap_milestones_modify" on public.roadmap_milestones
      for all using ( auth.role() = 'authenticated' )
      with check ( auth.role() = 'authenticated' );
  end if;
end$$;

-- (Optional) Seed data can be inserted separately to avoid duplication in one-shot scripts


-- ========= Source Migration: 20250912130000_guest_artists_video.sql =========
-- Guest Artists video support: columns + storage bucket + policies (idempotent)

-- 1) Columns for uploaded video and YouTube URL
alter table public.guest_artists
  add column if not exists video_url text,
  add column if not exists youtube_url text;

-- 2) Ensure RLS is enabled and policies exist (read for all, modify for authenticated)
alter table public.guest_artists enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'guest_artists' and policyname = 'guest_artists_select'
  ) then
DROP POLICY IF EXISTS "guest_artists_select" ON public.guest_artists;
    create policy "guest_artists_select" on public.guest_artists for select using ( true );
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'guest_artists' and policyname = 'guest_artists_modify'
  ) then
DROP POLICY IF EXISTS "guest_artists_modify" ON public.guest_artists;
    create policy "guest_artists_modify" on public.guest_artists
      for all using ( auth.role() = 'authenticated' )
      with check ( auth.role() = 'authenticated' );
  end if;
end$$;

-- 3) Storage bucket for videos with public read and authenticated write
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('guest-artist-videos','guest-artist-videos', true, 83886080,  -- 80MB
  array['video/mp4','video/quicktime','video/webm','image/png','image/jpeg','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Drop/recreate policies idempotently
do $$ begin
  if exists (select 1 from pg_policies where policyname = 'Public read guest-artist-videos') then
    drop policy "Public read guest-artist-videos" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where policyname = 'Auth insert guest-artist-videos') then
    drop policy "Auth insert guest-artist-videos" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where policyname = 'Auth update guest-artist-videos') then
    drop policy "Auth update guest-artist-videos" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where policyname = 'Auth delete guest-artist-videos') then
    drop policy "Auth delete guest-artist-videos" on storage.objects;
  end if;
end $$;

DROP POLICY IF EXISTS "Public read guest-artist-videos" ON storage.objects;
create policy "Public read guest-artist-videos" on storage.objects for select to public using (bucket_id = 'guest-artist-videos');
DROP POLICY IF EXISTS "Auth insert guest-artist-videos" ON storage.objects;
create policy "Auth insert guest-artist-videos" on storage.objects for insert to authenticated with check (bucket_id = 'guest-artist-videos');
DROP POLICY IF EXISTS "Auth update guest-artist-videos" ON storage.objects;
create policy "Auth update guest-artist-videos" on storage.objects for update to authenticated using (bucket_id = 'guest-artist-videos') with check (bucket_id = 'guest-artist-videos');
DROP POLICY IF EXISTS "Auth delete guest-artist-videos" ON storage.objects;
create policy "Auth delete guest-artist-videos" on storage.objects for delete to authenticated using (bucket_id = 'guest-artist-videos');


-- ========= Source Migration: 20250912153000_storage_fix_all_buckets.sql =========
/*
  Ensure all storage buckets exist and have correct RLS policies.
  Buckets covered:
    - band-images, event-images, gallery-images, team-images, faculty-images
    - guest-artist-images, guest-artist-videos
    - hero-media, hero-video
    - sponsor-logos
    - documents, pdf

  Policies:
    - Public SELECT (read)
    - INSERT/UPDATE/DELETE for authenticated users

*/

-- Helper: create or update a bucket with given allowed mime types
-- Images + videos
DO $$ BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('band-images','band-images', true, 83886080,
    ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('event-images','event-images', true, 83886080,
    ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('gallery-images','gallery-images', true, 83886080,
    ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('team-images','team-images', true, 83886080,
    ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('faculty-images','faculty-images', true, 83886080,
    ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('guest-artist-images','guest-artist-images', true, 83886080,
    ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('guest-artist-videos','guest-artist-videos', true, 524288000, -- 500MB
    ARRAY['video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('hero-media','hero-media', true, 524288000,
    ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('hero-video','hero-video', true, 524288000,
    ARRAY['video/mp4','video/quicktime','video/webm']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('sponsor-logos','sponsor-logos', true, 83886080,
    ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('documents','documents', true, 104857600,
    ARRAY['application/pdf','image/png','image/jpeg','image/jpg']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('pdf','pdf', true, 104857600,
    ARRAY['application/pdf']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
END $$;

-- Policies per bucket (drop/create)
-- band-images
DROP POLICY IF EXISTS "Public read band-images" ON storage.objects;
CREATE POLICY "Public read band-images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'band-images');
DROP POLICY IF EXISTS "Auth insert band-images" ON storage.objects;
CREATE POLICY "Auth insert band-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'band-images');
DROP POLICY IF EXISTS "Auth update band-images" ON storage.objects;
CREATE POLICY "Auth update band-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'band-images') WITH CHECK (bucket_id = 'band-images');
DROP POLICY IF EXISTS "Auth delete band-images" ON storage.objects;
CREATE POLICY "Auth delete band-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'band-images');

-- event-images
DROP POLICY IF EXISTS "Public read event-images" ON storage.objects;
CREATE POLICY "Public read event-images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'event-images');
DROP POLICY IF EXISTS "Auth insert event-images" ON storage.objects;
CREATE POLICY "Auth insert event-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-images');
DROP POLICY IF EXISTS "Auth update event-images" ON storage.objects;
CREATE POLICY "Auth update event-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'event-images') WITH CHECK (bucket_id = 'event-images');
DROP POLICY IF EXISTS "Auth delete event-images" ON storage.objects;
CREATE POLICY "Auth delete event-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'event-images');

-- gallery-images
DROP POLICY IF EXISTS "Public read gallery-images" ON storage.objects;
CREATE POLICY "Public read gallery-images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'gallery-images');
DROP POLICY IF EXISTS "Auth insert gallery-images" ON storage.objects;
CREATE POLICY "Auth insert gallery-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery-images');
DROP POLICY IF EXISTS "Auth update gallery-images" ON storage.objects;
CREATE POLICY "Auth update gallery-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'gallery-images') WITH CHECK (bucket_id = 'gallery-images');
DROP POLICY IF EXISTS "Auth delete gallery-images" ON storage.objects;
CREATE POLICY "Auth delete gallery-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'gallery-images');

-- team-images
DROP POLICY IF EXISTS "Public read team-images" ON storage.objects;
CREATE POLICY "Public read team-images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'team-images');
DROP POLICY IF EXISTS "Auth insert team-images" ON storage.objects;
CREATE POLICY "Auth insert team-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'team-images');
DROP POLICY IF EXISTS "Auth update team-images" ON storage.objects;
CREATE POLICY "Auth update team-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'team-images') WITH CHECK (bucket_id = 'team-images');
DROP POLICY IF EXISTS "Auth delete team-images" ON storage.objects;
CREATE POLICY "Auth delete team-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'team-images');

-- faculty-images
DROP POLICY IF EXISTS "Public read faculty-images" ON storage.objects;
CREATE POLICY "Public read faculty-images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'faculty-images');
DROP POLICY IF EXISTS "Auth insert faculty-images" ON storage.objects;
CREATE POLICY "Auth insert faculty-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'faculty-images');
DROP POLICY IF EXISTS "Auth update faculty-images" ON storage.objects;
CREATE POLICY "Auth update faculty-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'faculty-images') WITH CHECK (bucket_id = 'faculty-images');
DROP POLICY IF EXISTS "Auth delete faculty-images" ON storage.objects;
CREATE POLICY "Auth delete faculty-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'faculty-images');

-- guest-artist-images
DROP POLICY IF EXISTS "Public read guest-artist-images" ON storage.objects;
CREATE POLICY "Public read guest-artist-images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'guest-artist-images');
DROP POLICY IF EXISTS "Auth insert guest-artist-images" ON storage.objects;
CREATE POLICY "Auth insert guest-artist-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'guest-artist-images');
DROP POLICY IF EXISTS "Auth update guest-artist-images" ON storage.objects;
CREATE POLICY "Auth update guest-artist-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'guest-artist-images') WITH CHECK (bucket_id = 'guest-artist-images');
DROP POLICY IF EXISTS "Auth delete guest-artist-images" ON storage.objects;
CREATE POLICY "Auth delete guest-artist-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'guest-artist-images');

-- guest-artist-videos
DROP POLICY IF EXISTS "Public read guest-artist-videos" ON storage.objects;
CREATE POLICY "Public read guest-artist-videos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'guest-artist-videos');
DROP POLICY IF EXISTS "Auth insert guest-artist-videos" ON storage.objects;
CREATE POLICY "Auth insert guest-artist-videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'guest-artist-videos');
DROP POLICY IF EXISTS "Auth update guest-artist-videos" ON storage.objects;
CREATE POLICY "Auth update guest-artist-videos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'guest-artist-videos') WITH CHECK (bucket_id = 'guest-artist-videos');
DROP POLICY IF EXISTS "Auth delete guest-artist-videos" ON storage.objects;
CREATE POLICY "Auth delete guest-artist-videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'guest-artist-videos');

-- hero-media
DROP POLICY IF EXISTS "Public read hero-media" ON storage.objects;
CREATE POLICY "Public read hero-media" ON storage.objects FOR SELECT TO public USING (bucket_id = 'hero-media');
DROP POLICY IF EXISTS "Auth insert hero-media" ON storage.objects;
CREATE POLICY "Auth insert hero-media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hero-media');
DROP POLICY IF EXISTS "Auth update hero-media" ON storage.objects;
CREATE POLICY "Auth update hero-media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'hero-media') WITH CHECK (bucket_id = 'hero-media');
DROP POLICY IF EXISTS "Auth delete hero-media" ON storage.objects;
CREATE POLICY "Auth delete hero-media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'hero-media');

-- hero-video
DROP POLICY IF EXISTS "Public read hero-video" ON storage.objects;
CREATE POLICY "Public read hero-video" ON storage.objects FOR SELECT TO public USING (bucket_id = 'hero-video');
DROP POLICY IF EXISTS "Auth insert hero-video" ON storage.objects;
CREATE POLICY "Auth insert hero-video" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hero-video');
DROP POLICY IF EXISTS "Auth update hero-video" ON storage.objects;
CREATE POLICY "Auth update hero-video" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'hero-video') WITH CHECK (bucket_id = 'hero-video');
DROP POLICY IF EXISTS "Auth delete hero-video" ON storage.objects;
CREATE POLICY "Auth delete hero-video" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'hero-video');

-- sponsor-logos
DROP POLICY IF EXISTS "Public read sponsor-logos" ON storage.objects;
CREATE POLICY "Public read sponsor-logos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'sponsor-logos');
DROP POLICY IF EXISTS "Auth insert sponsor-logos" ON storage.objects;
CREATE POLICY "Auth insert sponsor-logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sponsor-logos');
DROP POLICY IF EXISTS "Auth update sponsor-logos" ON storage.objects;
CREATE POLICY "Auth update sponsor-logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'sponsor-logos') WITH CHECK (bucket_id = 'sponsor-logos');
DROP POLICY IF EXISTS "Auth delete sponsor-logos" ON storage.objects;
CREATE POLICY "Auth delete sponsor-logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'sponsor-logos');

-- documents
DROP POLICY IF EXISTS "Public read documents" ON storage.objects;
CREATE POLICY "Public read documents" ON storage.objects FOR SELECT TO public USING (bucket_id = 'documents');
DROP POLICY IF EXISTS "Auth insert documents" ON storage.objects;
CREATE POLICY "Auth insert documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
DROP POLICY IF EXISTS "Auth update documents" ON storage.objects;
CREATE POLICY "Auth update documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');
DROP POLICY IF EXISTS "Auth delete documents" ON storage.objects;
CREATE POLICY "Auth delete documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents');

-- pdf
DROP POLICY IF EXISTS "Public read pdf" ON storage.objects;
CREATE POLICY "Public read pdf" ON storage.objects FOR SELECT TO public USING (bucket_id = 'pdf');
DROP POLICY IF EXISTS "Auth insert pdf" ON storage.objects;
CREATE POLICY "Auth insert pdf" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pdf');
DROP POLICY IF EXISTS "Auth update pdf" ON storage.objects;
CREATE POLICY "Auth update pdf" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'pdf') WITH CHECK (bucket_id = 'pdf');
DROP POLICY IF EXISTS "Auth delete pdf" ON storage.objects;
CREATE POLICY "Auth delete pdf" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'pdf');


-- ========= Source Migration: 20250912162000_storage_allow_heic.sql =========
/*
  Allow HEIC/HEIF image MIME types in all image-centric buckets.
  Safe to run multiple times; it updates allowed_mime_types via ON CONFLICT.
*/

DO $$ BEGIN
  -- Helper procedure to upsert bucket allowed types merging existing list with new entries
  PERFORM 1; -- no-op to satisfy DO block
END $$;

-- Update buckets to include HEIC/HEIF
UPDATE storage.buckets
SET allowed_mime_types = (
  SELECT ARRAY(SELECT DISTINCT unnest(coalesce(allowed_mime_types, ARRAY[]::text[]))
               UNION SELECT 'image/heic'
               UNION SELECT 'image/heif')
)
WHERE id IN (
  'band-images','event-images','gallery-images','team-images','faculty-images','guest-artist-images','hero-media','sponsor-logos','documents'
);


-- ========= Source Migration: 20250912170000_events_public_read.sql =========
/*
  # Ensure public read access to events and sane defaults

  1. Security
    - Enable RLS on events (idempotent)
    - Ensure a public SELECT policy exists so the site can read events without auth

  2. Data correctness
    - Ensure the `visible` column exists and default is TRUE
    - Backfill any NULL `visible` values to TRUE so events render publicly
*/

-- Enable Row Level Security (safe if already enabled)
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER TABLE public.events ENABLE ROW LEVEL SECURITY';
  EXCEPTION WHEN others THEN
    -- table may not exist in this project yet; ignore
    NULL;
  END;
END $$;

-- Ensure the `visible` column exists with a default of TRUE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'events'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'visible'
    ) THEN
      EXECUTE 'ALTER TABLE public.events ADD COLUMN visible boolean DEFAULT true';
    END IF;
    -- Ensure default TRUE (in case column existed without default)
    EXECUTE 'ALTER TABLE public.events ALTER COLUMN visible SET DEFAULT true';
    -- Backfill any NULLs to TRUE for existing rows
    EXECUTE 'UPDATE public.events SET visible = true WHERE visible IS NULL';
  END IF;
END $$;

-- Create a public SELECT policy if missing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'events'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'events'
        AND policyname = 'Allow public read access to events'
    ) THEN
      EXECUTE $policy$
DROP POLICY IF EXISTS "Allow public read access to events" ON public.events;
CREATE POLICY "Allow public read access to events"
        ON public.events
        FOR SELECT
        TO anon, authenticated
        USING (true)
      $policy$;
    END IF;
  END IF;
END $$;


-- ========= Source Migration: 20250912191500_band_members_public_read.sql =========
-- Ensure RLS is enabled and allow public read of enabled band members
-- Safe guards to avoid duplicate objects across repeated applies

-- Enable RLS on the table (idempotent: enabling twice is fine)
alter table if exists public.band_members enable row level security;

-- Policy: Public can select only rows where enabled = true
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'band_members'
      and policyname = 'Public read enabled band_members'
  ) then
DROP POLICY IF EXISTS "Public read enabled band_members" ON public.band_members;
create policy "Public read enabled band_members"
      on public.band_members
      for select
      to public
      using (enabled = true);
  end if;
end$$;

-- Helpful index for filters and ordering
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and tablename = 'band_members' and indexname = 'band_members_enabled_order_idx'
  ) then
    CREATE INDEX IF NOT EXISTS band_members_enabled_order_idx ON public.band_members (enabled, order_position);
  end if;
end$$;


-- ========= Source Migration: 20250913094500_safe_delete_event_category.sql =========
-- Safe, atomic deletion of an event category
-- Reassigns dependent events to a fallback category and then deletes the row
-- SECURITY DEFINER bypasses RLS for the internal steps while limiting who can execute

create or replace function public.delete_event_category(
  p_category_id int,
  p_fallback_name text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_removed_name text;
  v_fallback_name text;
begin
  -- Get the name of the category to remove
  select name into v_removed_name
  from event_categories
  where id = p_category_id;

  -- If category doesn't exist, nothing to do
  if v_removed_name is null then
    return;
  end if;

  -- Choose fallback: explicit param, or any other existing, else ensure 'General'
  if p_fallback_name is not null and length(trim(p_fallback_name)) > 0 then
    v_fallback_name := p_fallback_name;
  else
    select name into v_fallback_name
    from event_categories
    where id <> p_category_id
    order by name
    limit 1;
  end if;

  if v_fallback_name is null then
    -- No other category exists; ensure 'General' exists
    insert into event_categories(name, color, description)
    values ('General', '#6B7280', 'Default category')
    on conflict(name) do nothing;
    v_fallback_name := 'General';
  end if;

  -- Reassign events that reference the removed name
  update events
  set category = v_fallback_name
  where category = v_removed_name;

  -- Finally, delete the category row
  delete from event_categories where id = p_category_id;
end;
$$;

-- Lock down function privileges: only authenticated can execute
revoke all on function public.delete_event_category(int, text) from public;
grant execute on function public.delete_event_category(int, text) to authenticated;


-- ========= Source Migration: 20250914000000_remove_partners_carousel_speed_ms.sql =========
-- Migration: Drop unused partners_carousel_speed_ms from homepage_settings
-- Date: 2025-09-14

-- Note: Ensure no application code depends on this column before applying.
-- This migration is irreversible in this file; to revert, you can add the column back manually.

ALTER TABLE public.homepage_settings
  DROP COLUMN IF EXISTS partners_carousel_speed_ms;


-- ========= Source Migration: 20250914094500_events_motion_poster_and_coordinator.sql =========
-- Add motion poster and coordinator fields to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS motion_poster_url text NULL,
ADD COLUMN IF NOT EXISTS coordinator_name text NULL,
ADD COLUMN IF NOT EXISTS coordinator_phone text NULL;

-- Optional: basic length constraint for phone (non-strict to avoid locale issues)
-- ALTER TABLE public.events
--   ADD CONSTRAINT events_coordinator_phone_len CHECK (coordinator_phone IS NULL OR length(coordinator_phone) BETWEEN 7 AND 20);

-- Comment for documentation
COMMENT ON COLUMN public.events.motion_poster_url IS 'Public URL to a short looping video used as motion poster on event card front.';
COMMENT ON COLUMN public.events.coordinator_name IS 'Primary event coordinator name shown on event details.';
COMMENT ON COLUMN public.events.coordinator_phone IS 'Primary event coordinator phone shown on event details.';

-- ========= Source Migration: 20250914101000_event_coordinators.sql =========
CREATE TABLE IF NOT EXISTS public.event_coordinators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id integer REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  role text DEFAULT 'Coordinator',
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.event_coordinators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to event_coordinators" ON public.event_coordinators;
CREATE POLICY "Allow public read access to event_coordinators"
  ON public.event_coordinators FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage event_coordinators" ON public.event_coordinators;
CREATE POLICY "Allow authenticated users to manage event_coordinators"
  ON public.event_coordinators FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ========= Source Migration: 20250914121000_add_contacts_columns.sql =========
-- Add contact fields for faculty heads and core team members
alter table if exists public.faculty_heads
  add column if not exists email text,
  add column if not exists phone text;

alter table if exists public.core_team_members
  add column if not exists phone text;


-- ========= Source Migration: 20250914123000_add_faculty_heads_social_links.sql =========
-- Optional: Add social_links to faculty_heads to store Instagram/YouTube (and others)
alter table if exists public.faculty_heads
  add column if not exists social_links jsonb default '{}'::jsonb;

comment on column public.faculty_heads.social_links is 'Arbitrary social links map, e.g. {"instagram": "https://instagram.com/handle", "youtube": "https://youtube.com/@channel"}';


-- ========= Source Migration: 20250914123500_add_guest_artists_schedule.sql =========
-- Add schedule fields to guest artists: performance datetime, venue, and countdown toggle
alter table if exists public.guest_artists
  add column if not exists performance_at timestamptz null,
  add column if not exists venue text null,
  add column if not exists countdown_enabled boolean default false;

comment on column public.guest_artists.performance_at is 'Scheduled performance datetime (UTC) for countdown display';
comment on column public.guest_artists.venue is 'Venue/location of the performance';
comment on column public.guest_artists.countdown_enabled is 'If true and performance_at present, show a countdown timer';


-- ========= Source Migration: 20250914130500_add_guest_artists_live_now_enabled.sql =========
-- Add live_now_enabled to guest_artists to allow toggling LIVE NOW badge visibility
-- Safe to run multiple times

BEGIN;

ALTER TABLE public.guest_artists
  ADD COLUMN IF NOT EXISTS live_now_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.guest_artists.live_now_enabled IS 'Controls whether LIVE NOW badge is shown after performance start.';

-- Backfill any NULLs to true (older rows)
UPDATE public.guest_artists
SET live_now_enabled = true
WHERE live_now_enabled IS NULL;

COMMIT;


-- ========= Source Migration: 20250915103000_make_core_team_members_fields_optional.sql =========
-- Make core_team_members fields optional to allow empty inserts from admin UI
-- This migration drops NOT NULL constraints on selected columns

begin;

alter table if exists public.core_team_members
  alter column name drop not null,
  alter column role drop not null,
  alter column image drop not null,
  alter column description drop not null,
  alter column specialty drop not null,
  alter column committee_id drop not null;

commit;


-- ========= Source Migration: 20250916093000_events_registration_timer.sql =========
-- Add optional registration timer fields to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registration_timer_enabled boolean DEFAULT false;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registration_opens_at timestamptz NULL;

COMMENT ON COLUMN public.events.registration_timer_enabled IS 'If true, UI can show countdown until registration_opens_at and "LIVE NOW" after that time.';
COMMENT ON COLUMN public.events.registration_opens_at IS 'Timestamp when registration should be considered live for UX (optional).';

-- ========= Source Migration: 20250917000000_drop_single_chief_trigger.sql =========
-- Migration: Drop legacy single-chief-enforcement trigger/function if they exist
-- Date: 2025-09-17
-- This is safe to run multiple times.

BEGIN;

-- If earlier you created a function named enforce_single_chief_guest() and a trigger with the same intent
DROP TRIGGER IF EXISTS enforce_single_chief_guest ON chief_guests;
DROP FUNCTION IF EXISTS enforce_single_chief_guest();

COMMIT;


-- ========= Source Migration: 20250917000100_add_chief_guests.sql =========
/*
  # Add chief guests table and storage setup

  1. New Table
    - `chief_guests`
      - `id` (bigint, primary key, identity)
      - `name` (text, required)
      - `title` (text, required)
      - `image` (text, required) -- public URL to profile image
      - `description` (text, required) -- full bio
      - `specialty` (text, optional)
      - `achievements` (text[])
      - `social_links` (jsonb)
      - `enabled` (boolean) -- global visibility toggle
      - `is_featured` (boolean) -- reserved if later multiple chiefs supported
      - `order_position` (integer) -- for ordering if multiple in future
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - RLS enabled with public read + authenticated CRUD

  3. Storage
    - Create a bucket `chief-guest-images` in Supabase storage (manual or via dashboard)
*/

CREATE TABLE IF NOT EXISTS public.chief_guests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  title text NOT NULL,
  image text NOT NULL,
  description text NOT NULL,
  specialty text,
  achievements text[] DEFAULT '{}',
  social_links jsonb DEFAULT '{}',
  enabled boolean DEFAULT true,
  is_featured boolean DEFAULT true,
  order_position integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.chief_guests ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS chief_guests_select ON public.chief_guests;
CREATE POLICY chief_guests_select ON public.chief_guests
  FOR SELECT USING ( true );

DROP POLICY IF EXISTS chief_guests_insert ON public.chief_guests;
CREATE POLICY chief_guests_insert ON public.chief_guests
  FOR INSERT TO authenticated WITH CHECK ( true );

DROP POLICY IF EXISTS chief_guests_update ON public.chief_guests;
CREATE POLICY chief_guests_update ON public.chief_guests
  FOR UPDATE TO authenticated USING ( true ) WITH CHECK ( true );

DROP POLICY IF EXISTS chief_guests_delete ON public.chief_guests;
CREATE POLICY chief_guests_delete ON public.chief_guests
  FOR DELETE TO authenticated USING ( true );

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_chief_guests()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_chief_guests ON public.chief_guests;
CREATE TRIGGER set_timestamp_chief_guests
BEFORE UPDATE ON public.chief_guests
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_chief_guests();


-- ========= Source Migration: 20250917000100_add_events_watch_live_url.sql =========
-- Add watch_live_url column to events for live streaming link
alter table public.events
  add column if not exists watch_live_url text;

comment on column public.events.watch_live_url is 'Optional live stream URL shown near start time (60m pre-live window, disabled until live).';


-- ========= Source Migration: 20250917120000_add_guest_artists_watch_live_url.sql =========
-- Add watch_live_url column to guest_artists for external live stream links (YouTube, Vimeo, etc.)
-- Safe, idempotent migration.

BEGIN;

ALTER TABLE public.guest_artists
  ADD COLUMN IF NOT EXISTS watch_live_url text;

COMMENT ON COLUMN public.guest_artists.watch_live_url IS 'External URL to watch live performance (YouTube, stream, etc.).';

COMMIT;


-- ========= Source Migration: 20250917160000_schedule_events_links.sql =========
-- Add linkage columns to schedule_events for events and guest artists (idempotent pattern)
DO $$ BEGIN
    -- event_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='schedule_events' AND column_name='event_id'
    ) THEN
        ALTER TABLE public.schedule_events ADD COLUMN event_id integer REFERENCES public.events(id) ON DELETE SET NULL;
    END IF;
    -- guest_artist_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='schedule_events' AND column_name='guest_artist_id'
    ) THEN
        ALTER TABLE public.schedule_events ADD COLUMN guest_artist_id integer REFERENCES public.guest_artists(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'schedule_events linkage migration encountered an error: %', SQLERRM;
END $$;

-- Optional indexes (avoid duplicate creation)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_schedule_events_event_id' AND n.nspname = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_schedule_events_event_id ON public.schedule_events(event_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_schedule_events_guest_artist_id' AND n.nspname = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_schedule_events_guest_artist_id ON public.schedule_events(guest_artist_id);
    END IF;
END $$;

-- ========= Source Migration: 20250918091500_add_map_url_to_events_and_schedule.sql =========
-- Add optional map_url columns to events and schedule_events
-- Idempotent and safe to run multiple times

-- Events: map_url for precise map deep links
ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS map_url TEXT;

-- Schedule events: map_url for unlinked items or overrides
ALTER TABLE IF EXISTS public.schedule_events
  ADD COLUMN IF NOT EXISTS map_url TEXT;

-- Optional: basic comments
COMMENT ON COLUMN public.events.map_url IS 'Optional map URL for the event venue (e.g., Google Maps link)';
COMMENT ON COLUMN public.schedule_events.map_url IS 'Optional map URL for the schedule entry venue (used when not linked to an event)';


-- ========= Source Migration: 20250918091500_branding_fields.sql =========
-- Add branding fields for dynamic logo and year on the site header
-- Safe, idempotent migration: only adds columns if missing

begin;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_url text;

alter table if exists public.homepage_settings
  add column if not exists brand_year integer;

-- Seed singleton row id=1 if table exists but row missing (kept minimal)
insert into public.homepage_settings (id, hero_media_url, hero_media_type, hero_title, hero_subtitle, hero_description, sponsor_logos, sponsor_section_enabled, sponsor_section_text, featured_partners_enabled, show_faculty_heads, show_committee_heads, leadership_carousel_speed_ms, sponsors_belt_speed_px_per_sec, committee_marquee_speed_px_per_sec, sponsors_belt_direction, committee_marquee_direction)
select 1, null, 'image', 'RICORRENZA', 'Experience the Future', 'Experience the future of Healthcare, Technology, and Creativity', '[]'::jsonb, false, 'Powered by', true, true, true, 2500, 140, 75, 'left', 'right'
where not exists (select 1 from public.homepage_settings where id = 1);

-- If year not set, set it to current year for the singleton row
update public.homepage_settings set brand_year = extract(year from now())::int
where id = 1 and brand_year is null;

commit;


-- ========= Source Migration: 20250918093000_about_settings.sql =========
-- Create about_settings table to power the editable About section
-- Idempotent: check existence before creating
do $$ begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'about_settings'
  ) then
    CREATE TABLE IF NOT EXISTS public.about_settings (
      id integer primary key,
      enabled boolean not null default true,
      hero_title text,
      hero_heading text,
      hero_paragraphs jsonb not null default '[]'::jsonb,
      tracks jsonb not null default '[]'::jsonb,
      zones jsonb not null default '[]'::jsonb,
      stats jsonb not null default '[]'::jsonb,
      updated_at timestamptz not null default now()
    );

    -- Seed singleton row (id=1)
    insert into public.about_settings (id, enabled, hero_title, hero_heading, hero_paragraphs, tracks, zones, stats)
    values (
      1,
      true,
      'ABOUT RICORRENZA',
      'THE FUTURE IS NOW',
      to_jsonb(array[
        'RICORRENZA 2025 is not just a festival—it''s a revolution that merges the boundaries between healthcare innovation, cutting-edge technology, and creative expression.',
        'Born from the vision of creating a platform where digital dreams meet reality, RICORRENZA has evolved into the most anticipated festival experience, attracting visionaries, innovators, and creators from across the digital landscape.',
        'Our festival celebrates the convergence of disciplines—where medical students become tech innovators, where artists code their creativity, and where the future of human potential is explored through immersive experiences.'
      ]),
      to_jsonb(array['Healthcare Technology','Digital Arts & Media','Music','Interactive Experiences']),
      to_jsonb(array['Virtual Reality Labs','AI Demonstration Pods','Art Galleries','Future Tech Showcases']),
      to_jsonb(array[
        jsonb_build_object('value','2025','label','FESTIVAL YEAR'),
        jsonb_build_object('value','3+','label','DAYS OF EVENTS'),
        jsonb_build_object('value','1000+','label','PARTICIPANTS'),
        jsonb_build_object('value','∞','label','POSSIBILITIES')
      ])
    )
    on conflict (id) do nothing;
  end if;
end $$;

-- Touch updated_at on update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_about_settings_set_updated_at'
  ) then
    create trigger trg_about_settings_set_updated_at
    before update on public.about_settings
    for each row execute function public.set_updated_at();
  end if;
end $$;


-- ========= Source Migration: 20250918094500_about_settings_rls.sql =========
-- Enable RLS and policies for public.about_settings (idempotent)

-- Ensure table exists before applying RLS/policies
do $$ begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'about_settings'
  ) then
    -- Enable RLS
    execute 'alter table public.about_settings enable row level security';

    -- Public read policy (anon + authenticated)
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'about_settings' and policyname = 'about_settings_read'
    ) then
DROP POLICY IF EXISTS about_settings_read ON public.about_settings;
      create policy about_settings_read
        on public.about_settings for select
        to anon, authenticated
        using (true);
    end if;

    -- Update policy for authenticated users only for singleton row id=1
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'about_settings' and policyname = 'about_settings_update'
    ) then
DROP POLICY IF EXISTS about_settings_update ON public.about_settings;
      create policy about_settings_update
        on public.about_settings for update
        to authenticated
        using (id = 1)
        with check (id = 1);
    end if;

    -- Insert policy for singleton row (id=1) by authenticated users
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'about_settings' and policyname = 'about_settings_insert'
    ) then
DROP POLICY IF EXISTS about_settings_insert ON public.about_settings;
      create policy about_settings_insert
        on public.about_settings for insert
        to authenticated
        with check (id = 1);
    end if;
  end if;
end $$;


-- ========= Source Migration: 20250918103000_brand_logo_controls.sql =========
-- Add admin controls for brand logo size and glow strength
-- Safe/idempotent: only adds columns if missing; sets reasonable defaults

begin;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_size_px integer;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_glow_strength numeric;

-- Ensure singleton row exists (kept minimal)
insert into public.homepage_settings (id)
select 1 where not exists (select 1 from public.homepage_settings where id = 1);

-- Defaults: size = 36px, glow_strength = 1.0
update public.homepage_settings
set 
  brand_logo_size_px = coalesce(brand_logo_size_px, 36),
  brand_logo_glow_strength = coalesce(brand_logo_glow_strength, 1.0)
where id = 1;

commit;


-- ========= Source Migration: 20250918104500_brand_logo_glow_color.sql =========
-- Add admin-configurable glow color for the brand logo
-- Idempotent migration: add column if missing; set default for singleton row

begin;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_glow_color text;

-- Ensure singleton row exists
insert into public.homepage_settings (id)
select 1 where not exists (select 1 from public.homepage_settings where id = 1);

-- Default to theme magenta if null
update public.homepage_settings
set brand_logo_glow_color = coalesce(brand_logo_glow_color, '#ff00ff')
where id = 1;

commit;


-- ========= Source Migration: 20250918110000_registration_photo_toggle.sql =========
-- Add per-event toggle to require participant photo during registration
ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS registration_photo_required boolean DEFAULT false;

-- Add photo URL field to registrations to store uploaded participant photo (leader for teams)
ALTER TABLE IF EXISTS public.registrations
  ADD COLUMN IF NOT EXISTS photo_url text;

-- Note: Ensure Supabase Storage bucket used for public registrations allows anon insert if uploads are from public UI.
-- We currently reuse the 'documents' bucket with path prefix 'registrations/'.


-- ========= Source Migration: 20250918110500_registration_photos_bucket.sql =========
/*
  # Registration Photos Bucket

  - Creates a dedicated bucket `registration-photos` for participant photos uploaded from the public registration form.
  - Public read so admins can export links and PDFs can fetch thumbnails.
  - Allow anonymous inserts so users without auth can upload during registration.
  - Limit mime types to common images and a reasonable size (5MB) where supported.
*/

-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'registration-photos', 'registration-photos', true, 5242880,
       ARRAY['image/png','image/jpeg','image/jpg','image/gif','image/webp']
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'registration-photos'
);

-- Policies
-- Public can read objects from this bucket
DROP POLICY IF EXISTS "Public read registration-photos" ON storage.objects;
CREATE POLICY "Public read registration-photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'registration-photos');

-- Anonymous (and authenticated) users can upload to this bucket
DROP POLICY IF EXISTS "Anon insert registration-photos" ON storage.objects;
CREATE POLICY "Anon insert registration-photos"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'registration-photos');

-- Allow only owners (broadly) to update/delete if authenticated; public shouldn't update/delete
DROP POLICY IF EXISTS "Auth update registration-photos" ON storage.objects;
CREATE POLICY "Auth update registration-photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'registration-photos')
  WITH CHECK (bucket_id = 'registration-photos');

DROP POLICY IF EXISTS "Auth delete registration-photos" ON storage.objects;
CREATE POLICY "Auth delete registration-photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'registration-photos');


-- ========= Source Migration: 20250918111000_brand_logo_position.sql =========
-- Add position controls for brand logo (side + X/Y offsets)
-- Safe/idempotent: add columns only if missing and seed defaults for singleton row

begin;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_side text default 'left';

alter table if exists public.homepage_settings
  add column if not exists brand_logo_offset_x_px integer default 0;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_offset_y_px integer default 0;

-- Seed defaults on singleton row id=1 if present
update public.homepage_settings
set brand_logo_side = coalesce(brand_logo_side, 'left'),
    brand_logo_offset_x_px = coalesce(brand_logo_offset_x_px, 0),
    brand_logo_offset_y_px = coalesce(brand_logo_offset_y_px, 0)
where id = 1;

commit;


-- ========= Source Migration: 20250918111000_register_for_event_add_photo.sql =========
-- Add photo_url to registrations if it doesn't exist and update RPC to accept it
-- Safe to run multiple times

-- 1) Add column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'registrations' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE public.registrations ADD COLUMN photo_url text;
  END IF;
END$$;

-- 2) Update function signature to include p_photo_url and store it
create or replace function public.register_for_event(
  p_id text,
  p_event_id integer,
  p_event_title text,
  p_participant_type text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_college text,
  p_motivation text,
  p_registration_date timestamptz,
  p_is_team_registration boolean,
  p_team_name text,
  p_team_members jsonb,
  p_total_members integer,
  p_photo_url text
) returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id text := coalesce(p_id, 'REG-'||extract(epoch from now())::bigint::text||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)));
begin
  insert into public.registrations(
    id,
    event_id,
    event_title,
    participant_type,
    full_name,
    email,
    phone,
    college,
    motivation,
    registration_date,
    status,
    is_team_registration,
    team_name,
    team_members,
    total_members,
    photo_url
  ) values (
    v_id,
    p_event_id,
    p_event_title,
    p_participant_type,
    p_full_name,
    p_email,
    p_phone,
    p_college,
    coalesce(p_motivation, ''),
    coalesce(p_registration_date, now()),
    'pending',
    coalesce(p_is_team_registration, false),
    p_team_name,
    p_team_members,
    coalesce(p_total_members, 1),
    p_photo_url
  );

  return v_id;
end;
$$;

-- 3) Grant execute to anon/public (for public forms)
GRANT EXECUTE ON FUNCTION public.register_for_event(
  text, integer, text, text, text, text, text, text, text, timestamptz, boolean, text, jsonb, integer, text
) TO anon;
GRANT EXECUTE ON FUNCTION public.register_for_event(
  text, integer, text, text, text, text, text, text, text, timestamptz, boolean, text, jsonb, integer, text
) TO public;

-- 4) Nudge PostgREST to reload
NOTIFY pgrst, 'reload schema';


-- ========= Source Migration: 20250918113000_brand_logo_responsive_offsets.sql =========
-- Add responsive per-breakpoint offsets for brand logo (sm/md/lg), nullable
-- Safe/idempotent: add columns only if missing

begin;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_offset_x_sm_px integer;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_offset_y_sm_px integer;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_offset_x_md_px integer;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_offset_y_md_px integer;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_offset_x_lg_px integer;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_offset_y_lg_px integer;

commit;


-- ========= Source Migration: 20250918120000_add_event_registration_photo_label.sql =========
-- Add a customizable label for the registration photo field per event
alter table if exists public.events
  add column if not exists registration_photo_label text;

-- No default needed; UI will fallback when null/empty.

-- ========= Source Migration: 20250918_add_loader_and_intro_fields.sql =========


-- ========= Source Migration: 20250918_allow_svg_uploads.sql =========


-- ========= Source Migration: 20250919121500_registration_photos.sql =========
-- Migration: registration photos feature
-- Date: 2025-09-19

-- 1) Add optional registration photo controls to events
alter table if exists public.events
  add column if not exists registration_photo_required boolean not null default false,
  add column if not exists registration_photo_label text;

-- 2) Add optional photo_url to registrations to store the uploaded photo reference (public URL or signed path)
alter table if exists public.registrations
  add column if not exists photo_url text;

-- Helpful index for lookups/cleanup by photo_url
create index if not exists registrations_photo_url_idx on public.registrations (photo_url);

-- 3) Ensure a dedicated Storage bucket exists for registration photos
insert into storage.buckets (id, name, public)
values ('registration-photos', 'registration-photos', false)
on conflict (id) do nothing;

-- 4) Storage policies: allow authenticated users (e.g., admins) to manage objects in the bucket
-- Enable fine-grained access for the specific bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'regphotos_select_authenticated'
  ) THEN
DROP POLICY IF EXISTS "regphotos_select_authenticated" ON storage.objects;
CREATE POLICY "regphotos_select_authenticated"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'registration-photos');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'regphotos_insert_authenticated'
  ) THEN
DROP POLICY IF EXISTS "regphotos_insert_authenticated" ON storage.objects;
CREATE POLICY "regphotos_insert_authenticated"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'registration-photos');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'regphotos_update_authenticated'
  ) THEN
DROP POLICY IF EXISTS "regphotos_update_authenticated" ON storage.objects;
CREATE POLICY "regphotos_update_authenticated"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'registration-photos')
      WITH CHECK (bucket_id = 'registration-photos');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'regphotos_delete_authenticated'
  ) THEN
DROP POLICY IF EXISTS "regphotos_delete_authenticated" ON storage.objects;
CREATE POLICY "regphotos_delete_authenticated"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'registration-photos');
  END IF;
END
$$;

-- 5) Ask PostgREST to reload schema so new columns are visible
-- (safe to run even if PostgREST isn't listening on this channel in some environments)
DO $$ BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN others THEN
  -- ignore in case of restricted permissions
  NULL;
END $$;

-- ========= Source Migration: 20250919140000_roadmap_milestones_public_read.sql =========
-- Ensure roadmap_milestones is readable anonymously and modifiable by authenticated users
-- Safe to run multiple times

-- Table exists check is handled by IF NOT EXISTS here so repeated runs are safe
create table if not exists public.roadmap_milestones (
  id bigserial primary key,
  year int not null,
  title text,
  points text[] default '{}',
  order_position int not null default 0,
  enabled boolean not null default true,
  side text not null default 'auto' check (side in ('auto','left','right')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists roadmap_milestones_order_idx on public.roadmap_milestones(order_position);
create index if not exists roadmap_milestones_year_idx on public.roadmap_milestones(year);

-- Updated at trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_roadmap_milestones_updated on public.roadmap_milestones;
create trigger trg_roadmap_milestones_updated
before update on public.roadmap_milestones
for each row execute function public.set_updated_at();

alter table public.roadmap_milestones enable row level security;

-- Policies: anonymous SELECT, authenticated ALL
-- Drop if exists then create to avoid IF NOT EXISTS syntax issues
DROP POLICY IF EXISTS "roadmap_milestones_select" ON public.roadmap_milestones;
create policy "roadmap_milestones_select" on public.roadmap_milestones
  for select using ( true );

DROP POLICY IF EXISTS "roadmap_milestones_modify" ON public.roadmap_milestones;
create policy "roadmap_milestones_modify" on public.roadmap_milestones
  for all using ( auth.role() = 'authenticated' )
  with check ( auth.role() = 'authenticated' );


-- ========= Source Migration: 20250919_remove_map_url.sql =========
-- Drop map_url columns now that the app no longer uses them
-- Safe-guarded with IF EXISTS to avoid errors if already removed

-- Events table
ALTER TABLE IF EXISTS public.events
  DROP COLUMN IF EXISTS map_url;

-- Schedule events table
ALTER TABLE IF EXISTS public.schedule_events
  DROP COLUMN IF EXISTS map_url;


-- ========= Source Migration: 20250920091500_add_ended_text_to_site_settings.sql =========
-- Add ended text for Coming Soon countdown to site_settings

alter table if exists public.site_settings
	add column if not exists coming_soon_ended_text text null;

comment on column public.site_settings.coming_soon_ended_text is 'Text shown after Coming Soon countdown finishes (while site remains closed)';

-- Ensure PostgREST schema cache reloads so the new column is visible immediately
do $$ begin
	perform pg_notify('pgrst', 'reload schema');
exception when others then null; end $$;



-- ========= Source Migration: 20250920091500_site_settings.sql =========
-- site_settings singleton for global Coming Soon/Maintenance
-- Creates a single-row table (id=1) controlling public site gating

create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  site_closed boolean not null default false,
  coming_soon_enabled boolean not null default false,
  coming_soon_until timestamptz null,
  coming_soon_title text null,
  coming_soon_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.trg_site_settings_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_site_settings_set_updated_at on public.site_settings;
create trigger trg_site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.trg_site_settings_updated_at();

-- seed singleton row
insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

-- RLS
alter table public.site_settings enable row level security;

-- Allow anyone to read (public site needs to know gating state)
DROP POLICY IF EXISTS site_settings_select ON public.site_settings;
create policy site_settings_select on public.site_settings
for select using (true);

-- Note: Update policy is intentionally not created here.
-- A later migration (20250920095500_site_settings_admin_rls.sql) adds an admin-only update policy via public.is_admin().

-- Ensure PostgREST schema cache reloads in hosted environments
do $$ begin
  perform pg_notify('pgrst', 'reload schema');
exception when others then null; end $$;


-- ========= Source Migration: 20250920095500_site_settings_admin_rls.sql =========
-- Tighten site_settings updates to admin-only via admin_users + is_admin()

-- Admin users table referencing auth.users
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Helper: determine if current auth.uid() is an admin
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  );
$$;

-- Policies for admin_users
-- Read: allow authenticated to read (useful for UI visibility); the table contains only emails/uuids
DROP POLICY IF EXISTS admin_users_select_all ON public.admin_users;
create policy admin_users_select_all on public.admin_users
for select to authenticated using (true);

-- Insert: allow bootstrap by any authenticated user if table is empty; otherwise only admins can add others
DROP POLICY IF EXISTS admin_users_insert ON public.admin_users;
create policy admin_users_insert on public.admin_users
for insert to authenticated
with check (
  public.is_admin() OR NOT EXISTS (select 1 from public.admin_users)
);

-- Update/Delete: only admins
DROP POLICY IF EXISTS admin_users_update ON public.admin_users;
create policy admin_users_update on public.admin_users
for update to authenticated using (public.is_admin()) with check (public.is_admin());

DROP POLICY IF EXISTS admin_users_delete ON public.admin_users;
create policy admin_users_delete on public.admin_users
for delete to authenticated using (public.is_admin());

-- Now restrict site_settings update to admins only
DROP POLICY IF EXISTS site_settings_update ON public.site_settings;
create policy site_settings_update on public.site_settings
for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Keep public read of site_settings for gating
DROP POLICY IF EXISTS site_settings_select ON public.site_settings;
create policy site_settings_select on public.site_settings
for select using (true);

-- Convenience RPC: add admin by email (the user must already exist in auth.users)
-- Rules:
--  - If admin_users is empty, allow bootstrap by any authenticated caller
--  - Otherwise, only existing admins can add another admin
--  - Looks up auth.users.id by email and inserts into admin_users
create or replace function public.add_admin_by_email(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid;
  v_exists boolean;
  v_has_admin boolean;
begin
  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'INVALID_EMAIL';
  end if;
  select exists(select 1 from public.admin_users) into v_has_admin;
  if v_has_admin and not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  select u.id into v_uid from auth.users u where lower(u.email) = lower(p_email) limit 1;
  if v_uid is null then
    raise exception 'NO_SUCH_USER';
  end if;
  select exists(select 1 from public.admin_users a where a.user_id = v_uid) into v_exists;
  if v_exists then
    return true; -- already admin, treat as success
  end if;
  insert into public.admin_users(user_id, email) values (v_uid, p_email)
  on conflict (user_id) do nothing;
  return true;
end;
$$;

-- Only authenticated users can call; function enforces admin/bootstrapping internally
revoke execute on function public.add_admin_by_email(text) from public;
grant execute on function public.add_admin_by_email(text) to authenticated;

-- Ask PostgREST to reload
do $$ begin
  perform pg_notify('pgrst', 'reload schema');
exception when others then null; end $$;


-- ========= Source Migration: 20250920100500_site_settings_insert_policy.sql =========
-- Allow INSERT on site_settings for admins (fix upsert RLS error)

-- Context:
--  - We already allow SELECT for everyone (public gating) and UPDATE for authenticated admins via public.is_admin().
--  - The UI performs an upsert(id=1, ...). If the singleton row was never created or was deleted, the upsert
--    becomes an INSERT, which previously violated RLS because no INSERT policy existed.
--
-- Change:
--  - Add an INSERT policy restricted to authenticated users who are admins (public.is_admin()).

do $$ begin
  perform 1 from pg_tables where schemaname='public' and tablename='site_settings';
exception when others then null; end $$;

-- Ensure RLS is enabled (safe if already enabled)
do $$ begin
  execute 'alter table public.site_settings enable row level security';
exception when others then null; end $$;

-- Create/replace INSERT policy
DROP POLICY IF EXISTS site_settings_insert ON public.site_settings;
create policy site_settings_insert on public.site_settings
for insert to authenticated
with check (public.is_admin());

-- Keep existing policies (select/update) as defined in earlier migrations.

-- Ask PostgREST to reload policies
do $$ begin
  perform pg_notify('pgrst', 'reload schema');
exception when others then null; end $$;


-- ========= Source Migration: 20250920123000_admin_owner_roles.sql =========
-- Introduce owner role and protect primary admin from removal

-- Create enum for roles
do $$ begin
  create type public.admin_role as enum ('owner', 'admin');
exception when duplicate_object then null; end $$;

-- Add role column (default 'admin') and optional is_primary flag (for clarity)
do $$ begin
  alter table public.admin_users add column if not exists role public.admin_role not null default 'admin';
exception when undefined_table then null; end $$;

-- Optional clear marker; not required if using role enum alone
do $$ begin
  alter table public.admin_users add column if not exists is_primary boolean not null default false;
exception when undefined_table then null; end $$;

-- Ensure only one owner exists
do $$ begin
  create unique index if not exists admin_users_single_owner on public.admin_users ((role)) where role = 'owner';
exception when others then null; end $$;

-- Helper: determine if current auth.uid() is the owner
create or replace function public.is_owner()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid() and a.role = 'owner'
  );
$$;

-- Keep is_admin() broad: any row in admin_users
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  );
$$;

-- Tighten admin_users policies: only OWNER can add/remove/update after bootstrap
DROP POLICY IF EXISTS admin_users_insert ON public.admin_users;
create policy admin_users_insert on public.admin_users
for insert to authenticated
with check (
  -- Allow inserts if caller is owner OR if there is no owner yet (ownerless recovery)
  public.is_owner() OR NOT EXISTS (
    select 1 from public.admin_users where role = 'owner'
  )
);

DROP POLICY IF EXISTS admin_users_update ON public.admin_users;
create policy admin_users_update on public.admin_users
for update to authenticated
using (
  -- Allow updates if caller is owner OR if there is no owner yet (ownerless recovery)
  public.is_owner() OR NOT EXISTS (
    select 1 from public.admin_users where role = 'owner'
  )
) with check (
  public.is_owner() OR NOT EXISTS (
    select 1 from public.admin_users where role = 'owner'
  )
);

DROP POLICY IF EXISTS admin_users_delete ON public.admin_users;
create policy admin_users_delete on public.admin_users
for delete to authenticated
using (public.is_owner() AND role <> 'owner');

-- Ensure site_settings update remains for any admin (owner or regular admin)
DROP POLICY IF EXISTS site_settings_update ON public.site_settings;
create policy site_settings_update on public.site_settings
for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Update RPC to set first admin as OWNER and mark is_primary
create or replace function public.add_admin_by_email(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid;
  v_exists boolean;
  v_has_admin boolean;
  v_has_owner boolean;
  v_role public.admin_role := 'admin';
begin
  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'INVALID_EMAIL';
  end if;
  select exists(select 1 from public.admin_users) into v_has_admin;
  select exists(select 1 from public.admin_users where role = 'owner') into v_has_owner;
  -- If an owner already exists, only the owner can add more admins
  if v_has_owner and not public.is_owner() then
    raise exception 'NOT_OWNER';
  end if;
  -- If there is no owner yet (even if admins exist), promote this email to owner
  if not v_has_owner then
    v_role := 'owner';
  end if;
  select u.id into v_uid from auth.users u where lower(u.email) = lower(p_email) limit 1;
  if v_uid is null then
    raise exception 'NO_SUCH_USER';
  end if;
  select exists(select 1 from public.admin_users a where a.user_id = v_uid) into v_exists;
  if v_exists then
    return true; -- already admin, treat as success
  end if;
  insert into public.admin_users(user_id, email, role, is_primary)
  values (v_uid, p_email, v_role, (v_role = 'owner'))
  on conflict (user_id) do nothing;
  return true;
end;
$$;

revoke execute on function public.add_admin_by_email(text) from public;
grant execute on function public.add_admin_by_email(text) to authenticated;

-- Ask PostgREST to reload
do $$ begin
  perform pg_notify('pgrst', 'reload schema');
exception when others then null; end $$;

-- If there are admins but no owner (e.g., pre-existing records before this migration),
-- auto-promote the first admin to owner to avoid ownerless lockout.
do $$
begin
  if exists (select 1 from public.admin_users)
     and not exists (select 1 from public.admin_users where role = 'owner') then
    update public.admin_users
    set role = 'owner', is_primary = true
    where user_id = (select user_id from public.admin_users limit 1);
  end if;
exception when others then
  -- best-effort; ignore if table missing or other issues
  null;
end $$;


-- ========= Source Migration: 20250920150000_admin_permissions.sql =========
-- Per-admin granular permissions managed by Owner

-- 1) Table: public.admin_permissions
create table if not exists public.admin_permissions (
  user_id uuid primary key references public.admin_users(user_id) on delete cascade,
  -- sections the admin can manage
  can_events boolean not null default false,
  -- future: can_sponsors, can_gallery, etc.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.trg_admin_permissions_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_admin_permissions_set_updated_at on public.admin_permissions;
create trigger trg_admin_permissions_set_updated_at
before update on public.admin_permissions
for each row execute function public.trg_admin_permissions_updated_at();

alter table public.admin_permissions enable row level security;

-- Helper: does current user have a named permission?
create or replace function public.has_permission(p_section text)
returns boolean
language plpgsql
stable
as $$
declare v boolean;
begin
  -- owner always permitted
  if public.is_owner() then return true; end if;
  if p_section = 'events' then
    select ap.can_events into v from public.admin_permissions ap where ap.user_id = auth.uid();
    return coalesce(v,false);
  end if;
  return false;
end;
$$;

-- Policies: only OWNER can insert/update/delete; admins can read their own row
DROP POLICY IF EXISTS admin_permissions_select ON public.admin_permissions;
create policy admin_permissions_select on public.admin_permissions
for select to authenticated
using (user_id = auth.uid() or public.is_owner());

DROP POLICY IF EXISTS admin_permissions_insert ON public.admin_permissions;
create policy admin_permissions_insert on public.admin_permissions
for insert to authenticated
with check (public.is_owner());

DROP POLICY IF EXISTS admin_permissions_update ON public.admin_permissions;
create policy admin_permissions_update on public.admin_permissions
for update to authenticated
using (public.is_owner()) with check (public.is_owner());

DROP POLICY IF EXISTS admin_permissions_delete ON public.admin_permissions;
create policy admin_permissions_delete on public.admin_permissions
for delete to authenticated
using (public.is_owner());

-- Ensure schema cache refresh
do $$ begin perform pg_notify('pgrst', 'reload schema'); exception when others then null; end $$;


-- ========= Source Migration: 20250920150500_events_rls_permissions.sql =========
-- Enforce that only Owner or admins with can_events may modify events
do $$ begin
  perform 1 from pg_tables where schemaname='public' and tablename='events';
exception when others then null; end $$;

alter table if exists public.events enable row level security;

-- Select policy remains open to public (site content), if you previously had a policy; otherwise allow all select
DROP POLICY IF EXISTS events_select_all ON public.events;
create policy events_select_all on public.events
for select using (true);

-- Insert/Update/Delete require owner or events permission
DROP POLICY IF EXISTS events_modify ON public.events;
create policy events_modify on public.events
for all to authenticated
using (public.has_permission('events'))
with check (public.has_permission('events'));

-- Reload schema
do $$ begin perform pg_notify('pgrst', 'reload schema'); exception when others then null; end $$;


-- ========= Source Migration: 20250920160000_admin_permissions_expand.sql =========
-- Expand admin_permissions with more granular flags and extend has_permission()
-- Sections covered: events (existing), schedule, gallery, sponsors, registrations,
-- registration_photos (storage), faculty, core_team, guest_artists, chief_guests, homebound

-- 1) Add new boolean columns with default false
alter table if exists public.admin_permissions
  add column if not exists can_schedule boolean not null default false,
  add column if not exists can_gallery boolean not null default false,
  add column if not exists can_sponsors boolean not null default false,
  add column if not exists can_registrations boolean not null default false,
  add column if not exists can_registration_photos boolean not null default false,
  add column if not exists can_faculty boolean not null default false,
  add column if not exists can_core_team boolean not null default false,
  add column if not exists can_guest_artists boolean not null default false,
  add column if not exists can_chief_guests boolean not null default false,
  add column if not exists can_homebound boolean not null default false;

-- 2) Replace has_permission(section) to support new flags
drop function if exists public.has_permission(text);
create or replace function public.has_permission(p_section text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_owner boolean := false;
  v_perm record;
begin
  if v_uid is null then
    return false;
  end if;

  -- Owner has all permissions
  select public.is_owner() into v_is_owner;
  if coalesce(v_is_owner, false) then
    return true;
  end if;

  -- Fetch permission row once
  select * into v_perm from public.admin_permissions where user_id = v_uid::text limit 1;
  if not found then
    return false;
  end if;

  case lower(trim(p_section))
    when 'events' then return coalesce(v_perm.can_events, false);
    when 'schedule' then return coalesce(v_perm.can_schedule, false);
    when 'gallery' then return coalesce(v_perm.can_gallery, false);
    when 'sponsors' then return coalesce(v_perm.can_sponsors, false);
    when 'registrations' then return coalesce(v_perm.can_registrations, false);
    when 'registration_photos' then return coalesce(v_perm.can_registration_photos, false);
    when 'faculty' then return coalesce(v_perm.can_faculty, false);
    when 'core_team' then return coalesce(v_perm.can_core_team, false);
    when 'guest_artists' then return coalesce(v_perm.can_guest_artists, false);
    when 'chief_guests' then return coalesce(v_perm.can_chief_guests, false);
    when 'homebound' then return coalesce(v_perm.can_homebound, false);
    else return false;
  end case;
end $$;

-- 3) Notify PostgREST to reload schema so new function signature is visible immediately
do $$ begin perform pg_notify('pgrst', 'reload schema'); exception when others then null; end $$;


-- ========= Source Migration: 20250920160500_permissions_rls_policies.sql =========
-- Apply/align RLS policies for multiple sections using has_permission()

-- Helper: enable RLS if not enabled, safe to run repeatedly
do $$ begin
  begin alter table public.schedule_days enable row level security; exception when others then null; end;
  begin alter table public.schedule_events enable row level security; exception when others then null; end;
  begin alter table public.gallery_images enable row level security; exception when others then null; end;
  begin alter table public.sponsors enable row level security; exception when others then null; end;
  begin alter table public.registrations enable row level security; exception when others then null; end;
  begin alter table public.faculty_heads enable row level security; exception when others then null; end;
  begin alter table public.core_committees enable row level security; exception when others then null; end;
  begin alter table public.core_team_members enable row level security; exception when others then null; end;
  begin alter table public.guest_artists enable row level security; exception when others then null; end;
  begin alter table public.chief_guests enable row level security; exception when others then null; end;
  begin alter table public.homebound_settings enable row level security; exception when others then null; end;
  begin alter table public.sponsorship_settings enable row level security; exception when others then null; end;
  begin alter table public.sponsorship_packages enable row level security; exception when others then null; end;
end $$;

-- Public read policies (if they don't already exist). For brevity, allow select to all; adjust if needed.
-- Public SELECT policies (idempotent)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='gallery_images' and policyname='sel_gallery') then
DROP POLICY IF EXISTS sel_gallery ON public.gallery_images;
    create policy sel_gallery on public.gallery_images for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sponsors' and policyname='sel_sponsors') then
DROP POLICY IF EXISTS sel_sponsors ON public.sponsors;
    create policy sel_sponsors on public.sponsors for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='schedule_days' and policyname='sel_schedule_days') then
DROP POLICY IF EXISTS sel_schedule_days ON public.schedule_days;
    create policy sel_schedule_days on public.schedule_days for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='schedule_events' and policyname='sel_schedule_events') then
DROP POLICY IF EXISTS sel_schedule_events ON public.schedule_events;
    create policy sel_schedule_events on public.schedule_events for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='registrations' and policyname='sel_registrations') then
DROP POLICY IF EXISTS sel_registrations ON public.registrations;
    create policy sel_registrations on public.registrations for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='faculty_heads' and policyname='sel_faculty_heads') then
DROP POLICY IF EXISTS sel_faculty_heads ON public.faculty_heads;
    create policy sel_faculty_heads on public.faculty_heads for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='core_committees' and policyname='sel_core_committees') then
DROP POLICY IF EXISTS sel_core_committees ON public.core_committees;
    create policy sel_core_committees on public.core_committees for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='core_team_members' and policyname='sel_core_team_members') then
DROP POLICY IF EXISTS sel_core_team_members ON public.core_team_members;
    create policy sel_core_team_members on public.core_team_members for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='guest_artists' and policyname='sel_guest_artists') then
DROP POLICY IF EXISTS sel_guest_artists ON public.guest_artists;
    create policy sel_guest_artists on public.guest_artists for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='chief_guests' and policyname='sel_chief_guests') then
DROP POLICY IF EXISTS sel_chief_guests ON public.chief_guests;
    create policy sel_chief_guests on public.chief_guests for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='homebound_settings' and policyname='sel_homebound_settings') then
DROP POLICY IF EXISTS sel_homebound_settings ON public.homebound_settings;
    create policy sel_homebound_settings on public.homebound_settings for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sponsorship_settings' and policyname='sel_sponsorship_settings') then
DROP POLICY IF EXISTS sel_sponsorship_settings ON public.sponsorship_settings;
    create policy sel_sponsorship_settings on public.sponsorship_settings for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sponsorship_packages' and policyname='sel_sponsorship_packages') then
DROP POLICY IF EXISTS sel_sponsorship_packages ON public.sponsorship_packages;
    create policy sel_sponsorship_packages on public.sponsorship_packages for select using (true);
  end if;
end $$;

-- Modify policies
-- Modify (ALL) policies (idempotent)
do $$ begin
  -- Schedule
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='schedule_days' and policyname='mod_schedule_days') then
DROP POLICY IF EXISTS mod_schedule_days ON public.schedule_days;
    create policy mod_schedule_days on public.schedule_days for all using (public.is_owner() or public.has_permission('schedule')) with check (public.is_owner() or public.has_permission('schedule'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='schedule_events' and policyname='mod_schedule_events') then
DROP POLICY IF EXISTS mod_schedule_events ON public.schedule_events;
    create policy mod_schedule_events on public.schedule_events for all using (public.is_owner() or public.has_permission('schedule')) with check (public.is_owner() or public.has_permission('schedule'));
  end if;

  -- Gallery
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='gallery_images' and policyname='mod_gallery_images') then
DROP POLICY IF EXISTS mod_gallery_images ON public.gallery_images;
    create policy mod_gallery_images on public.gallery_images for all using (public.is_owner() or public.has_permission('gallery')) with check (public.is_owner() or public.has_permission('gallery'));
  end if;

  -- Sponsors
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sponsors' and policyname='mod_sponsors') then
DROP POLICY IF EXISTS mod_sponsors ON public.sponsors;
    create policy mod_sponsors on public.sponsors for all using (public.is_owner() or public.has_permission('sponsors')) with check (public.is_owner() or public.has_permission('sponsors'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sponsorship_settings' and policyname='mod_sponsorship_settings') then
DROP POLICY IF EXISTS mod_sponsorship_settings ON public.sponsorship_settings;
    create policy mod_sponsorship_settings on public.sponsorship_settings for all using (public.is_owner() or public.has_permission('sponsors')) with check (public.is_owner() or public.has_permission('sponsors'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sponsorship_packages' and policyname='mod_sponsorship_packages') then
DROP POLICY IF EXISTS mod_sponsorship_packages ON public.sponsorship_packages;
    create policy mod_sponsorship_packages on public.sponsorship_packages for all using (public.is_owner() or public.has_permission('sponsors')) with check (public.is_owner() or public.has_permission('sponsors'));
  end if;

  -- Registrations
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='registrations' and policyname='mod_registrations') then
DROP POLICY IF EXISTS mod_registrations ON public.registrations;
    create policy mod_registrations on public.registrations for all using (public.is_owner() or public.has_permission('registrations')) with check (public.is_owner() or public.has_permission('registrations'));
  end if;

  -- Faculty / Core team
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='faculty_heads' and policyname='mod_faculty_heads') then
DROP POLICY IF EXISTS mod_faculty_heads ON public.faculty_heads;
    create policy mod_faculty_heads on public.faculty_heads for all using (public.is_owner() or public.has_permission('faculty')) with check (public.is_owner() or public.has_permission('faculty'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='core_committees' and policyname='mod_core_committees') then
DROP POLICY IF EXISTS mod_core_committees ON public.core_committees;
    create policy mod_core_committees on public.core_committees for all using (public.is_owner() or public.has_permission('core_team')) with check (public.is_owner() or public.has_permission('core_team'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='core_team_members' and policyname='mod_core_team_members') then
DROP POLICY IF EXISTS mod_core_team_members ON public.core_team_members;
    create policy mod_core_team_members on public.core_team_members for all using (public.is_owner() or public.has_permission('core_team')) with check (public.is_owner() or public.has_permission('core_team'));
  end if;

  -- Artists
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='guest_artists' and policyname='mod_guest_artists') then
DROP POLICY IF EXISTS mod_guest_artists ON public.guest_artists;
    create policy mod_guest_artists on public.guest_artists for all using (public.is_owner() or public.has_permission('guest_artists')) with check (public.is_owner() or public.has_permission('guest_artists'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='chief_guests' and policyname='mod_chief_guests') then
DROP POLICY IF EXISTS mod_chief_guests ON public.chief_guests;
    create policy mod_chief_guests on public.chief_guests for all using (public.is_owner() or public.has_permission('chief_guests')) with check (public.is_owner() or public.has_permission('chief_guests'));
  end if;

  -- Homebound
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='homebound_settings' and policyname='mod_homebound_settings') then
DROP POLICY IF EXISTS mod_homebound_settings ON public.homebound_settings;
    create policy mod_homebound_settings on public.homebound_settings for all using (public.is_owner() or public.has_permission('homebound')) with check (public.is_owner() or public.has_permission('homebound'));
  end if;
end $$;

-- Note: Registration Photos are stored in Storage. Bucket-level RLS isn't managed here; access is via Supabase Storage policies.
-- If you use a SQL view/table referencing storage.objects, add similar policies accordingly.

-- Notify PostgREST to pick up policy changes
do $$ begin perform pg_notify('pgrst', 'reload schema'); exception when others then null; end $$;


-- ========= Source Migration: 20250920161000_storage_registration_photos_policies.sql =========
-- Storage policies for private bucket registration-photos
-- Allow read/write only to Owner or admins with can_registration_photos

-- Create policies on storage.objects for bucket 'registration-photos' (idempotent)
do $$ begin
  -- Select (list/read metadata) policy
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'sel_reg_photos'
  ) then
DROP POLICY IF EXISTS sel_reg_photos ON storage.objects;
    create policy sel_reg_photos on storage.objects
      for select
      using (
        bucket_id = 'registration-photos'
        and (public.is_owner() or public.has_permission('registration_photos'))
      );
  end if;

  -- Insert (upload) policy
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'ins_reg_photos'
  ) then
DROP POLICY IF EXISTS ins_reg_photos ON storage.objects;
    create policy ins_reg_photos on storage.objects
      for insert
      with check (
        bucket_id = 'registration-photos'
        and (public.is_owner() or public.has_permission('registration_photos'))
      );
  end if;

  -- Update (move/rename) policy
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'upd_reg_photos'
  ) then
DROP POLICY IF EXISTS upd_reg_photos ON storage.objects;
    create policy upd_reg_photos on storage.objects
      for update
      using (
        bucket_id = 'registration-photos'
        and (public.is_owner() or public.has_permission('registration_photos'))
      )
      with check (
        bucket_id = 'registration-photos'
        and (public.is_owner() or public.has_permission('registration_photos'))
      );
  end if;

  -- Delete policy
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'del_reg_photos'
  ) then
DROP POLICY IF EXISTS del_reg_photos ON storage.objects;
    create policy del_reg_photos on storage.objects
      for delete
      using (
        bucket_id = 'registration-photos'
        and (public.is_owner() or public.has_permission('registration_photos'))
      );
  end if;
end $$;

-- Note: Ensure the bucket exists and is set to private in the Storage settings.


-- ========= Source Migration: 20250920170000_fix_has_permission_uuid_compare.sql =========
-- Fix has_permission() to compare uuid correctly (no text cast)
-- Previously used: where user_id = v_uid::text, which fails since user_id is uuid

create or replace function public.has_permission(p_section text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_owner boolean := false;
  v_perm record;
begin
  if v_uid is null then
    return false;
  end if;

  -- Owner has all permissions
  select public.is_owner() into v_is_owner;
  if coalesce(v_is_owner, false) then
    return true;
  end if;

  -- Fetch permission row once (compare uuid to uuid)
  select * into v_perm from public.admin_permissions where user_id = v_uid limit 1;
  if not found then
    return false;
  end if;

  case lower(trim(p_section))
    when 'events' then return coalesce(v_perm.can_events, false);
    when 'schedule' then return coalesce(v_perm.can_schedule, false);
    when 'gallery' then return coalesce(v_perm.can_gallery, false);
    when 'sponsors' then return coalesce(v_perm.can_sponsors, false);
    when 'registrations' then return coalesce(v_perm.can_registrations, false);
    when 'registration_photos' then return coalesce(v_perm.can_registration_photos, false);
    when 'faculty' then return coalesce(v_perm.can_faculty, false);
    when 'core_team' then return coalesce(v_perm.can_core_team, false);
    when 'guest_artists' then return coalesce(v_perm.can_guest_artists, false);
    when 'chief_guests' then return coalesce(v_perm.can_chief_guests, false);
    when 'homebound' then return coalesce(v_perm.can_homebound, false);
    else return false;
  end case;
end $$;

-- Ask PostgREST to reload to pick up function change
do $$ begin perform pg_notify('pgrst', 'reload schema'); exception when others then null; end $$;


-- ========= Source Migration: 20250921121500_remove_registration_motivation.sql =========
  -- Remove motivation from registrations and update RPC signature
-- Safe and idempotent where possible

-- 1) Drop column if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'registrations' AND column_name = 'motivation'
  ) THEN
    ALTER TABLE public.registrations DROP COLUMN motivation;
  END IF;
END$$;

-- 2) Update register_for_event function to remove p_motivation and not reference motivation
-- Keep photo_url argument as per latest migration
create or replace function public.register_for_event(
  p_id text,
  p_event_id integer,
  p_event_title text,
  p_participant_type text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_college text,
  p_registration_date timestamptz,
  p_is_team_registration boolean,
  p_team_name text,
  p_team_members jsonb,
  p_total_members integer,
  p_photo_url text
) returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id text := coalesce(p_id, 'REG-'||extract(epoch from now())::bigint::text||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)));
begin
  insert into public.registrations(
    id,
    event_id,
    event_title,
    participant_type,
    full_name,
    email,
    phone,
    college,
    registration_date,
    status,
    is_team_registration,
    team_name,
    team_members,
    total_members,
    photo_url
  ) values (
    v_id,
    p_event_id,
    p_event_title,
    p_participant_type,
    p_full_name,
    p_email,
    p_phone,
    p_college,
    coalesce(p_registration_date, now()),
    'pending',
    coalesce(p_is_team_registration, false),
    p_team_name,
    p_team_members,
    coalesce(p_total_members, 1),
    p_photo_url
  );

  return v_id;
end;
$$;

-- 3) Grant execute to anon/public
GRANT EXECUTE ON FUNCTION public.register_for_event(
  text, integer, text, text, text, text, text, text, timestamptz, boolean, text, jsonb, integer, text
) TO anon;
GRANT EXECUTE ON FUNCTION public.register_for_event(
  text, integer, text, text, text, text, text, text, timestamptz, boolean, text, jsonb, integer, text
) TO public;

-- 4) Reload PostgREST
NOTIFY pgrst, 'reload schema';


-- ========= Source Migration: 20250921123000_add_sports_committees.sql =========
-- Add Sports Committees and Members + storage bucket and permissions
-- Idempotent where possible

BEGIN;

-- 1) Tables
CREATE TABLE IF NOT EXISTS public.sports_committees (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT ''::text,
  color text NOT NULL DEFAULT '#22D3EE',
  order_position integer NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sports_team_members (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  committee_id bigint REFERENCES public.sports_committees(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT ''::text,
  image text NOT NULL,
  description text NOT NULL DEFAULT ''::text,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  order_position integer NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  is_head boolean NOT NULL DEFAULT false,
  phone text NULL,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) RLS policies
ALTER TABLE public.sports_committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_team_members ENABLE ROW LEVEL SECURITY;

-- Committees: allow public read of enabled rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sports_committees' AND policyname='sports_committees_select_enabled'
  ) THEN
DROP POLICY IF EXISTS sports_committees_select_enabled ON public.sports_committees;
    CREATE POLICY sports_committees_select_enabled ON public.sports_committees
      FOR SELECT USING (enabled);
  END IF;
END$$;

-- Committees: allow full access to authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sports_committees' AND policyname='sports_committees_auth_rw'
  ) THEN
DROP POLICY IF EXISTS sports_committees_auth_rw ON public.sports_committees;
    CREATE POLICY sports_committees_auth_rw ON public.sports_committees
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Members: allow public read of enabled + parent exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sports_team_members' AND policyname='sports_team_members_select_enabled'
  ) THEN
DROP POLICY IF EXISTS sports_team_members_select_enabled ON public.sports_team_members;
    CREATE POLICY sports_team_members_select_enabled ON public.sports_team_members
      FOR SELECT USING (
        enabled AND EXISTS (
          SELECT 1 FROM public.sports_committees c WHERE c.id = committee_id AND c.enabled
        )
      );
  END IF;
END$$;

-- Members: allow full access to authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sports_team_members' AND policyname='sports_team_members_auth_rw'
  ) THEN
DROP POLICY IF EXISTS sports_team_members_auth_rw ON public.sports_team_members;
    CREATE POLICY sports_team_members_auth_rw ON public.sports_team_members
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END$$;

-- 3) Admin permissions: add can_sports if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_permissions' AND column_name='can_sports'
  ) THEN
    ALTER TABLE public.admin_permissions ADD COLUMN can_sports boolean NOT NULL DEFAULT false;
  END IF;
END$$;

-- 4) Storage bucket for sports images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'sports-images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('sports-images', 'sports-images', true);
  END IF;
END$$;

-- Storage policies: public read, authenticated insert/update/delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='sports_images_read'
  ) THEN
DROP POLICY IF EXISTS sports_images_read ON storage.objects;
    CREATE POLICY sports_images_read ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'sports-images');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='sports_images_write'
  ) THEN
DROP POLICY IF EXISTS sports_images_write ON storage.objects;
    CREATE POLICY sports_images_write ON storage.objects
      FOR ALL TO authenticated
      USING (bucket_id = 'sports-images')
      WITH CHECK (bucket_id = 'sports-images');
  END IF;
END$$;

-- 5) Updated timestamps trigger (optional convenience)
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='set_updated_at_sports_committees'
  ) THEN
    CREATE TRIGGER set_updated_at_sports_committees
      BEFORE UPDATE ON public.sports_committees
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='set_updated_at_sports_team_members'
  ) THEN
    CREATE TRIGGER set_updated_at_sports_team_members
      BEFORE UPDATE ON public.sports_team_members
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- 6) Reload API
NOTIFY pgrst, 'reload schema';

COMMIT;


-- ========= Source Migration: 20250921130000_seed_sports_committees.sql =========
-- Seed sample Sports Committees and Heads for demo
-- Idempotent inserts based on unique names

BEGIN;

-- Ensure base tables exist (noop if already created)
CREATE TABLE IF NOT EXISTS public.sports_committees (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT ''::text,
  color text NOT NULL DEFAULT '#22D3EE',
  order_position integer NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sports_team_members (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  committee_id bigint REFERENCES public.sports_committees(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT ''::text,
  image text NOT NULL,
  description text NOT NULL DEFAULT ''::text,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  order_position integer NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  is_head boolean NOT NULL DEFAULT false,
  phone text NULL,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Deduplicate committees by normalized name first (lower(trim(name))) to avoid conflicts during normalization
WITH dupes AS (
  SELECT LOWER(TRIM(name)) AS norm, MIN(id) AS keep_id
  FROM public.sports_committees
  GROUP BY LOWER(TRIM(name))
  HAVING COUNT(*) > 1
), to_fix AS (
  SELECT sc.id AS dup_id, d.keep_id
  FROM public.sports_committees sc
  JOIN dupes d ON LOWER(TRIM(sc.name)) = d.norm
  WHERE sc.id <> d.keep_id
)
UPDATE public.sports_team_members m
SET committee_id = t.keep_id
FROM to_fix t
WHERE m.committee_id = t.dup_id;

DELETE FROM public.sports_committees sc
USING (
  SELECT sc.id
  FROM public.sports_committees sc
  JOIN (
    SELECT LOWER(TRIM(name)) AS norm, MIN(id) AS keep_id
    FROM public.sports_committees
    GROUP BY LOWER(TRIM(name))
    HAVING COUNT(*) > 1
  ) d ON LOWER(TRIM(sc.name)) = d.norm
  WHERE sc.id <> d.keep_id
) z
WHERE sc.id = z.id;

-- Normalize names to collapse whitespace/case variants, then enforce a case/space-insensitive unique constraint
-- Drop any legacy UNIQUE constraint on the raw name column and the old index before normalization
DO $$
DECLARE con RECORD;
BEGIN
  FOR con IN
    SELECT conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
    WHERE n.nspname = 'public'
      AND t.relname = 'sports_committees'
      AND c.contype = 'u'
      AND a.attname = 'name'
  LOOP
    EXECUTE format('ALTER TABLE public.sports_committees DROP CONSTRAINT IF EXISTS %I', con.conname);
  END LOOP;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_sports_committees_name_unique'
  ) THEN
    BEGIN
      EXECUTE 'DROP INDEX IF EXISTS public.idx_sports_committees_name_unique';
    EXCEPTION WHEN undefined_object THEN
      -- no-op
    END;
  END IF;
END$$;

-- Normalize names now that legacy constraints are removed
UPDATE public.sports_committees SET name = INITCAP(TRIM(LOWER(name))) WHERE name IS NOT NULL;

-- Enforce a case/space-insensitive unique constraint via functional unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_sports_committees_name_unique ON public.sports_committees ((LOWER(TRIM(name))));

-- Upsert committees without relying on ON CONFLICT to bypass duplicate key edge-cases
-- 1) UPDATE existing named committees to desired values
UPDATE public.sports_committees SET description = 'High-energy field dominance', color = '#22C55E', order_"position" = 1, enabled = true WHERE name = 'Football';
UPDATE public.sports_committees SET description = 'Bat, bowl, and strategy masters', color = '#14B8A6', order_"position" = 2, enabled = true WHERE name = 'Cricket';
UPDATE public.sports_committees SET description = 'Agile rackets and sharp reflexes', color = '#06B6D4', order_"position" = 3, enabled = true WHERE name = 'Badminton';

-- 2) INSERT any that don't exist
INSERT INTO public.sports_committees (name, description, color, order_position, enabled)
SELECT v.name, v.description, v.color, v.order_position, v.enabled
FROM (VALUES
  ('Football', 'High-energy field dominance', '#22C55E', 1, true),
  ('Cricket', 'Bat, bowl, and strategy masters', '#14B8A6', 2, true),
  ('Badminton', 'Agile rackets and sharp reflexes', '#06B6D4', 3, true)
) AS v(name, description, color, order_position, enabled)
WHERE NOT EXISTS (
  SELECT 1 FROM public.sports_committees c WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(v.name))
);

-- Grab committee IDs
WITH ids AS (
  SELECT id, name FROM public.sports_committees WHERE name IN ('Football','Cricket','Badminton')
)
-- Insert heads (uses a SELECT with WHERE NOT EXISTS to avoid duplicates by (name, committee_id))
INSERT INTO public.sports_team_members (committee_id, name, role, image, description, achievements, order_position, enabled, is_head, phone, social_links)
SELECT c.id,
       s.name,
       s.role,
       s.image,
       s.description,
       s.achievements::jsonb,
       s.order_position,
       true,
       true,
       s.phone,
       s.social_links::jsonb
FROM (
  VALUES
    ('Football','Aarav Verma','Captain','/auto.png','Playmaker and team strategist','["College Cup 2024 MVP","State finalist"]',1,'+91-90000-11111','{"instagram":"https://instagr.am/aarav"}'),
    ('Cricket','Nidhi Rao','Skipper','/auto.png','Opener with sharp field vision','["Ran inter-college 92*","Best fielder 2023"]',1,'+91-90000-22222','{"instagram":"https://instagr.am/nidhi"}'),
    ('Badminton','Ishaan Gupta','Lead','/auto.png','Lightning reflexes and net control','["Doubles inter-zonal gold"]',1,'+91-90000-33333','{"instagram":"https://instagr.am/ishaan"}')
) AS s(committee_name, name, role, image, description, achievements, order_position, phone, social_links)
JOIN public.sports_committees c ON LOWER(TRIM(c.name)) = LOWER(TRIM(s.committee_name))
WHERE NOT EXISTS (
  SELECT 1 FROM public.sports_team_members m WHERE m.name = s.name AND m.committee_id = c.id AND m.is_head = true
);

-- Optional extra members (non-heads)
INSERT INTO public.sports_team_members (committee_id, name, role, image, description, achievements, order_position, enabled, is_head)
SELECT c.id, s.name, s.role, s.image, s.description, '[]'::jsonb, s.order_position, true, false
FROM (
  VALUES
    ('Football','Riya Sen','Forward','/auto.png','Speed and precise finishing',2),
    ('Cricket','Kabir Shah','All-rounder','/auto.png','Balance of pace and batting',2),
    ('Badminton','Meera Iyer','Singles','/auto.png','Consistent baseline rallies',2)
) AS s(committee_name, name, role, image, description, order_position)
JOIN public.sports_committees c ON LOWER(TRIM(c.name)) = LOWER(TRIM(s.committee_name))
WHERE NOT EXISTS (
  SELECT 1 FROM public.sports_team_members m WHERE m.name = s.name AND m.committee_id = c.id AND m.is_head = false
);

-- Reload API
NOTIFY pgrst, 'reload schema';

COMMIT;


-- ========= Source Migration: 20250921130500_seed_sports_organising_committee.sql =========
-- Seed a default Sports Organising Committee if missing (idempotent)
-- Safe to run multiple times

BEGIN;

DO $$
DECLARE v_id bigint;
BEGIN
  SELECT id INTO v_id
  FROM public.sports_committees
  WHERE lower(trim(name)) IN ('sports organising committee','sports organizing committee')
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.sports_committees (name, description, color, order_position, enabled)
    VALUES (
      'Sports Organising Committee',
      'The organising team overseeing all sports operations and logistics.',
      '#10B981',
      1,
      true
    );
  END IF;
END $$;

-- Let PostgREST reload schemas if needed
NOTIFY pgrst, 'reload schema';

COMMIT;


-- ========= Source Migration: 20250921141500_fix_registration_photos_bucket.sql =========
-- Fix: Ensure registration-photos bucket exists (private) with correct policies
-- Safe/idempotent migration. Run in Supabase SQL editor or via CLI.

BEGIN;

-- 1) Ensure bucket exists and is private with reasonable limits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'registration-photos'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'registration-photos',
      'registration-photos',
      false,               -- private bucket
      5242880,             -- 5 MB default limit per object
      ARRAY['image/png','image/jpeg','image/jpg','image/webp']
    );
  ELSE
    -- Normalize existing bucket to private; preserve existing limits if set
    UPDATE storage.buckets
    SET public = false,
        file_size_limit = COALESCE(file_size_limit, 5242880),
        allowed_mime_types = COALESCE(allowed_mime_types, ARRAY['image/png','image/jpeg','image/jpg','image/webp'])
    WHERE id = 'registration-photos';
  END IF;
END $$;

-- 2) Remove any legacy public policies if they exist

-- 2b) Remove any conflicting fallback policies to avoid over-broad access
-- These may have been created by earlier iterations/migrations.

-- Also drop any helper-based policies if they exist, since this project
-- doesn't include public.is_owner()/public.has_permission()

-- 3) Create authenticated-only policies (no anon) for the private bucket
-- This avoids reliance on helper functions. Tighten later if you add helper functions.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='regphotos_select_authenticated'
  ) THEN
DROP POLICY IF EXISTS regphotos_select_authenticated ON storage.objects;
    CREATE POLICY regphotos_select_authenticated
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'registration-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='regphotos_insert_authenticated'
  ) THEN
DROP POLICY IF EXISTS regphotos_insert_authenticated ON storage.objects;
    CREATE POLICY regphotos_insert_authenticated
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'registration-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='regphotos_update_authenticated'
  ) THEN
DROP POLICY IF EXISTS regphotos_update_authenticated ON storage.objects;
    CREATE POLICY regphotos_update_authenticated
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'registration-photos')
      WITH CHECK (bucket_id = 'registration-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='regphotos_delete_authenticated'
  ) THEN
DROP POLICY IF EXISTS regphotos_delete_authenticated ON storage.objects;
    CREATE POLICY regphotos_delete_authenticated
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'registration-photos');
  END IF;
END $$;

-- 4) Reload PostgREST schema so new objects are visible to the API
DO $$ BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN others THEN
  -- ignore if notify not permitted
  NULL;
END $$;

COMMIT;


-- ========= Source Migration: 20250922090500_add_health_heartbeats.sql =========
-- Create health_heartbeats table for Netlify heartbeat diagnostics
do $$ begin
  if not exists (
    select 1 from information_schema.tables where table_schema='public' and table_name='health_heartbeats'
  ) then
    CREATE TABLE IF NOT EXISTS public.health_heartbeats (
      id integer primary key,
      last_run timestamptz,
      updated_by text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  end if;
end $$;

-- Trigger to auto-update updated_at
do $$ begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
    where p.proname = 'set_updated_at' and n.nspname='public'
  ) then
    create or replace function public.set_updated_at()
    returns trigger as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$ language plpgsql;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger t join pg_class c on t.tgrelid=c.oid join pg_namespace n on c.relnamespace=n.oid
    where t.tgname='health_heartbeats_set_updated_at' and n.nspname='public' and c.relname='health_heartbeats'
  ) then
    create trigger health_heartbeats_set_updated_at
    before update on public.health_heartbeats
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- Enable RLS and basic policies
alter table public.health_heartbeats enable row level security;

-- Read policy (authenticated users can read). Relax to 'using (true)' if anonymous read is okay.
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='health_heartbeats' and policyname='read_health_heartbeats'
  ) then
DROP POLICY IF EXISTS read_health_heartbeats ON public.health_heartbeats;
    create policy read_health_heartbeats on public.health_heartbeats
    for select using (auth.role() = 'authenticated' or (select current_setting('request.jwt.claims', true)) is null);
  end if;
end $$;

-- Upsert seed row id=1 so UI can read something immediately
insert into public.health_heartbeats (id, last_run, updated_by)
values (1, now(), 'migration-seed')
on conflict (id) do update set last_run = excluded.last_run, updated_by = excluded.updated_by;


-- ========= Source Migration: 20250922120000_add_health_heartbeats.sql =========
-- Create health_heartbeats table to track scheduled job runs
create table if not exists public.health_heartbeats (
  id int primary key,
  last_run timestamptz not null default now(),
  updated_by text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to update updated_at on change
create or replace function public.set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_timestamp_on_health_heartbeats on public.health_heartbeats;
create trigger set_timestamp_on_health_heartbeats
before update on public.health_heartbeats
for each row execute function public.set_timestamp();

-- RLS: enable and allow select for authenticated users; writes via service role
alter table public.health_heartbeats enable row level security;

-- Allow reads for authenticated users (admins)
DROP POLICY IF EXISTS health_heartbeats_select_auth ON public.health_heartbeats;
CREATE POLICY health_heartbeats_select_auth
  on public.health_heartbeats
  for select
  to authenticated
  using (true);

-- Optional: allow public read if desired
-- CREATE POLICY health_heartbeats_select_anon
--   on public.health_heartbeats
--   for select
--   to anon
--   using (true);

-- No insert/update/delete policies for anon/auth; service_role bypasses RLS.

-- Seed a row with id=1 if missing
insert into public.health_heartbeats (id, last_run, updated_by, notes)
values (1, now(), 'migration', 'seed row')
on conflict (id) do nothing;


-- ========= Source Migration: 20250923090000_update_form_settings_function.sql =========
-- RPC: update_form_settings
-- Safely upsert the singleton row (id=1) while enforcing admin authorization.
-- This uses SECURITY DEFINER so it can bypass RLS, but it performs its own authz check
-- against admin_permissions or admin_users for the current auth.uid().

create or replace function public.update_form_settings(
  p_audition_form_enabled boolean default null,
  p_audition_form_message text default null,
  p_membership_form_enabled boolean default null,
  p_membership_form_message text default null
)
returns public.form_settings
language plpgsql
security definer
set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.form_settings;
begin
  -- Require authentication
  if v_uid is null then
    raise exception 'not_authenticated' using hint = 'Sign in required';
  end if;

  -- Authorization: must be admin via admin_permissions or admin_users
  if not exists (select 1 from public.admin_permissions ap where ap.user_id = v_uid)
     and not exists (select 1 from public.admin_users au where au.user_id = v_uid and au.role in ('owner','admin')) then
    raise exception 'forbidden';
  end if;

  insert into public.form_settings as fs (
    id,
    audition_form_enabled,
    audition_form_message,
    membership_form_enabled,
    membership_form_message
  ) values (
    1,
    p_audition_form_enabled,
    p_audition_form_message,
    p_membership_form_enabled,
    p_membership_form_message
  )
  on conflict (id) do update set
    audition_form_enabled = coalesce(excluded.audition_form_enabled, fs.audition_form_enabled),
    audition_form_message = coalesce(excluded.audition_form_message, fs.audition_form_message),
    membership_form_enabled = coalesce(excluded.membership_form_enabled, fs.membership_form_enabled),
    membership_form_message = coalesce(excluded.membership_form_message, fs.membership_form_message)
  returning * into v_row;

  return v_row;
end;
$$;

-- Permit execution from client roles
grant execute on function public.update_form_settings(boolean, text, boolean, text) to anon, authenticated;


-- ========= Source Migration: 20250923123000_enable_rls_social_media_and_event_coordinators.sql =========
-- Enable Row Level Security and policies for select/write on selected public tables
-- Date: 2025-09-23

-- NOTE on wrappers_fdw_stats:
--   The table/view public.wrappers_fdw_stats is typically created by an extension
--   for internal statistics. We intentionally do NOT enable RLS on it to avoid
--   breaking its intended behavior. If Studio warns about it, it can be safely ignored
--   or moved to a dedicated schema. Do not add RLS to system/extension-managed relations.

-- ============================================================================
-- social_media_settings
-- Public should be able to read, but only admins should write.
-- Admin check is based on presence of a row in admin_permissions for auth.uid().
-- You may tailor the permission flag as desired; we use a broad OR of flags
-- that correspond to top-level site management responsibilities.
-- ============================================================================

alter table if exists public.social_media_settings enable row level security;

-- Allow everyone (anon/auth) to SELECT
DROP POLICY IF EXISTS "social_media_settings_public_select" ON public.social_media_settings;
create policy "social_media_settings_public_select"
  on public.social_media_settings
  for select
  using (true);

-- Allow authenticated admins to UPDATE the singleton row (id = 1)
DROP POLICY IF EXISTS "social_media_settings_admin_update" ON public.social_media_settings;
create policy "social_media_settings_admin_update"
  on public.social_media_settings
  for update
  to authenticated
  using (
    id = 1
    and exists (
      select 1 from public.admin_permissions p
      where p.user_id = auth.uid()
        and (
          coalesce(p.can_events, false)
          or coalesce(p.can_gallery, false)
          or coalesce(p.can_sponsors, false)
          or coalesce(p.can_homebound, false)
        )
    )
  )
  with check (
    id = 1
    and exists (
      select 1 from public.admin_permissions p
      where p.user_id = auth.uid()
        and (
          coalesce(p.can_events, false)
          or coalesce(p.can_gallery, false)
          or coalesce(p.can_sponsors, false)
          or coalesce(p.can_homebound, false)
        )
    )
  );

-- Allow authenticated admins to INSERT the singleton row if missing (id = 1)
DROP POLICY IF EXISTS "social_media_settings_admin_insert" ON public.social_media_settings;
create policy "social_media_settings_admin_insert"
  on public.social_media_settings
  for insert
  to authenticated
  with check (
    id = 1
    and exists (
      select 1 from public.admin_permissions p
      where p.user_id = auth.uid()
        and (
          coalesce(p.can_events, false)
          or coalesce(p.can_gallery, false)
          or coalesce(p.can_sponsors, false)
          or coalesce(p.can_homebound, false)
        )
    )
  );

-- Optionally prevent deletes for safety (no policy -> no delete). If you want admin delete, add a policy here.

-- ============================================================================
-- event_coordinators
-- Public read; only admins with events permission can write.
-- ============================================================================

alter table if exists public.event_coordinators enable row level security;

DROP POLICY IF EXISTS "event_coordinators_public_select" ON public.event_coordinators;
create policy "event_coordinators_public_select"
  on public.event_coordinators
  for select
  using (true);

DROP POLICY IF EXISTS "event_coordinators_admin_write" ON public.event_coordinators;
create policy "event_coordinators_admin_write"
  on public.event_coordinators
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_permissions p
      where p.user_id = auth.uid()
        and coalesce(p.can_events, false)
    )
  )
  with check (
    exists (
      select 1 from public.admin_permissions p
      where p.user_id = auth.uid()
        and coalesce(p.can_events, false)
    )
  );

-- Done.


-- ========= Source Migration: 20250929_add_about_labels.sql =========
-- Migration: add/normalize about_settings label columns
-- Date: 2025-09-29
-- This script is safe to run multiple times. It will:
-- 1. If a lowercase column (trackslabel/zoneslabel) exists, rename it to the quoted camelCase form.
-- 2. If the camelCase column does not exist, add it as text.

BEGIN;

-- Ensure "zonesLabel" exists; rename lowercase if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'about_settings' AND column_name = 'zoneslabel'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'about_settings' AND column_name = 'zonesLabel'
  ) THEN
    EXECUTE 'ALTER TABLE public.about_settings RENAME COLUMN zoneslabel TO "zonesLabel"';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'about_settings' AND column_name = 'zonesLabel'
  ) THEN
    EXECUTE 'ALTER TABLE public.about_settings ADD COLUMN "zonesLabel" text';
  END IF;
END$$;

-- Ensure "tracksLabel" exists; rename lowercase if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'about_settings' AND column_name = 'trackslabel'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'about_settings' AND column_name = 'tracksLabel'
  ) THEN
    EXECUTE 'ALTER TABLE public.about_settings RENAME COLUMN trackslabel TO "tracksLabel"';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'about_settings' AND column_name = 'tracksLabel'
  ) THEN
    EXECUTE 'ALTER TABLE public.about_settings ADD COLUMN "tracksLabel" text';
  END IF;
END$$;

COMMIT;

-- Optional: verify
-- SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='about_settings' ORDER BY ordinal_position;


-- ========= Source Migration: 20251003_add_events_display_order.sql =========
-- Add display_order column to events for manual admin ordering
-- Lower display_order renders earlier (top). Existing events get sequential order based on created_at (oldest first)

alter table public.events
  add column if not exists display_order integer;

-- Backfill any NULLs deterministically using created_at then id
update public.events e
set display_order = sub.rn
from (
  select id, row_number() over (order by coalesce(created_at, now()), id) as rn
  from public.events
  
) sub
where e.id = sub.id and e.display_order is null;

-- Optional index to accelerate ordering
create index if not exists events_display_order_idx on public.events (display_order asc, id asc);

notify pgrst, 'reload schema';


-- ========= Source Migration: 20251003_add_hero_media_y_offsets.sql =========
-- Add vertical (Y) offsets for hero media framing
-- Range mirrors X offsets: -0.5 to 0.5 (fraction of height, applied as translateY)

alter table public.hero_media
  add column if not exists desktop_offset_y numeric not null default 0 check (desktop_offset_y >= -0.5 and desktop_offset_y <= 0.5),
  add column if not exists mobile_offset_y numeric not null default 0 check (mobile_offset_y >= -0.5 and mobile_offset_y <= 0.5);

notify pgrst, 'reload schema';


-- ========= Source Migration: 20251003_add_hero_media_zoom_offsets.sql =========
-- Add per-device zoom and horizontal offset for hero media
-- Desktop vs Mobile. Zoom range 0.25 - 3.0, horizontal offset range -0.5 to 0.5 (fraction of width, applied as translateX(percent)).

alter table public.hero_media
  add column if not exists desktop_zoom numeric not null default 1 check (desktop_zoom >= 0.25 and desktop_zoom <= 3),
  add column if not exists desktop_offset_x numeric not null default 0 check (desktop_offset_x >= -0.5 and desktop_offset_x <= 0.5),
  add column if not exists mobile_zoom numeric not null default 1 check (mobile_zoom >= 0.25 and mobile_zoom <= 3),
  add column if not exists mobile_offset_x numeric not null default 0 check (mobile_offset_x >= -0.5 and mobile_offset_x <= 0.5);

notify pgrst, 'reload schema';


-- ========= Source Migration: 20251003_add_mobile_hero_media.sql =========
-- Add mobile-specific hero media columns (safe additive migration)
alter table public.hero_media
  add column if not exists mobile_video_url text,
  add column if not exists mobile_poster_url text;

-- No additional RLS changes required (existing policies allow select/update)
notify pgrst, 'reload schema';


-- ========= Source Migration: 20251005_add_events_card_aspect.sql =========


-- ========= Source Migration: 20251005_add_mobile_image_url.sql =========
-- Add mobile-specific image column for hero media
alter table public.hero_media
  add column if not exists mobile_image_url text;

-- Make sure PostgREST reloads schema
notify pgrst, 'reload schema';


-- ========= Source Migration: 20251005_create_registration_id_sequence.sql =========
-- Create a global sequence for registration IDs and an RPC to fetch the next value
-- Generates IDs like: RICO-1, RICO-2, RICO-3, ...

-- 1) Create sequence if it doesn't exist
create sequence if not exists registration_id_seq
    as bigint
    start with 1
    increment by 1
    no minvalue
    no maxvalue
    cache 1;

-- 2) Create or replace function to return the next serial ID with prefix
create or replace function public.next_registration_id()
returns text
language plpgsql
security definer
as $$
declare
  n bigint;
begin
  select nextval('registration_id_seq') into n;
  return 'RICO-' || n::text;
end;
$$;

-- 3) Grant execute to anon and authenticated roles used by Supabase
grant execute on function public.next_registration_id() to anon, authenticated;

-- 4) Notify PostgREST to reload schema cache (optional but helpful in some setups)
-- Note: Only works if postgres NOTIFY is wired; harmless otherwise
do $$ begin perform pg_notify('pgrst', 'reload schema'); exception when others then null; end $$;


-- ========= Source Migration: 20251005_registration_id_sequence.sql =========
-- Sequential Registration IDs (RICO-<n>)
-- This migration creates a sequence and an RPC to generate IDs like RICO-1, RICO-2, ...
-- It also updates the register_for_event() function to use this generator instead of random IDs.

-- 1) Create the sequence if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S'
      AND c.relname = 'registration_id_seq'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE 'CREATE SEQUENCE public.registration_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1';
  END IF;
END$$;

-- 2) Create helper RPC to get the next sequential ID
CREATE OR REPLACE FUNCTION public.next_registration_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_next bigint;
BEGIN
  SELECT nextval('public.registration_id_seq') INTO v_next;
  RETURN 'RICO-' || v_next::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_registration_id() TO anon;
GRANT EXECUTE ON FUNCTION public.next_registration_id() TO public;

-- 3) Align sequence to the current maximum numeric part of IDs that already match RICO-<n>
DO $$
DECLARE
  v_max bigint;
BEGIN
  SELECT COALESCE(MAX((substring(id from '^RICO-([0-9]+)$'))::bigint), 0) INTO v_max
  FROM public.registrations
  WHERE id ~ '^RICO-[0-9]+$';

  PERFORM setval('public.registration_id_seq', v_max, true);
END$$;

-- 4) Update register_for_event() to use sequential IDs by default
-- Keep signature and grants intact; only change ID generation
CREATE OR REPLACE FUNCTION public.register_for_event(
  p_id text,
  p_event_id integer,
  p_event_title text,
  p_participant_type text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_college text,
  p_registration_date timestamptz,
  p_is_team_registration boolean,
  p_team_name text,
  p_team_members jsonb,
  p_total_members integer,
  p_photo_url text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id text := COALESCE(p_id, public.next_registration_id());
BEGIN
  INSERT INTO public.registrations(
    id,
    event_id,
    event_title,
    participant_type,
    full_name,
    email,
    phone,
    college,
    registration_date,
    status,
    is_team_registration,
    team_name,
    team_members,
    total_members,
    photo_url
  ) VALUES (
    v_id,
    p_event_id,
    p_event_title,
    p_participant_type,
    p_full_name,
    p_email,
    p_phone,
    p_college,
    COALESCE(p_registration_date, now()),
    'pending',
    COALESCE(p_is_team_registration, false),
    p_team_name,
    p_team_members,
    COALESCE(p_total_members, 1),
    p_photo_url
  );

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_for_event(
  text, integer, text, text, text, text, text, text, timestamptz, boolean, text, jsonb, integer, text
) TO anon;
GRANT EXECUTE ON FUNCTION public.register_for_event(
  text, integer, text, text, text, text, text, text, timestamptz, boolean, text, jsonb, integer, text
) TO public;

NOTIFY pgrst, 'reload schema';


-- ========= Source Migration: 20251006_create_notifications.sql =========
-- Notifications table and RLS policies
-- This mirrors the app-level migration and ensures Supabase CLI picks it up.

-- 1) Table
create table if not exists public.notifications (
  id bigserial primary key,
  title text null,
  message text not null,
  type text not null default 'info', -- admin/owner can set any string label
  link_url text null,
  visible boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz null,
  priority int not null default 0,
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now()
);

comment on table public.notifications is 'Admin-pushed notifications for viewer panel';
comment on column public.notifications.type is 'info | success | warning | error';

-- 2) RLS
alter table public.notifications enable row level security;

-- Make the script idempotent

-- Allow anonymous/public to read only currently active notifications
DROP POLICY IF EXISTS "Public can read active notifications" ON public.notifications;
create policy "Public can read active notifications"
  on public.notifications for select
  to anon
  using (
    visible = true
    and starts_at <= now()
    and (ends_at is null or ends_at >= now())
  );

-- Allow authenticated users (admins/owner) to read everything from the dashboard
DROP POLICY IF EXISTS "Authenticated can read notifications" ON public.notifications;
create policy "Authenticated can read notifications"
  on public.notifications for select
  to authenticated
  using (true);

-- Write policies (owner or admin)
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
create policy "Admins can insert notifications"
  on public.notifications for insert
  to authenticated
  with check ( public.is_owner() or public.is_admin() );

DROP POLICY IF EXISTS "Admins can update notifications" ON public.notifications;
create policy "Admins can update notifications"
  on public.notifications for update
  to authenticated
  using ( public.is_owner() or public.is_admin() )
  with check ( public.is_owner() or public.is_admin() );

DROP POLICY IF EXISTS "Admins can delete notifications" ON public.notifications;
create policy "Admins can delete notifications"
  on public.notifications for delete
  to authenticated
  using ( public.is_owner() or public.is_admin() );

-- 3) Helpful indexes for viewer queries
create index if not exists idx_notifications_active_window
  on public.notifications (visible, starts_at, ends_at);


-- ========= Source Migration: 20251006_increase_image_bucket_limits_30mb.sql =========
-- Increase file_size_limit to at least 30MB for all image-centric buckets
-- Safe/idempotent: will only increase limits if currently lower or null
-- Run in Supabase SQL editor or include in your migration workflow

BEGIN;

-- List of image buckets in this project
WITH targets AS (
  SELECT unnest(ARRAY[
    'band-images',
    'event-images',
    'gallery-images',
    'team-images',
    'faculty-images',
    'guest-artist-images',
    'sponsor-logos',
    'sports-images',
    'registration-photos',
    'hero-media'
  ]) AS id
)
UPDATE storage.buckets b
SET file_size_limit = GREATEST(COALESCE(b.file_size_limit, 0), 31457280)  -- 30MB
FROM targets t
WHERE b.id = t.id;

-- Optional: ensure these buckets exist (no-ops if already there)
INSERT INTO storage.buckets (id, name, public)
SELECT id, id, TRUE FROM (VALUES
  ('band-images'),('event-images'),('gallery-images'),('team-images'),('faculty-images'),('guest-artist-images'),('sponsor-logos'),('sports-images'),('hero-media')
) v(id)
ON CONFLICT (id) DO NOTHING;

-- Keep registration-photos private if present
UPDATE storage.buckets SET public = FALSE WHERE id = 'registration-photos';

-- Reload PostgREST to pick up any changes
DO $$ BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN others THEN
  NULL;
END $$;

COMMIT;


-- ========= Source Migration: 20251006_notifications_drop_type_check.sql =========
-- Make notification type free-form by dropping strict check constraint if present
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'notifications'
      and constraint_name = 'notifications_type_check'
  ) then
    alter table public.notifications drop constraint notifications_type_check;
  end if;
exception when others then
  -- ignore if table doesn't exist yet or lacks the constraint
  null;
end$$;


-- ========= Source Migration: 20251007_add_event_categories_order_position.sql =========
-- Migration: Add order_position to event_categories and create reorder RPC
-- Adds a nullable integer column `order_position`, populates existing rows deterministically,
-- and creates a server-side function `reorder_event_categories(p_ids integer[])` which
-- atomically persists the ordering using a single UPDATE with ordinality.

BEGIN;

-- Add column if missing
ALTER TABLE IF EXISTS public.event_categories
  ADD COLUMN IF NOT EXISTS order_position integer;

-- Populate order_position with a deterministic order based on created_at (fallback to id)
WITH seq AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC NULLS LAST, id ASC) AS rn
  FROM public.event_categories
)
UPDATE public.event_categories e
SET order_"position" = seq.rn
FROM seq
WHERE e.id = seq.id
  AND (e.order_position IS NULL);

COMMIT;

-- Create a safe, atomic server-side function to persist ordering in one statement.
-- Usage: SELECT public.reorder_event_categories(ARRAY[3,1,2]);
CREATE OR REPLACE FUNCTION public.reorder_event_categories(p_ids integer[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_ids IS NULL OR array_length(p_ids,1) IS NULL THEN
    RETURN;
  END IF;

  -- Update using ordinality produced by unnest(...) WITH ORDINALITY so the order in the
  -- provided array becomes the order_position value (1-based).
  UPDATE public.event_categories AS e
  SET order_"position" = t.ord
  FROM (
    SELECT (unnest(p_ids))::int AS id, ord
    FROM unnest(p_ids) WITH ORDINALITY AS un(id, ord)
  ) AS t
  WHERE e.id = t.id;
END;
$$;

-- Optional: grant execute to anon or authenticated role depending on your RLS setup.
-- Example (uncomment and adapt if you manage roles here):
-- GRANT EXECUTE ON FUNCTION public.reorder_event_categories(integer[]) TO authenticated;


-- ========= Source Migration: 20251007_add_rules_link_to_events.sql =========
-- Add nullable rules_link column to events so admin can store PDF / Drive URLs
ALTER TABLE IF EXISTS events
  ADD COLUMN IF NOT EXISTS rules_link text;


-- ========= Source Migration: 20251008_add_sponsor_section_title_subtitle.sql =========
/*
  Migration: add sponsor_section_title and sponsor_section_subtitle to homepage_settings
  - Adds nullable text columns if they do not exist
  - Seeds existing row(s) with sensible defaults
  - This migration is idempotent and safe to run multiple times
*/

DO $$
BEGIN
  -- Add sponsor_section_title if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_section_title'
  ) THEN
    ALTER TABLE homepage_settings ADD COLUMN sponsor_section_title TEXT DEFAULT 'OUR PARTNERS';
  END IF;

  -- Add sponsor_section_subtitle if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homepage_settings' AND column_name = 'sponsor_section_subtitle'
  ) THEN
    ALTER TABLE homepage_settings ADD COLUMN sponsor_section_subtitle TEXT DEFAULT 'Powered by industry leaders who believe in our vision';
  END IF;
END $$;

-- Seed existing record(s) with defaults if currently null
UPDATE homepage_settings
SET sponsor_section_title = COALESCE(sponsor_section_title, 'OUR PARTNERS'),
    sponsor_section_subtitle = COALESCE(sponsor_section_subtitle, 'Powered by industry leaders who believe in our vision'),
    updated_at = now()
WHERE id IS NOT NULL;

-- Optional: drop column defaults so future changes rely on explicit values (uncomment if desired)
-- ALTER TABLE homepage_settings ALTER COLUMN sponsor_section_title DROP DEFAULT;
-- ALTER TABLE homepage_settings ALTER COLUMN sponsor_section_subtitle DROP DEFAULT;


-- ========= Source Migration: 20251008_add_sponsorship_page_title.sql =========
/*
  Migration: add page_title to sponsorship_settings
  - Adds a text column `page_title` if it does not exist
  - Seeds existing rows with a sensible default
  - Idempotent: safe to run multiple times
*/

DO $$
BEGIN
  -- Add page_title if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsorship_settings' AND column_name = 'page_title'
  ) THEN
    ALTER TABLE sponsorship_settings ADD COLUMN page_title TEXT DEFAULT 'OUR SPONSORS';
  END IF;
END $$;

-- Seed existing record(s) with a default if currently null
UPDATE sponsorship_settings
SET page_title = COALESCE(page_title, 'OUR SPONSORS'),
    updated_at = now()
WHERE id IS NOT NULL;

-- Optional: drop the column default if you prefer explicit values only
-- ALTER TABLE sponsorship_settings ALTER COLUMN page_title DROP DEFAULT;


-- ========= Source Migration: 20251008_clean_guest_artist_video_urls.sql =========
/*
  Migration: normalize guest_artists video fields
  - Converts empty-string or whitespace-only values for video/video_url/youtube_url/watch_live_url to NULL
  - Idempotent and safe to run multiple times
*/

UPDATE guest_artists
SET video = NULL
WHERE video IS NOT NULL AND trim(video) = '';

UPDATE guest_artists
SET video_url = NULL
WHERE video_url IS NOT NULL AND trim(video_url) = '';

UPDATE guest_artists
SET youtube_url = NULL
WHERE youtube_url IS NOT NULL AND trim(youtube_url) = '';

UPDATE guest_artists
SET watch_live_url = NULL
WHERE watch_live_url IS NOT NULL AND trim(watch_live_url) = '';


-- ========= Source Migration: 20251010094500_add_event_registration_default_mode.sql =========
-- Supabase migration: add per-event default registration mode
-- Adds `registration_default_mode` to the events table so admin UI changes have a backing column.
-- Values allowed: 'individual' or 'team'. Default is 'individual'.

ALTER TABLE IF EXISTS events
  ADD COLUMN IF NOT EXISTS registration_default_mode text DEFAULT 'individual';

-- Add a check constraint to ensure only allowed values are stored
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'events' AND c.conname = 'events_registration_default_mode_check'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_registration_default_mode_check CHECK (registration_default_mode IN ('individual', 'team'));
  END IF;
END$$;


-- ========= Source Migration: 20251010100000_add_event_registration_form_fields.sql =========
-- Supabase migration: add registration_form_fields to events
-- Adds per-event JSONB column for registration form field overrides

ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS registration_form_fields jsonb DEFAULT NULL;

-- NOTE: After applying this, refresh the Supabase Table Editor for `events` and restart your app if necessary.


-- ========= Source Migration: 20251010101000_add_event_registration_participant_types.sql =========
-- Supabase migration: add registration_participant_types to events
-- Adds per-event array of participant types (text[])

ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS registration_participant_types text[] DEFAULT NULL;

-- Note: once applied, refresh Supabase Table Editor and restart your app if necessary.


-- ========= Source Migration: 20251010102000_add_event_registration_columns_all_in_one.sql =========
-- Supabase migration: add all event-level registration columns
-- Adds:
--  - registration_default_mode TEXT DEFAULT 'individual'
--  - registration_participant_types TEXT[] DEFAULT NULL
--  - registration_form_fields JSONB DEFAULT NULL
-- Idempotent: safe to run multiple times.

BEGIN;

-- registration_default_mode
ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS registration_default_mode text DEFAULT 'individual';

-- participant types array
ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS registration_participant_types text[] DEFAULT NULL;

-- per-event registration form fields (jsonb)
ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS registration_form_fields jsonb DEFAULT NULL;

-- Add a check constraint for registration_default_mode if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'events' AND c.conname = 'events_registration_default_mode_check'
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_registration_default_mode_check CHECK (registration_default_mode IN ('individual', 'team'));
  END IF;
END$$;

COMMIT;

-- After running this migration in Supabase Studio (SQL editor) or via CLI, refresh the Table Editor and restart your app (dev server or rebuild) so the client picks up the schema changes.


-- ========= Source Migration: 20251115_add_sports_committee_show_after_heads.sql =========


-- ========= Source Migration: 20251115_add_swap_committee_order_rpc.sql =========


-- ========= Source Migration: 20251123_create_guest_artist_audio_bucket.sql =========
-- Ensure guest-artist-audio bucket exists with sane defaults and policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'guest-artist-audio') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'guest-artist-audio',
      'guest-artist-audio',
      TRUE,
      26214400, -- 25 MB
      ARRAY['audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/webm','audio/*']
    );
  ELSE
    UPDATE storage.buckets
      SET public = TRUE,
          file_size_limit = 26214400,
          allowed_mime_types = ARRAY['audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/webm','audio/*']
      WHERE id = 'guest-artist-audio';
  END IF;
END $$;

-- Drop conflicting policies if they already exist so we can re-create idempotently
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read guest-artist-audio') THEN
    DROP POLICY "Public read guest-artist-audio" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth insert guest-artist-audio') THEN
    DROP POLICY "Auth insert guest-artist-audio" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth update guest-artist-audio') THEN
    DROP POLICY "Auth update guest-artist-audio" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth delete guest-artist-audio') THEN
    DROP POLICY "Auth delete guest-artist-audio" ON storage.objects;
  END IF;
END $$;

-- Public read so the site can play the audio, authenticated admins can manage files
DROP POLICY IF EXISTS "Public read guest-artist-audio" ON storage.objects;
CREATE POLICY "Public read guest-artist-audio" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'guest-artist-audio');

DROP POLICY IF EXISTS "Auth insert guest-artist-audio" ON storage.objects;
CREATE POLICY "Auth insert guest-artist-audio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'guest-artist-audio');

DROP POLICY IF EXISTS "Auth update guest-artist-audio" ON storage.objects;
CREATE POLICY "Auth update guest-artist-audio" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'guest-artist-audio')
  WITH CHECK (bucket_id = 'guest-artist-audio');

DROP POLICY IF EXISTS "Auth delete guest-artist-audio" ON storage.objects;
CREATE POLICY "Auth delete guest-artist-audio" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'guest-artist-audio');


-- ========= Source Migration: 20251123_notifications_add_admin_only.sql =========
-- Mirror migration: add admin_only flag to notifications and update anon policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'admin_only'
  ) THEN
    ALTER TABLE public.notifications
      ADD COLUMN admin_only boolean NOT NULL DEFAULT false;
    COMMENT ON COLUMN public.notifications.admin_only IS 'true => admins/owners only; false => public-visible';
  END IF;
END $$;

UPDATE public.notifications
SET admin_only = false
WHERE admin_only IS NULL;


DROP POLICY IF EXISTS "Public can read active notifications" ON public.notifications;
CREATE POLICY "Public can read active notifications"
  ON public.notifications
  FOR SELECT
  TO anon
  USING (
    visible = true
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at >= now())
    AND admin_only = false
  );


-- ========= Source Migration: 20251125_create_admin_sessions.sql =========
-- Create admin_sessions table for tracking active logins
create table if not exists public.admin_sessions (
  user_id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  ip_address text,
  user_agent text,
  last_seen_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.admin_sessions enable row level security;

-- Policies
-- Admins can view all sessions (to see who is logged in)
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.admin_sessions;
create policy "Admins can view all sessions"
  on public.admin_sessions for select
  using (
    exists (
      select 1 from public.admin_users
      where user_id = auth.uid()
    )
  );

-- Users can insert/update their own sessions
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.admin_sessions;
create policy "Users can manage their own sessions"
  on public.admin_sessions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Function to clean up old sessions (optional, can be run via cron or trigger)
create or replace function public.cleanup_old_sessions()
returns void as $$
begin
  delete from public.admin_sessions
  where last_seen_at < now() - interval '24 hours';
end;
$$ language plpgsql security definer;


-- ========= Source Migration: 202512150001_add_unique_event_category_name.sql =========
-- Add unique constraint to event_categories.name
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_categories_name_key') THEN
        ALTER TABLE event_categories ADD CONSTRAINT event_categories_name_key UNIQUE (name);
    END IF;
END $$;


-- ========= Source Migration: 202512150002_change_events_time_to_text.sql =========
-- Change events.time column from TIME to TEXT to support free-text ranges
ALTER TABLE events 
ALTER COLUMN time TYPE TEXT;


-- ========= Source Migration: 202512150003_change_schedule_time_to_text.sql =========
-- Change schedule_events.time column from TIME to TEXT to support free-text ranges
ALTER TABLE schedule_events 
ALTER COLUMN time TYPE TEXT;


-- ========= Source Migration: 202512160001_fix_email_logs_rls.sql =========
-- Ensure email_logs table exists (idempotent)
create table if not exists public.email_logs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    registration_id uuid references public.registrations(id),
    email_type text not null,
    recipient_email text not null,
    subject text,
    status text default 'sent',
    sent_at timestamp with time zone default timezone('utc'::text, now()),
    metadata jsonb
);

-- Enable RLS
alter table public.email_logs enable row level security;

-- Drop existing policies to avoid conflicts

-- Policy: Authenticated users (Admins/Coords) can read logs
DROP POLICY IF EXISTS "Allow admins to read email logs" ON public.email_logs;
create policy "Allow admins to read email logs"
on public.email_logs for select
to authenticated
using (true);

-- Policy: Service role can insert (for Netlify functions)
-- Note: Service role bypasses RLS by default, but explicit policy is good practice
-- No create policy needed for service_role usually if bypassing RLS


-- ========= Source Migration: 20251219163500_create_event_winners_table.sql =========
-- Create event_winners table
create table if not exists public.event_winners (
  id bigint generated always as identity primary key,
  event_id bigint references public.events(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete set null,
  position integer not null check (position > 0),
  name text not null,
  category text,
  year text, -- Batch or participant type info
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.event_winners enable row level security;

-- Policies
DROP POLICY IF EXISTS "Current winners are viewable by everyone" ON public.event_winners;
create policy "Current winners are viewable by everyone"
  on public.event_winners for select
  using (true);

DROP POLICY IF EXISTS "Admins can insert winners" ON public.event_winners;
create policy "Admins can insert winners"
  on public.event_winners for insert
  with check (
    exists (
      select 1 from public.admin_users
      where admin_users.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.admin_permissions
      where admin_permissions.user_id = auth.uid()
      and admin_permissions.can_events = true
    )
    or
    auth.uid() in (
       select user_id from public.event_coordinators
       where event_id = event_winners.event_id
    )
  );

DROP POLICY IF EXISTS "Admins can update winners" ON public.event_winners;
create policy "Admins can update winners"
  on public.event_winners for update
  using (
    exists (
      select 1 from public.admin_users
      where admin_users.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.admin_permissions
      where admin_permissions.user_id = auth.uid()
      and admin_permissions.can_events = true
    )
    or
    auth.uid() in (
       select user_id from public.event_coordinators
       where event_id = event_winners.event_id
    )
  );

DROP POLICY IF EXISTS "Admins can delete winners" ON public.event_winners;
create policy "Admins can delete winners"
  on public.event_winners for delete
  using (
    exists (
      select 1 from public.admin_users
      where admin_users.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.admin_permissions
      where admin_permissions.user_id = auth.uid()
      and admin_permissions.can_events = true
    )
    or
    auth.uid() in (
       select user_id from public.event_coordinators
       where event_id = event_winners.event_id
    )
  );


-- ========= Source Migration: 20251219170000_get_winners_rpc.sql =========
-- Create a function to fetch event winners with public registration details
-- This allows us to show team member names without exposing the entire registrations table

create or replace function public.get_public_event_winners()
returns table (
  id bigint,
  event_id bigint,
  registration_id uuid,
  "position" integer,
  name text,
  category text,
  year text,
  photo_url text,
  created_at timestamptz,
  registration_name text,
  team_members jsonb
) 
language sql
security definer
as $$
  select 
    w.id,
    w.event_id,
    w.registration_id,
    w.position as "position",
    w.name,
    w.category,
    w.year,
    w.photo_url,
    w.created_at,
    r.full_name as registration_name,
    r.team_members
  from public.event_winners w
  left join public.registrations r on w.registration_id = r.id;
$$;

-- Grant execute permission to everyone (public)
grant execute on function public.get_public_event_winners() to public;
grant execute on function public.get_public_event_winners() to anon;
grant execute on function public.get_public_event_winners() to authenticated;


-- ========= Source Migration: 20251229_create_security_system.sql =========
-- Security QR Code Entry Management System
-- Creates tables and functions for security personnel, pass management, and entry scanning

-- =====================================================
-- 1. CREATE PASS TYPE ENUM
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.pass_type AS ENUM (
    'event_registration',
    'general_entry',
    'vip'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 2. SECURITY USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.security_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.security_users ENABLE ROW LEVEL SECURITY;

-- Security users can view only their own record
DROP POLICY IF EXISTS security_users_select_own ON public.security_users;
CREATE POLICY security_users_select_own ON public.security_users
  FOR SELECT
  USING (username = current_user);

-- Only owners can manage security users
DROP POLICY IF EXISTS security_users_admin_all ON public.security_users;
CREATE POLICY security_users_admin_all ON public.security_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'owner'
    )
  );

-- =====================================================
-- 3. PASS REGISTRATIONS TABLE (Public requests)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pass_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.pass_registrations ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public registration)
DROP POLICY IF EXISTS pass_registrations_public_insert ON public.pass_registrations;
CREATE POLICY pass_registrations_public_insert ON public.pass_registrations
  FOR INSERT
  WITH CHECK (true);

-- Anyone can view their own by email
DROP POLICY IF EXISTS pass_registrations_select_own ON public.pass_registrations;
CREATE POLICY pass_registrations_select_own ON public.pass_registrations
  FOR SELECT
  USING (email = current_setting('request.jwt.claims', true)::json->>'email' OR auth.uid() IS NOT NULL);

-- Admins can view/update all
DROP POLICY IF EXISTS pass_registrations_admin_all ON public.pass_registrations;
CREATE POLICY pass_registrations_admin_all ON public.pass_registrations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. ENTRY PASSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.entry_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_token TEXT NOT NULL UNIQUE,
  pass_type public.pass_type NOT NULL,
  
  -- Link to different sources
  event_registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE,
  pass_registration_id UUID REFERENCES public.pass_registrations(id) ON DELETE CASCADE,
  
  -- Pass details (especially for VIP)
  participant_name TEXT,
  notes TEXT,
  
  -- Usage tracking
  is_used BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.entry_passes ENABLE ROW LEVEL SECURITY;

-- Security users can view passes (for scanning)
DROP POLICY IF EXISTS entry_passes_security_select ON public.entry_passes;
CREATE POLICY entry_passes_security_select ON public.entry_passes
  FOR SELECT
  USING (
    -- Security users can view
    EXISTS (
      SELECT 1 FROM public.security_users
      WHERE security_users.username = current_user
      AND security_users.is_active = true
    )
    OR
    -- Admins can view
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Anyone with the token can view their own pass (for download page)
DROP POLICY IF EXISTS entry_passes_public_select_own ON public.entry_passes;
CREATE POLICY entry_passes_public_select_own ON public.entry_passes
  FOR SELECT
  USING (
    -- Check if user owns the related pass_registration
    EXISTS (
      SELECT 1 FROM public.pass_registrations pr
      WHERE pr.id = entry_passes.pass_registration_id
      AND pr.email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Admins can manage all passes
DROP POLICY IF EXISTS entry_passes_admin_all ON public.entry_passes;
CREATE POLICY entry_passes_admin_all ON public.entry_passes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. PASS SCANS TABLE (Audit log)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pass_scans (
  id BIGSERIAL PRIMARY KEY,
  pass_id UUID NOT NULL REFERENCES public.entry_passes(id) ON DELETE CASCADE,
  scanned_by_username TEXT NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scan_result TEXT NOT NULL CHECK (scan_result IN ('valid', 'already_used', 'invalid', 'inactive')),
  participant_name TEXT,
  pass_type public.pass_type
);

-- Enable RLS
ALTER TABLE public.pass_scans ENABLE ROW LEVEL SECURITY;

-- Security users can view scans
DROP POLICY IF EXISTS pass_scans_security_select ON public.pass_scans;
CREATE POLICY pass_scans_security_select ON public.pass_scans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.security_users
      WHERE security_users.username = current_user
      AND security_users.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Security users can insert scans
DROP POLICY IF EXISTS pass_scans_security_insert ON public.pass_scans;
CREATE POLICY pass_scans_security_insert ON public.pass_scans
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.security_users
      WHERE security_users.username = current_user
      AND security_users.is_active = true
    )
  );

-- =====================================================
-- 6. RPC FUNCTIONS
-- =====================================================

-- Function to create security user (owner only)
CREATE OR REPLACE FUNCTION public.create_security_user(
  p_username TEXT,
  p_password TEXT,
  p_full_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_password_hash TEXT;
  v_new_id BIGINT;
BEGIN
  -- Check if caller is owner
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND role = 'owner'
  ) INTO v_is_owner;
  
  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Only owners can create security users';
  END IF;
  
  -- Hash password (basic - in production use proper bcrypt)
  v_password_hash := crypt(p_password, gen_salt('bf'));
  
  -- Insert security user
  INSERT INTO public.security_users (username, password_hash, full_name, created_by)
  VALUES (p_username, v_password_hash, p_full_name, auth.uid())
  RETURNING id INTO v_new_id;
  
  RETURN json_build_object(
    'success', true,
    'id', v_new_id,
    'username', p_username
  );
END;
$$;

-- Function to validate entry pass (security only)
CREATE OR REPLACE FUNCTION public.validate_entry_pass(
  p_pass_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pass RECORD;
  v_scan_result TEXT;
  v_username TEXT;
BEGIN
  -- Get current security user
  v_username := current_user;
  
  -- Check if valid security user
  IF NOT EXISTS (
    SELECT 1 FROM public.security_users
    WHERE username = v_username AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Not a valid security user';
  END IF;
  
  -- Find the pass
  SELECT * INTO v_pass
  FROM public.entry_passes
  WHERE pass_token = p_pass_token;
  
  IF NOT FOUND THEN
    v_scan_result := 'invalid';
    
    -- Log the scan attempt
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (NULL, v_username, v_scan_result, NULL, NULL);
    
    RETURN json_build_object(
      'valid', false,
      'result', v_scan_result,
      'message', 'Invalid pass token'
    );
  END IF;
  
  -- Check if inactive
  IF NOT v_pass.is_active THEN
    v_scan_result := 'inactive';
    
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    
    RETURN json_build_object(
      'valid', false,
      'result', v_scan_result,
      'message', 'Pass has been deactivated'
    );
  END IF;
  
  -- Check if already used
  IF v_pass.is_used THEN
    v_scan_result := 'already_used';
    
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    
    RETURN json_build_object(
      'valid', false,
      'result', v_scan_result,
      'message', 'Pass has already been used',
      'name', COALESCE(v_pass.participant_name, 'Unknown')
    );
  END IF;
  
  -- Valid pass - mark as used
  v_scan_result := 'valid';
  
  UPDATE public.entry_passes
  SET is_used = true
  WHERE id = v_pass.id;
  
  -- Log the successful scan
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
  VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
  
  RETURN json_build_object(
    'valid', true,
    'result', v_scan_result,
    'message', 'Valid entry',
    'name', COALESCE(v_pass.participant_name, 'VIP Guest'),
    'pass_type', v_pass.pass_type
  );
END;
$$;

-- Function to generate pass for event registration
CREATE OR REPLACE FUNCTION public.generate_pass_for_event_registration(
  p_registration_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_registration RECORD;
  v_pass_id UUID;
  v_pass_token TEXT;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can generate passes';
  END IF;
  
  -- Get registration details
  SELECT * INTO v_registration
  FROM public.registrations
  WHERE id = p_registration_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;
  
  -- Check if pass already exists
  IF EXISTS (
    SELECT 1 FROM public.entry_passes
    WHERE event_registration_id = p_registration_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Pass already exists for this registration';
  END IF;
  
  -- Generate unique token
  v_pass_token := 'EVNT-' || upper(substring(md5(random()::text || p_registration_id::text) from 1 for 12));
  
  -- Create pass
  INSERT INTO public.entry_passes (
    pass_token,
    pass_type,
    event_registration_id,
    participant_name,
    created_by
  )
  VALUES (
    v_pass_token,
    'event_registration',
    p_registration_id,
    v_registration.full_name,
    auth.uid()
  )
  RETURNING id INTO v_pass_id;
  
  RETURN json_build_object(
    'success', true,
    'pass_id', v_pass_id,
    'pass_token', v_pass_token
  );
END;
$$;

-- Function to create VIP pass
CREATE OR REPLACE FUNCTION public.create_vip_pass(
  p_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_pass_id UUID;
  v_pass_token TEXT;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can create VIP passes';
  END IF;
  
  -- Generate unique token
  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  
  -- Create VIP pass
  INSERT INTO public.entry_passes (
    pass_token,
    pass_type,
    participant_name,
    notes,
    created_by
  )
  VALUES (
    v_pass_token,
    'vip',
    p_name,
    p_notes,
    auth.uid()
  )
  RETURNING id INTO v_pass_id;
  
  RETURN json_build_object(
    'success', true,
    'pass_id', v_pass_id,
    'pass_token', v_pass_token
  );
END;
$$;

-- Function to approve pass registration and generate pass
CREATE OR REPLACE FUNCTION public.approve_pass_registration(
  p_pass_reg_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_registration RECORD;
  v_pass_id UUID;
  v_pass_token TEXT;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can approve pass registrations';
  END IF;
  
  -- Get registration
  SELECT * INTO v_registration
  FROM public.pass_registrations
  WHERE id = p_pass_reg_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pass registration not found';
  END IF;
  
  IF v_registration.status != 'pending' THEN
    RAISE EXCEPTION 'Pass registration has already been processed';
  END IF;
  
  -- Update registration status
  UPDATE public.pass_registrations
  SET status = 'approved',
      approved_by = auth.uid(),
      approved_at = NOW()
  WHERE id = p_pass_reg_id;
  
  -- Generate unique token
  v_pass_token := 'PASS-' || upper(substring(md5(random()::text || p_pass_reg_id::text) from 1 for 12));
  
  -- Create pass
  INSERT INTO public.entry_passes (
    pass_token,
    pass_type,
    pass_registration_id,
    participant_name,
    created_by
  )
  VALUES (
    v_pass_token,
    'general_entry',
    p_pass_reg_id,
    v_registration.full_name,
    auth.uid()
  )
  RETURNING id INTO v_pass_id;
  
  RETURN json_build_object(
    'success', true,
    'pass_id', v_pass_id,
    'pass_token', v_pass_token
  );
END;
$$;

-- Function to authenticate security user login
CREATE OR REPLACE FUNCTION public.authenticate_security_user(
  p_username TEXT,
  p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Get security user
  SELECT * INTO v_user
  FROM public.security_users
  WHERE username = p_username
  AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid username or password'
    );
  END IF;
  
  -- Verify password against hash
  IF v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
    RETURN json_build_object(
      'success', true,
      'user', json_build_object(
        'id', v_user.id,
        'username', v_user.username,
        'full_name', v_user.full_name
      )
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid username or password'
    );
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_security_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_entry_pass TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.generate_pass_for_event_registration TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_vip_pass TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_pass_registration TO authenticated;
GRANT EXECUTE ON FUNCTION public.authenticate_security_user TO anon, authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_entry_passes_token ON public.entry_passes(pass_token);
CREATE INDEX IF NOT EXISTS idx_entry_passes_event_reg ON public.entry_passes(event_registration_id);
CREATE INDEX IF NOT EXISTS idx_entry_passes_pass_reg ON public.entry_passes(pass_registration_id);
CREATE INDEX IF NOT EXISTS idx_pass_scans_pass_id ON public.pass_scans(pass_id);
CREATE INDEX IF NOT EXISTS idx_pass_scans_scanned_at ON public.pass_scans(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_pass_registrations_email ON public.pass_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pass_registrations_status ON public.pass_registrations(status);


-- ========= Source Migration: 20251230_FULL_DELETION_SUITE.sql =========
-- FIXED CONSOLIDATED DELETION FUNCTIONS
-- This version corrects the "pass_id" column error and leverages CASCADE deletes.

-- 1. Function to delete a security user
CREATE OR REPLACE FUNCTION public.delete_security_user(p_user_id INTEGER)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Only admins can delete security users'; END IF;

  DELETE FROM public.security_users WHERE id = p_user_id;
  RETURN json_build_object('success', true, 'message', 'Security user deleted successfully');
END; $func$;

-- 2. Function to delete an entry pass (VIP or General)
CREATE OR REPLACE FUNCTION public.delete_entry_pass(p_pass_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Only admins can delete passes'; END IF;

  -- Deleting from entry_passes will automatically delete scans due to ON DELETE CASCADE
  DELETE FROM public.entry_passes WHERE id = p_pass_id;
  
  RETURN json_build_object('success', true, 'message', 'Pass deleted successfully');
END; $func$;

-- 3. Function to delete a pass registration
CREATE OR REPLACE FUNCTION public.delete_pass_registration(p_reg_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Only admins can delete registrations'; END IF;

  -- Deleting from pass_registrations will automatically delete the entry_pass and its scans due to ON DELETE CASCADE
  DELETE FROM public.pass_registrations WHERE id = p_reg_id;
  
  RETURN json_build_object('success', true, 'message', 'Registration deleted successfully');
END; $func$;

GRANT EXECUTE ON FUNCTION public.delete_security_user(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_entry_pass(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_pass_registration(UUID) TO authenticated;


-- ========= Source Migration: 20251230_UNIFIED_LOG_CLEANUP.sql =========
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.login_history (
  id BIGSERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  identifier TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
DROP POLICY IF EXISTS "Owners can view login history" ON public.login_history;
  CREATE POLICY "Owners can view login history"
    ON public.login_history FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid() AND role = 'owner'
      )
    );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.log_login_attempt(
  p_role TEXT,
  p_identifier TEXT,
  p_status TEXT DEFAULT 'success'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.login_history (role, identifier, ip_address, user_agent, status)
  VALUES (
    p_role,
    p_identifier,
    current_setting('request.header.x-forwarded-for', true),
    current_setting('request.header.user-agent', true),
    p_status
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Login logging failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.authenticate_security_user(
  p_username TEXT,
  p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_success BOOLEAN := false;
BEGIN
  SELECT * INTO v_user
  FROM public.security_users
  WHERE username = p_username
  AND is_active = true;
  
  IF FOUND AND v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
    v_success := true;
    PERFORM public.log_login_attempt('security', p_username, 'success');
  ELSE
    PERFORM public.log_login_attempt('security', p_username, 'failure');
  END IF;

  IF v_success THEN
    RETURN json_build_object(
      'success', true,
      'user', json_build_object(
        'id', v_user.id,
        'username', v_user.username,
        'full_name', v_user.full_name
      )
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid username or password'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.login_coordinator(event_id_param BIGINT, password_param TEXT)
RETURNS JSON AS $$
DECLARE
  stored_pass TEXT;
  event_title TEXT;
  new_token TEXT;
  expires_at TIMESTAMPTZ;
BEGIN
  SELECT TRIM(e.coordinator_password::TEXT), e.title INTO stored_pass, event_title
  FROM events e WHERE e.id = event_id_param;
  
  IF stored_pass IS NULL OR stored_pass != password_param THEN 
    PERFORM public.log_login_attempt('coordinator', COALESCE(event_title, event_id_param::text), 'failure');
    RAISE EXCEPTION 'Invalid access code'; 
  END IF;

  new_token := gen_random_uuid()::TEXT || '-' || extract(epoch from now())::TEXT;
  expires_at := now() + interval '8 hours';
  
  UPDATE events 
  SET coordinator_session_token = new_token,
      coordinator_token_expires_at = expires_at
  WHERE id = event_id_param;

  PERFORM public.log_login_attempt('coordinator', event_title, 'success');
  
  RETURN json_build_object(
    'token', new_token,
    'expires_at', expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  
  IF v_settings.council_password_hash IS NULL THEN
     RAISE EXCEPTION 'Council access not configured';
  END IF;

  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     PERFORM public.log_login_attempt('council', 'Council Dashboard', 'failure');
     RAISE EXCEPTION 'Invalid password';
  END IF;

  PERFORM public.log_login_attempt('council', 'Council Dashboard', 'success');

  SELECT COUNT(*) INTO v_total_regs 
  FROM public.registrations 
  WHERE status IN ('pending', 'approved')
  AND deleted_at IS NULL;

  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations
    WHERE status IN ('pending', 'approved')
    AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other')
    ORDER BY count DESC
  ) t;

  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT 
        COALESCE(e.title, r.event_title, 'General/Other') as event_name,
        r.participant_type,
        COUNT(*) as batch_count
      FROM public.registrations r
      LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved')
      AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT 
      event_name,
      SUM(batch_count) as count,
      json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped
    GROUP BY event_name
    ORDER BY count DESC
  ) t;

  SELECT json_build_object(
    'total_valid', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid'),
    'valid_today', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid' AND (scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)
  ) INTO v_scan_stats;

  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT id, participant_name, pass_type, scan_result, scanned_at
    FROM public.pass_scans
    WHERE scan_result = 'valid'
    ORDER BY scanned_at DESC
    LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb)
  );
END; $func$;

CREATE OR REPLACE FUNCTION public.purge_all_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.admin_sessions
  WHERE last_seen_at < now() - interval '48 hours';
  
  DELETE FROM public.login_history
  WHERE created_at < now() - interval '48 hours';
  
  RAISE NOTICE 'Successfully purged logs older than 48 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge_all_logs_job');
    PERFORM cron.unschedule('cleanup_auth_data_job');
    
    PERFORM cron.schedule(
      'purge_all_logs_job',
      '30 21 * * *',
      'SELECT public.purge_all_logs();'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron failed: %', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION public.cleanup_auth_data()
RETURNS void AS $$
BEGIN
  PERFORM public.purge_all_logs();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ========= Source Migration: 20251230_add_event_dates.sql =========
-- 1. Add event_dates to security_settings
ALTER TABLE public.security_settings 
ADD COLUMN IF NOT EXISTS event_dates JSONB DEFAULT '[]'::jsonb;

-- 2. Update validate_entry_pass to check Specific Event Days
CREATE OR REPLACE FUNCTION public.validate_entry_pass(p_pass_token TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_pass RECORD; 
  v_scan_result TEXT; 
  v_username TEXT;
  v_already_scanned_today BOOLEAN;
  v_event_dates JSONB;
  v_today_str TEXT;
  v_day_number INTEGER := 0;
  v_day_label TEXT := '';
  v_date_item TEXT;
  v_idx INTEGER;
BEGIN
  v_username := current_user;
  v_today_str := to_char(CURRENT_DATE, 'YYYY-MM-DD');

  -- Get Event Dates Config
  SELECT event_dates INTO v_event_dates FROM public.security_settings LIMIT 1;
  
  -- Determine "Day X"
  IF v_event_dates IS NOT NULL AND jsonb_array_length(v_event_dates) > 0 THEN
    v_idx := 1;
    FOR v_date_item IN SELECT * FROM jsonb_array_elements_text(v_event_dates)
    LOOP
      IF v_date_item = v_today_str THEN
        v_day_number := v_idx;
        v_day_label := ' (Day ' || v_idx || ')';
      END IF;
      v_idx := v_idx + 1;
    END LOOP;
  END IF;

  SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token;
  
  IF NOT FOUND THEN
    v_scan_result := 'invalid';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type) VALUES (NULL, v_username, v_scan_result, NULL, 'general_entry');
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Invalid pass token');
  END IF;

  IF NOT v_pass.is_active THEN
    v_scan_result := 'inactive';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Pass has been deactivated');
  END IF;

  -- Logic: Check if scanned TODAY
  SELECT EXISTS (
    SELECT 1 FROM public.pass_scans 
    WHERE pass_id = v_pass.id 
    AND scan_result = 'valid'
    AND scanned_at::date = CURRENT_DATE
  ) INTO v_already_scanned_today;

  IF v_already_scanned_today THEN
    v_scan_result := 'already_used';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    
    -- Custom message if it's an event day
    IF v_day_number > 0 THEN
      RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Pass already used for Day ' || v_day_number, 'name', COALESCE(v_pass.participant_name, 'Unknown'));
    ELSE
      RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Already scanned today', 'name', COALESCE(v_pass.participant_name, 'Unknown'));
    END IF;
  END IF;

  -- VALID ENTRY
  v_scan_result := 'valid';
  UPDATE public.entry_passes SET is_used = true WHERE id = v_pass.id;
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
  VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
  
  IF v_day_number > 0 THEN
    RETURN json_build_object('valid', true, 'result', v_scan_result, 'message', 'Valid Entry' || v_day_label, 'name', COALESCE(v_pass.participant_name, 'VIP Guest'), 'pass_type', v_pass.pass_type);
  ELSE
    RETURN json_build_object('valid', true, 'result', v_scan_result, 'message', 'Valid Entry', 'name', COALESCE(v_pass.participant_name, 'VIP Guest'), 'pass_type', v_pass.pass_type);
  END IF;
  
END; $func$;


-- ========= Source Migration: 20251230_add_pass_deletions.sql =========
-- Deletion functions for Entry Passes and Registrations

-- 1. Delete a specific VIP or General Entry Pass
CREATE OR REPLACE FUNCTION public.delete_entry_pass(p_pass_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can delete passes'; 
  END IF;

  -- Scans will be deleted automatically if ON DELETE CASCADE is set, 
  -- otherwise we do it manually to be safe.
  DELETE FROM public.pass_scans WHERE pass_id = p_pass_id;
  
  -- Delete the pass
  DELETE FROM public.entry_passes WHERE id = p_pass_id;

  -- Also check if it was linked to a registration and null it out there
  UPDATE public.pass_registrations SET pass_id = NULL WHERE pass_id = p_pass_id;
  
  RETURN json_build_object('success', true, 'message', 'Pass deleted successfully');
END; $func$;

-- 2. Delete a Pass Registration request
CREATE OR REPLACE FUNCTION public.delete_pass_registration(p_reg_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
  v_pass_id UUID;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can delete registrations'; 
  END IF;

  -- Get associated pass_id
  SELECT pass_id INTO v_pass_id FROM public.pass_registrations WHERE id = p_reg_id;

  -- Delete the registration
  DELETE FROM public.pass_registrations WHERE id = p_reg_id;

  -- If there was an associated pass, delete it too (cleanup)
  IF v_pass_id IS NOT NULL THEN
     PERFORM public.delete_entry_pass(v_pass_id);
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Registration deleted successfully');
END; $func$;

GRANT EXECUTE ON FUNCTION public.delete_entry_pass(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_pass_registration(UUID) TO authenticated;


-- ========= Source Migration: 20251230_add_security_settings.sql =========
-- Add security settings table for controlling entry pass button visibility
CREATE TABLE IF NOT EXISTS public.security_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  entry_pass_button_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default row
INSERT INTO public.security_settings (id, entry_pass_button_enabled) 
VALUES (1, true) 
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- Public can read
DROP POLICY IF EXISTS "Public can read security settings" ON public.security_settings;
CREATE POLICY "Public can read security settings" 
ON public.security_settings FOR SELECT 
USING (true);

-- Only admins/owners can update
DROP POLICY IF EXISTS "Admins can update security settings" ON public.security_settings;
CREATE POLICY "Admins can update security settings" 
ON public.security_settings FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND (role = 'owner' OR role = 'admin')
  )
);


-- ========= Source Migration: 20251230_add_security_user_deletion.sql =========
-- Function to delete a security user (Admin only)
CREATE OR REPLACE FUNCTION public.delete_security_user(p_user_id INTEGER)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can delete security users'; 
  END IF;

  -- Delete the scans by this user first to resolve FK constraints if any,
  -- but usually we want to keep audit logs.
  -- If we want to keep audits, we might need to NULL out the scanned_by_username
  -- but since it's a TEXT field in pass_scans, it doesn't strictly depend on the user ID.
  
  -- Delete the security user
  DELETE FROM public.security_users WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Security user deleted successfully');
END; $func$;

GRANT EXECUTE ON FUNCTION public.delete_security_user(INTEGER) TO authenticated;


-- ========= Source Migration: 20251230_admin_security_passes_permission.sql =========
-- Add can_security_passes permission to admin_permissions
-- This allows owners to toggle access to the "Entry Pass Security" section for other admins.

-- 1) Add the column
alter table if exists public.admin_permissions
  add column if not exists can_security_passes boolean not null default false;

-- 2) Update has_permission(text) to support 'security_passes'
create or replace function public.has_permission(p_section text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_owner boolean := false;
  v_perm record;
begin
  if v_uid is null then
    return false;
  end if;

  -- Owner has all permissions
  select public.is_owner() into v_is_owner;
  if coalesce(v_is_owner, false) then
    return true;
  end if;

  -- Fetch permission row
  select * into v_perm from public.admin_permissions where user_id = v_uid::text limit 1;
  if not found then
    return false;
  end if;

  case lower(trim(p_section))
    when 'events' then return coalesce(v_perm.can_events, false);
    when 'schedule' then return coalesce(v_perm.can_schedule, false);
    when 'gallery' then return coalesce(v_perm.can_gallery, false);
    when 'sponsors' then return coalesce(v_perm.can_sponsors, false);
    when 'registrations' then return coalesce(v_perm.can_registrations, false);
    when 'registration_photos' then return coalesce(v_perm.can_registration_photos, false);
    when 'faculty' then return coalesce(v_perm.can_faculty, false);
    when 'core_team' then return coalesce(v_perm.can_core_team, false);
    when 'guest_artists' then return coalesce(v_perm.can_guest_artists, false);
    when 'chief_guests' then return coalesce(v_perm.can_chief_guests, false);
    when 'homebound' then return coalesce(v_perm.can_homebound, false);
    when 'sports' then return coalesce(v_perm.can_sports, false);
    when 'security_passes' then return coalesce(v_perm.can_security_passes, false);
    else return false;
  end case;
end $$;

-- 3) Reload schema
do $$ begin perform pg_notify('pgrst', 'reload schema'); exception when others then null; end $$;


-- ========= Source Migration: 20251230_council_dashboard.sql =========
-- Add council_password_hash to security_settings
ALTER TABLE public.security_settings
ADD COLUMN IF NOT EXISTS council_password_hash TEXT;

-- Function to set council password (hashes input)
CREATE OR REPLACE FUNCTION public.set_council_password(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can set council password'; 
  END IF;

  UPDATE public.security_settings
  SET council_password_hash = crypt(p_password, gen_salt('bf'))
  WHERE id = 1;

  RETURN json_build_object('success', true);
END; $func$;

-- Function to get council dashboard stats (verified by password)
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
BEGIN
  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  
  IF v_settings.council_password_hash IS NULL THEN
     RAISE EXCEPTION 'Council access not configured';
  END IF;

  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password';
  END IF;

  -- 2. Get Total Registrations (Pending + Approved)
  SELECT COUNT(*) INTO v_total_regs 
  FROM public.registrations 
  WHERE status IN ('pending', 'approved')
  AND deleted_at IS NULL;

  -- 3. Get Batch Stats (Group by participant_type)
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT participant_type as batch, COUNT(*) as count
    FROM public.registrations
    WHERE status IN ('pending', 'approved')
    AND deleted_at IS NULL
    GROUP BY participant_type
  ) t;

  -- 4. Get Scan Stats
  SELECT json_build_object(
    'total_valid', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid'),
    'valid_today', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid' AND scanned_at::date = CURRENT_DATE)
  ) INTO v_scan_stats;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats
  );
END; $func$;

GRANT EXECUTE ON FUNCTION public.set_council_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_council_dashboard_stats(TEXT) TO anon, authenticated;


-- ========= Source Migration: 20251230_council_drilldown_stats.sql =========
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
BEGIN
  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  
  IF v_settings.council_password_hash IS NULL THEN
     RAISE EXCEPTION 'Council access not configured';
  END IF;

  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password';
  END IF;

  -- 2. Get Total Registrations (Pending + Approved)
  SELECT COUNT(*) INTO v_total_regs 
  FROM public.registrations 
  WHERE status IN ('pending', 'approved')
  AND deleted_at IS NULL;

  -- 3. Get Batch Stats (Group by participant_type)
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations
    WHERE status IN ('pending', 'approved')
    AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other')
    ORDER BY count DESC
  ) t;

  -- 4. Get Event Stats (Robust Join + Per-event Batch breakdown)
  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT 
        COALESCE(e.title, r.event_title, 'General/Other') as event_name,
        r.participant_type,
        COUNT(*) as batch_count
      FROM public.registrations r
      LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved')
      AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT 
      event_name,
      SUM(batch_count) as count,
      json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped
    GROUP BY event_name
    ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats
  SELECT json_build_object(
    'total_valid', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid'),
    'valid_today', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid' AND scanned_at::date = CURRENT_DATE)
  ) INTO v_scan_stats;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats
  );
END; $func$;


-- ========= Source Migration: 20251230_council_stats_final.sql =========
-- Final refinement for get_council_dashboard_stats: IST Timezone consistency + Recent Scans
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  
  IF v_settings.council_password_hash IS NULL THEN
     RAISE EXCEPTION 'Council access not configured';
  END IF;

  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password';
  END IF;

  -- 2. Get Total Registrations (Pending + Approved)
  SELECT COUNT(*) INTO v_total_regs 
  FROM public.registrations 
  WHERE status IN ('pending', 'approved')
  AND deleted_at IS NULL;

  -- 3. Get Batch Stats (Group by participant_type)
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations
    WHERE status IN ('pending', 'approved')
    AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other')
    ORDER BY count DESC
  ) t;

  -- 4. Get Event Stats (Robust Join + Per-event Batch breakdown)
  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT 
        COALESCE(e.title, r.event_title, 'General/Other') as event_name,
        r.participant_type,
        COUNT(*) as batch_count
      FROM public.registrations r
      LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved')
      AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT 
      event_name,
      SUM(batch_count) as count,
      json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped
    GROUP BY event_name
    ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats (IST Corrected & Filtered by Approval)
  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) 
      FROM public.pass_scans ps
      LEFT JOIN public.entry_passes ep ON ps.pass_id = ep.id
      LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
      LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
      WHERE ps.scan_result = 'valid'
      AND (
        (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL) -- VIP/Manual
        OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
        OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
      )
    ),
    'valid_today', (
      SELECT COUNT(*) 
      FROM public.pass_scans ps
      LEFT JOIN public.entry_passes ep ON ps.pass_id = ep.id
      LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
      LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
      WHERE ps.scan_result = 'valid' 
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
      AND (
        (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
        OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
        OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
      )
    )
  ) INTO v_scan_stats;

  -- 6. Get Recent Scans (Last 10, Filtered by Approval)
  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.pass_type, ps.scan_result, ps.scanned_at
    FROM public.pass_scans ps
    LEFT JOIN public.entry_passes ep ON ps.pass_id = ep.id
    LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
    LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
    WHERE ps.scan_result = 'valid'
    AND (
      (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
      OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
      OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
    )
    ORDER BY ps.scanned_at DESC
    LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb)
  );
END; $func$;


-- ========= Source Migration: 20251230_delete_scan.sql =========
CREATE OR REPLACE FUNCTION public.delete_pass_scan_for_date(p_pass_id UUID, p_date DATE)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can delete scans'; 
  END IF;

  -- Delete scans for that date
  DELETE FROM public.pass_scans 
  WHERE pass_id = p_pass_id 
  AND scanned_at::date = p_date;
  
  RETURN json_build_object('success', true, 'message', 'Scan deleted successfully');
END; $func$;

GRANT EXECUTE ON FUNCTION public.delete_pass_scan_for_date(UUID, DATE) TO authenticated;


-- ========= Source Migration: 20251230_enforce_event_dates.sql =========
-- Create new function with strict date enforcement
CREATE OR REPLACE FUNCTION public.validate_entry_pass(p_pass_token TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_pass RECORD; 
  v_scan_result TEXT; 
  v_username TEXT;
  v_already_scanned_today BOOLEAN;
  v_event_dates JSONB;
  v_today_str TEXT;
  v_day_number INTEGER := 0;
  v_day_label TEXT := '';
  v_date_item TEXT;
  v_idx INTEGER;
BEGIN
  v_username := current_user;
  -- Force IST (Asia/Kolkata) for date comparison
  v_today_str := to_char(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD');

  -- Get Event Dates Config
  SELECT event_dates INTO v_event_dates FROM public.security_settings LIMIT 1;
  
  -- Determine "Day X" and Strict Check
  IF v_event_dates IS NOT NULL AND jsonb_array_length(v_event_dates) > 0 THEN
    v_idx := 1;
    FOR v_date_item IN SELECT * FROM jsonb_array_elements_text(v_event_dates)
    LOOP
      IF v_date_item = v_today_str THEN
        v_day_number := v_idx;
        v_day_label := ' (Day ' || v_idx || ')';
      END IF;
      v_idx := v_idx + 1;
    END LOOP;

    -- STRICT CHECK: If dates are configured but today is NOT one of them
    IF v_day_number = 0 THEN
       v_scan_result := 'invalid_date';
       -- Log attempt
       INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type) 
       VALUES (NULL, v_username, v_scan_result, NULL, 'general_entry');
       RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Entry denied: ' || v_today_str || ' is not an event day');
    END IF;
  END IF;

  SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token;
  
  IF NOT FOUND THEN
    v_scan_result := 'invalid';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type) VALUES (NULL, v_username, v_scan_result, NULL, 'general_entry');
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Invalid pass token');
  END IF;

  IF NOT v_pass.is_active THEN
    v_scan_result := 'inactive';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Pass has been deactivated');
  END IF;

  -- Logic: Check if scanned TODAY (IST)
  SELECT EXISTS (
    SELECT 1 FROM public.pass_scans 
    WHERE pass_id = v_pass.id 
    AND scan_result = 'valid'
    AND (scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
  ) INTO v_already_scanned_today;

  IF v_already_scanned_today THEN
    v_scan_result := 'already_used';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Pass already used for Day ' || v_day_number, 'name', COALESCE(v_pass.participant_name, 'Unknown'));
  END IF;

  -- VALID ENTRY
  v_scan_result := 'valid';
  UPDATE public.entry_passes SET is_used = true WHERE id = v_pass.id;
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
  VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
  
  RETURN json_build_object('valid', true, 'result', v_scan_result, 'message', 'Valid Entry' || v_day_label, 'name', COALESCE(v_pass.participant_name, 'VIP Guest'), 'pass_type', v_pass.pass_type);
  
END; $func$;


-- ========= Source Migration: 20251230_fix_council_event_stats.sql =========
-- Robust fix for Council Dashboard Event Stats
-- Uses JOIN with events table to ensure titles are captured even if registrations.event_title is NULL
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
BEGIN
  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  
  IF v_settings.council_password_hash IS NULL THEN
     RAISE EXCEPTION 'Council access not configured';
  END IF;

  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password';
  END IF;

  -- 2. Get Total Registrations (Pending + Approved)
  SELECT COUNT(*) INTO v_total_regs 
  FROM public.registrations 
  WHERE status IN ('pending', 'approved')
  AND deleted_at IS NULL;

  -- 3. Get Batch Stats (Group by participant_type)
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations
    WHERE status IN ('pending', 'approved')
    AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other')
    ORDER BY count DESC
  ) t;

  -- 4. Get Event Stats (Robust Join + Fallbacks)
  SELECT json_agg(t) INTO v_event_stats FROM (
    SELECT 
      COALESCE(e.title, r.event_title, 'General/Other') as event_name, 
      COUNT(r.id) as count
    FROM public.registrations r
    LEFT JOIN public.events e ON r.event_id = e.id
    WHERE r.status IN ('pending', 'approved')
    AND r.deleted_at IS NULL
    GROUP BY COALESCE(e.title, r.event_title, 'General/Other')
    ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats
  SELECT json_build_object(
    'total_valid', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid'),
    'valid_today', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid' AND scanned_at::date = CURRENT_DATE)
  ) INTO v_scan_stats;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats
  );
END; $func$;


-- ========= Source Migration: 20251230_fix_delete_scan_final.sql =========
CREATE OR REPLACE FUNCTION public.delete_pass_scan_for_date(p_pass_id UUID, p_date DATE)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
  v_scans_left INTEGER;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can delete scans'; 
  END IF;

  -- Delete scans for that date, using correct IST conversion for TIMESTAMPTZ
  DELETE FROM public.pass_scans 
  WHERE pass_id = p_pass_id 
  AND (scanned_at AT TIME ZONE 'Asia/Kolkata')::date = p_date;

  -- Check if any VALID scans remain for this pass
  SELECT COUNT(*) INTO v_scans_left 
  FROM public.pass_scans 
  WHERE pass_id = p_pass_id AND scan_result = 'valid';

  -- If NO scans remain, mark the pass as NOT used
  IF v_scans_left = 0 THEN
    UPDATE public.entry_passes SET is_used = false WHERE id = p_pass_id;
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Scan deleted successfully',
    'scans_remaining', v_scans_left
  );
END; $func$;


-- ========= Source Migration: 20251230_fix_delete_scan_status.sql =========
-- Improve delete_pass_scan_for_date to handle pass status reset
-- If all scans for a pass are deleted, the pass should be marked as NOT used.

CREATE OR REPLACE FUNCTION public.delete_pass_scan_for_date(p_pass_id UUID, p_date DATE)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
  v_scans_left INTEGER;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can delete scans'; 
  END IF;

  -- Delete scans for that date, explicitly converting scanned_at to IST
  DELETE FROM public.pass_scans 
  WHERE pass_id = p_pass_id 
  AND (scanned_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = p_date;

  -- Check if any VALID scans remain for this pass
  SELECT COUNT(*) INTO v_scans_left 
  FROM public.pass_scans 
  WHERE pass_id = p_pass_id AND scan_result = 'valid';

  -- If NO scans remain, mark the pass as NOT used
  IF v_scans_left = 0 THEN
    UPDATE public.entry_passes SET is_used = false WHERE id = p_pass_id;
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Scan deleted successfully',
    'scans_remaining', v_scans_left
  );
END; $func$;


-- ========= Source Migration: 20251230_fix_delete_scan_timezone.sql =========
-- Update delete_pass_scan_for_date to be IST-aware
-- This ensures that deletions in the UI correctly match the records in the DB,
-- especially for early-morning scans (12 AM - 5:30 AM IST).

CREATE OR REPLACE FUNCTION public.delete_pass_scan_for_date(p_pass_id UUID, p_date DATE)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can delete scans'; 
  END IF;

  -- Delete scans for that date, explicitly converting scanned_at to IST
  DELETE FROM public.pass_scans 
  WHERE pass_id = p_pass_id 
  AND (scanned_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = p_date;
  
  RETURN json_build_object('success', true, 'message', 'Scan deleted successfully');
END; $func$;


-- ========= Source Migration: 20251230_fix_security_scan_enum.sql =========
-- Fix check constraint on pass_scans to include 'invalid_date'
ALTER TABLE public.pass_scans 
DROP CONSTRAINT IF EXISTS pass_scans_scan_result_check;

ALTER TABLE public.pass_scans
ADD CONSTRAINT pass_scans_scan_result_check 
CHECK (scan_result IN ('valid', 'already_used', 'invalid', 'inactive', 'invalid_date'));

-- Refine validate_entry_pass to be more robust
CREATE OR REPLACE FUNCTION public.validate_entry_pass(p_pass_token TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_pass RECORD; 
  v_scan_result TEXT; 
  v_username TEXT;
  v_already_scanned_today BOOLEAN;
  v_event_dates JSONB;
  v_today_str TEXT;
  v_day_number INTEGER := 0;
  v_day_label TEXT := '';
  v_date_item TEXT;
  v_idx INTEGER;
BEGIN
  -- Use current_user (e.g. 'anon' or 'authenticated') as fallback
  v_username := COALESCE(current_setting('request.jwt.claims', true)::json->>'email', current_user);
  v_today_str := to_char(CURRENT_DATE, 'YYYY-MM-DD');

  -- 1. Check if today is an event day
  SELECT event_dates INTO v_event_dates FROM public.security_settings LIMIT 1;
  
  IF v_event_dates IS NOT NULL AND jsonb_array_length(v_event_dates) > 0 THEN
    v_idx := 1;
    FOR v_date_item IN SELECT * FROM jsonb_array_elements_text(v_event_dates)
    LOOP
      IF v_date_item = v_today_str THEN
        v_day_number := v_idx;
        v_day_label := ' (Day ' || v_idx || ')';
      END IF;
      v_idx := v_idx + 1;
    END LOOP;

    IF v_day_number = 0 THEN
       v_scan_result := 'invalid_date';
       INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
       VALUES (NULL, v_username, v_scan_result, NULL, 'general_entry');
       RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Entry denied: Not an event day');
    END IF;
  END IF;

  -- 2. Lookup Pass
  SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token;
  
  IF NOT FOUND THEN
    v_scan_result := 'invalid';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (NULL, v_username, v_scan_result, NULL, 'general_entry');
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Invalid pass token');
  END IF;

  -- 3. Check Active
  IF NOT v_pass.is_active THEN
    v_scan_result := 'inactive';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Pass has been deactivated');
  END IF;

  -- 4. Check Multi-day Usage
  SELECT EXISTS (
    SELECT 1 FROM public.pass_scans 
    WHERE pass_id = v_pass.id 
    AND scan_result = 'valid'
    AND scanned_at::date = CURRENT_DATE
  ) INTO v_already_scanned_today;

  IF v_already_scanned_today THEN
    v_scan_result := 'already_used';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    RETURN json_build_object(
      'valid', false, 
      'result', v_scan_result, 
      'message', 'Pass already used for Day ' || v_day_number, 
      'name', COALESCE(v_pass.participant_name, 'Unknown')
    );
  END IF;

  -- 5. Success
  v_scan_result := 'valid';
  UPDATE public.entry_passes SET is_used = true WHERE id = v_pass.id; 
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
  VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
  
  RETURN json_build_object(
    'valid', true, 
    'result', v_scan_result, 
    'message', 'Valid Entry' || v_day_label, 
    'name', COALESCE(v_pass.participant_name, 'VIP Guest'), 
    'pass_type', v_pass.pass_type
  );
END; $func$;


-- ========= Source Migration: 20251230_fix_security_settings_rls.sql =========
-- Fix RLS for security_settings to allow upsert (needs INSERT permission)
DROP POLICY IF EXISTS "Admins can insert security settings" ON public.security_settings;
CREATE POLICY "Admins can insert security settings" 
ON public.security_settings FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND (role = 'owner' OR role = 'admin')
  )
);


-- ========= Source Migration: 20251230_get_security_users.sql =========
-- Function to get public list of security users (for login dropdown)
CREATE OR REPLACE FUNCTION public.get_public_security_users()
RETURNS TABLE (
  username TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    su.username,
    su.full_name
  FROM public.security_users su
  WHERE su.is_active = true
  ORDER BY su.full_name ASC;
END;
$$;

-- Grant execute to public (anon)
GRANT EXECUTE ON FUNCTION public.get_public_security_users() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_security_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_security_users() TO service_role;


-- ========= Source Migration: 20251230_reset_pass.sql =========
-- Function to reset pass usage (Admin only)
CREATE OR REPLACE FUNCTION public.reset_pass_usage(p_pass_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can reset passes'; 
  END IF;

  -- Delete scans
  DELETE FROM public.pass_scans WHERE pass_id = p_pass_id;
  
  -- Reset pass status
  UPDATE public.entry_passes 
  SET is_used = false 
  WHERE id = p_pass_id;

  RETURN json_build_object('success', true, 'message', 'Pass usage reset successfully');
END; $func$;

GRANT EXECUTE ON FUNCTION public.reset_pass_usage(UUID) TO authenticated;


-- ========= Source Migration: 20251230_security_dashboard_stats.sql =========
-- RPC function to get security dashboard stats
-- Bypasses RLS by using SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.get_security_dashboard_stats(
  p_username TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today_count INTEGER;
  v_recent_scans JSON;
  v_today_ist DATE;
BEGIN
  -- Verify the username is a valid, active security user
  IF NOT EXISTS (
    SELECT 1 FROM public.security_users
    WHERE username = p_username
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive security user';
  END IF;
  
  -- Get today's date in IST
  v_today_ist := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;
  
  -- Get today's valid entry count (IST timezone, Filtered by Approval)
  SELECT COUNT(*)
  INTO v_today_count
  FROM public.pass_scans ps
  LEFT JOIN public.entry_passes ep ON ps.pass_id = ep.id
  LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
  LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
  WHERE ps.scan_result = 'valid'
  AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist
  AND (
    (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL) -- VIP/Manual
    OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
    OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
  );
  
  -- Get recent valid scans (last 10, today only in IST, Filtered by Approval)
  SELECT json_agg(
    json_build_object(
      'id', id,
      'participant_name', participant_name,
      'scanned_at', scanned_at,
      'scan_result', scan_result,
      'pass_type', pass_type
    )
    ORDER BY scanned_at DESC
  )
  INTO v_recent_scans
  FROM (
    SELECT ps.id, ps.participant_name, ps.scanned_at, ps.scan_result, ps.pass_type
    FROM public.pass_scans ps
    LEFT JOIN public.entry_passes ep ON ps.pass_id = ep.id
    LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
    LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
    WHERE ps.scan_result = 'valid'
    AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist
    AND (
      (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
      OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
      OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
    )
    ORDER BY ps.scanned_at DESC
    LIMIT 10
  ) recent;
  
  -- Return combined stats
  RETURN json_build_object(
    'today_count', v_today_count,
    'recent_scans', COALESCE(v_recent_scans, '[]'::json)
  );
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.get_security_dashboard_stats TO anon, authenticated;


-- ========= Source Migration: 20251230_update_council_stats.sql =========
-- Update Council Dashboard Stats RPC to include event-wise stats
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
BEGIN
  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  
  IF v_settings.council_password_hash IS NULL THEN
     RAISE EXCEPTION 'Council access not configured';
  END IF;

  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password';
  END IF;

  -- 2. Get Total Registrations (Pending + Approved)
  SELECT COUNT(*) INTO v_total_regs 
  FROM public.registrations 
  WHERE status IN ('pending', 'approved')
  AND deleted_at IS NULL;

  -- 3. Get Batch Stats (Group by participant_type)
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT participant_type as batch, COUNT(*) as count
    FROM public.registrations
    WHERE status IN ('pending', 'approved')
    AND deleted_at IS NULL
    GROUP BY participant_type
    ORDER BY count DESC
  ) t;

  -- 4. Get Event Stats (Robust Join + Fallbacks)
  SELECT json_agg(t) INTO v_event_stats FROM (
    SELECT 
      COALESCE(e.title, r.event_title, 'General/Other') as event_name, 
      COUNT(r.id) as count
    FROM public.registrations r
    LEFT JOIN public.events e ON r.event_id = e.id
    WHERE r.status IN ('pending', 'approved')
    AND r.deleted_at IS NULL
    GROUP BY COALESCE(e.title, r.event_title, 'General/Other')
    ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats
  SELECT json_build_object(
    'total_valid', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid'),
    'valid_today', (SELECT COUNT(*) FROM public.pass_scans WHERE scan_result = 'valid' AND scanned_at::date = CURRENT_DATE)
  ) INTO v_scan_stats;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats
  );
END; $func$;


-- ========= Source Migration: 20251230_update_validate_pass.sql =========
-- Update validate_entry_pass to allow ONE ENTRY PER DAY
-- This enables multi-day event access with the same pass

CREATE OR REPLACE FUNCTION public.validate_entry_pass(p_pass_token TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_pass RECORD; 
  v_scan_result TEXT; 
  v_username TEXT;
  v_already_scanned_today BOOLEAN;
  v_today DATE;
BEGIN
  v_username := current_user;
  v_today := CURRENT_DATE; -- Uses server date (UTC usually, ensure consistent timezone if needed)

  SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token;
  
  -- 1. Check if exists
  IF NOT FOUND THEN
    v_scan_result := 'invalid';
    -- Log invalid attempt
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (NULL, v_username, v_scan_result, NULL, 'general_entry'); -- logging as generic
    
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Invalid pass token');
  END IF;

  -- 2. Check if manually deactivated
  IF NOT v_pass.is_active THEN
    v_scan_result := 'inactive';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Pass has been deactivated');
  END IF;

  -- 3. Check if ALREADY SCANNED TODAY
  -- We check pass_scans table for a 'valid' scan record for this pass_id created today
  SELECT EXISTS (
    SELECT 1 FROM public.pass_scans 
    WHERE pass_id = v_pass.id 
    AND scan_result = 'valid'
    AND scanned_at::date = v_today
  ) INTO v_already_scanned_today;

  IF v_already_scanned_today THEN
    v_scan_result := 'already_used';
    
    -- Log the attempt (optional, helps track re-entry attempts)
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    
    RETURN json_build_object(
      'valid', false, 
      'result', v_scan_result, 
      'message', 'Already scanned today', 
      'name', COALESCE(v_pass.participant_name, 'Unknown')
    );
  END IF;

  -- 4. VALID ENTRY
  v_scan_result := 'valid';
  
  -- Mark as used (global flag, just to show it's not "fresh" unused pass)
  UPDATE public.entry_passes SET is_used = true WHERE id = v_pass.id;
  
  -- Insert Valid Scan Record
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
  VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
  
  RETURN json_build_object(
    'valid', true, 
    'result', v_scan_result, 
    'message', 'Valid entry', 
    'name', COALESCE(v_pass.participant_name, 'VIP Guest'), 
    'pass_type', v_pass.pass_type
  );
END; $func$;


-- ========= Source Migration: 20260101_fix_scanner_permissions.sql =========
----------------------------------------------------------------
-- FIX: Scanner Permissions (Offline Sync)
----------------------------------------------------------------
-- Issue: Non-admin users (Security guards) cannot fetch passes or upload scans.
-- Solution: Grant authenticated users (scanners) access to necessary tables.

-- 1. ENTRY PASSES (Read Access for Offline Cache)
ALTER TABLE entry_passes ENABLE ROW LEVEL SECURITY;

-- Allow Scanners to read ALL passes (Required for offline validation)
-- Note: Requires user to be logged in (authenticated)
DROP POLICY IF EXISTS "Scanners can read entry passes" ON entry_passes;
CREATE POLICY "Scanners can read entry passes" ON entry_passes
  FOR SELECT TO authenticated
  USING (true);

-- 2. PASS SCANS (Write Access for Sync)
ALTER TABLE pass_scans ENABLE ROW LEVEL SECURITY;

-- Allow Scanners to upload new scans
DROP POLICY IF EXISTS "Scanners can insert scans" ON pass_scans;
CREATE POLICY "Scanners can insert scans" ON pass_scans
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow Scanners to read their own scans (Optional: for history)
-- CREATE POLICY "Scanners can read own scans" ON pass_scans
--  FOR SELECT TO authenticated
--  USING (true); -- Simplified to allow reading history (or restrict to auth.uid())

-- 3. VALIDATION RULES (Already covered, but ensuring)
ALTER TABLE validation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read validation rules" ON validation_rules;
CREATE POLICY "Public read validation rules" ON validation_rules
  FOR SELECT TO public USING (true);


-- ========= Source Migration: 20260101_full_security_backend.sql =========
-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

----------------------------------------------------------------
-- 1. SECURITY SETTINGS (Fixes "Settings" tab not working)
----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_settings (
  id INTEGER PRIMARY KEY, -- Singleton configuration row (ID=1)
  entry_pass_button_enabled BOOLEAN DEFAULT true,
  event_dates JSONB DEFAULT '[]'::jsonb, -- Stores allowed event dates as ["YYYY-MM-DD"]
  councils_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read settings (required for scanners/dashboard)
DROP POLICY IF EXISTS "Public read security settings" ON security_settings;
CREATE POLICY "Public read security settings" ON security_settings
  FOR SELECT TO public USING (true);

-- Policy: Admins can update settings
DROP POLICY IF EXISTS "Admins update security settings" ON security_settings;
CREATE POLICY "Admins update security settings" ON security_settings
  FOR UPDATE TO authenticated
  USING (
    -- User must be in admin_users table
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  )
  WITH CHECK (true);

-- Initialize the default settings row (ID=1) if it doesn't exist
INSERT INTO security_settings (id, entry_pass_button_enabled, event_dates, councils_enabled)
VALUES (1, true, '[]'::jsonb, false)
ON CONFLICT (id) DO NOTHING;


----------------------------------------------------------------
-- 2. VALIDATION RULES (Fixes "Rules" tab / "Read Only Mode")
----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- e.g. 'date_restriction', 'capacity'
  pass_type TEXT, -- NULL = all passes
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE validation_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read active rules
DROP POLICY IF EXISTS "Public read validation rules" ON validation_rules;
CREATE POLICY "Public read validation rules" ON validation_rules
  FOR SELECT TO public USING (true);

-- Policy: Admins can manage rules
DROP POLICY IF EXISTS "Admins manage validation rules" ON validation_rules;
CREATE POLICY "Admins manage validation rules" ON validation_rules
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Insert default rules if the table is empty
INSERT INTO validation_rules (rule_name, rule_type, pass_type, config, is_active, priority, error_message)
SELECT 
  'Event Day 1 Only', 
  'date_restriction', 
  'regular', 
  '{"allowedDates": ["2025-12-30"]}'::jsonb, 
  false, 
  20, 
  'This pass is only valid for Day 1'
WHERE NOT EXISTS (SELECT 1 FROM validation_rules WHERE rule_type = 'date_restriction');

INSERT INTO validation_rules (rule_name, rule_type, pass_type, config, is_active, priority, error_message)
SELECT 
  'Venue Capacity Limit', 
  'capacity', 
  NULL, 
  '{"maxCapacity": 500}'::jsonb, 
  false, 
  5, 
  'Venue has reached maximum capacity'
WHERE NOT EXISTS (SELECT 1 FROM validation_rules WHERE rule_type = 'capacity');


----------------------------------------------------------------
-- 3. ADMIN USERS (Dependency for permissions)
----------------------------------------------------------------
-- Ensure admin_users table exists so policies don't fail
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read admin users" ON admin_users;
CREATE POLICY "Read admin users" ON admin_users
  FOR SELECT TO authenticated USING (true);

-- NOTE: You may need to manually insert your user into 'admin_users' if you are locked out.
-- Example: INSERT INTO admin_users (user_id, email, role) VALUES ('YOUR_UUID', 'email@example.com', 'owner');


-- ========= Source Migration: 20260101_public_scanner_access.sql =========
----------------------------------------------------------------
-- FIX: Public/Anonymous Scanner Access
----------------------------------------------------------------
-- Issue: User requested offline fetching without admin/user login.
-- Solution: Grant PUBLIC (Anonymous) access to fetch passes and upload scans.
-- WARNING: This makes pass data readable by anyone with the API URL and Key (which is public in frontend).
-- Ensure this is intended for your use case (e.g., Kiosk mode).

-- 1. ENTRY PASSES (Public Read)
ALTER TABLE entry_passes ENABLE ROW LEVEL SECURITY;

-- Drop previous restricted policy

-- Allow ANYONE to read passes (for anonymous offline cache)
DROP POLICY IF EXISTS "Public read entry passes" ON entry_passes;
CREATE POLICY "Public read entry passes" ON entry_passes
  FOR SELECT TO public
  USING (true);

-- 2. PASS SCANS (Public Write)
ALTER TABLE pass_scans ENABLE ROW LEVEL SECURITY;

-- Drop previous restricted policy

-- Allow ANYONE to upload scans
DROP POLICY IF EXISTS "Public insert scans" ON pass_scans;
CREATE POLICY "Public insert scans" ON pass_scans
  FOR INSERT TO public
  WITH CHECK (true);

-- 3. VALIDATION RULES (Already public, but ensuring)
DROP POLICY IF EXISTS "Public read validation rules" ON validation_rules;
CREATE POLICY "Public read validation rules" ON validation_rules
  FOR SELECT TO public USING (true);


-- ========= Source Migration: 20260101_validation_rules.sql =========
-- Create validation_rules table
CREATE TABLE IF NOT EXISTS validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- 'time_window', 'capacity', 'day_restriction', 'date_restriction', 'custom'
  pass_type TEXT, -- NULL = applies to all
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_validation_rules_active ON validation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_validation_rules_type ON validation_rules(rule_type);

-- Enable RLS
ALTER TABLE validation_rules ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public read active rules" ON validation_rules;
CREATE POLICY "Public read active rules" ON validation_rules
  FOR SELECT TO public USING (true); -- Allow all to read rules (needed for scanners)

DROP POLICY IF EXISTS "Admins manage rules" ON validation_rules;
CREATE POLICY "Admins manage rules" ON validation_rules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND (role = 'owner' OR role = 'admin' OR is_primary = true)
    )
  );

-- Insert DEFAULT RULES if table is empty
INSERT INTO validation_rules (id, rule_name, rule_type, pass_type, config, is_active, priority, error_message)
SELECT 
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- consistent UUID
  'Event Day 1 Only',
  'date_restriction',
  'regular',
  '{"allowedDates": ["2025-12-30"]}'::jsonb,
  false,
  20,
  'This pass is only valid for Day 1 (Dec 30)'
WHERE NOT EXISTS (SELECT 1 FROM validation_rules WHERE rule_type = 'date_restriction');

INSERT INTO validation_rules (id, rule_name, rule_type, pass_type, config, is_active, priority, error_message)
SELECT 
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'Venue Capacity Limit',
  'capacity',
  NULL,
  '{"maxCapacity": 500}'::jsonb,
  false,
  5,
  'Venue has reached maximum capacity'
WHERE NOT EXISTS (SELECT 1 FROM validation_rules WHERE rule_type = 'capacity');


-- ========= Source Migration: 20260103_TOTAL_REPAIR.sql =========
-- FINAL COMPREHENSIVE REPAIR: Scan History & Status Tracking
-- This script fixes missing columns, triggers, and RPC mismatches.

-- 1. Ensure Table Structure
ALTER TABLE public.entry_passes 
ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

ALTER TABLE public.pass_scans 
ADD COLUMN IF NOT EXISTS pass_token TEXT,
ADD COLUMN IF NOT EXISTS guard_name TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_pass_scans_token ON public.pass_scans(pass_token);
CREATE INDEX IF NOT EXISTS idx_pass_scans_scanned_at ON public.pass_scans(scanned_at DESC);

-- 2. Pass ID Resolution Function (For Offline Sync)
CREATE OR REPLACE FUNCTION public.resolve_pass_id_from_token()
RETURNS TRIGGER AS $$
BEGIN
  -- If pass_id is null but token is present, find the pass
  IF NEW.pass_id IS NULL AND NEW.pass_token IS NOT NULL THEN
    SELECT id INTO NEW.pass_id FROM public.entry_passes WHERE pass_token = NEW.pass_token;
  END IF;
  
  -- If we still don't have a pass_id (e.g. invalid token), we allow the scan but mark as invalid
  IF NEW.pass_id IS NULL THEN
    NEW.scan_result := 'invalid';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_resolve_pass_id ON public.pass_scans;
CREATE TRIGGER tr_resolve_pass_id
BEFORE INSERT ON public.pass_scans
FOR EACH ROW EXECUTE FUNCTION public.resolve_pass_id_from_token();

-- 3. Pass Usage Sync Function
CREATE OR REPLACE FUNCTION public.handle_pass_scan_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update pass status for valid scans
  IF NEW.scan_result = 'valid' AND NEW.pass_id IS NOT NULL THEN
    UPDATE public.entry_passes 
    SET 
      is_used = true,
      used_at = COALESCE(NEW.scanned_at, NOW())
    WHERE id = NEW.pass_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_pass_usage ON public.pass_scans;
CREATE TRIGGER tr_sync_pass_usage
AFTER INSERT ON public.pass_scans
FOR EACH ROW EXECUTE FUNCTION public.handle_pass_scan_sync();

-- 4. Corrected Scan Processing RPC
CREATE OR REPLACE FUNCTION public.process_pass_scan_v3(
  p_pass_token TEXT,
  p_guard_name TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_pass RECORD;
  v_participant_name TEXT;
  v_pass_type public.pass_type;
BEGIN
  -- 1. Find the pass
  SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token;
  
  -- 2. Handle Invalid Token
  IF v_pass IS NULL THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, guard_name, pass_token)
    VALUES (NULL, 'system', 'invalid', p_guard_name, p_pass_token);
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Invalid Pass Token',
      'participant_name', 'Unknown',
      'pass_type', NULL
    );
  END IF;

  v_participant_name := v_pass.participant_name;
  v_pass_type := v_pass.pass_type;

  -- 3. Check if active
  IF NOT v_pass.is_active THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name, pass_token)
    VALUES (v_pass.id, 'system', 'inactive', v_participant_name, v_pass_type, p_guard_name, p_pass_token);
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Pass is Inactive',
      'participant_name', v_participant_name,
      'pass_type', v_pass_type
    );
  END IF;

  -- 4. Check if already used
  -- Note: We still record the attempt in pass_scans
  IF v_pass.is_used THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name, pass_token)
    VALUES (v_pass.id, 'system', 'already_used', v_participant_name, v_pass_type, p_guard_name, p_pass_token);
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Pass Already Scanned',
      'participant_name', v_participant_name,
      'pass_type', v_pass_type
    );
  END IF;

  -- 5. Record Valid Scan
  -- Note: The trigger 'tr_sync_pass_usage' will automatically handle UPDATE entry_passes
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name, pass_token)
  VALUES (v_pass.id, 'system', 'valid', v_participant_name, v_pass_type, p_guard_name, p_pass_token);

  RETURN json_build_object(
    'success', true, 
    'message', 'Valid Entry', 
    'participant_name', v_participant_name,
    'pass_type', v_pass_type
  );
END; $$;

-- 5. Update Council History Query (naming clarity)
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats_v3(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  PERFORM public.cleanup_old_scans();

  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  SELECT COUNT(*) INTO v_total_regs FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL;

  -- ... (stats queries remain same)
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other') ORDER BY count DESC
  ) t;

  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT COALESCE(e.title, r.event_title, 'General/Other') as event_name, r.participant_type, COUNT(*) as batch_count
      FROM public.registrations r LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved') AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT event_name, SUM(batch_count) as count, json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped GROUP BY event_name ORDER BY count DESC
  ) t;

  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    )
  ) INTO v_scan_stats;

  -- UPDATED RECENT SCANS: Use COALESCE for guard name
  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT 
      ps.id, 
      ps.participant_name, 
      ps.pass_type, 
      ps.scan_result, 
      ps.scanned_at, 
      COALESCE(ps.guard_name, ps.scanned_by_username) as guard_name
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb),
    'event_dates', COALESCE(v_settings.event_dates, '[]'::jsonb)
  );
END; $func$;


-- ========= Source Migration: 20260103_add_pass_template.sql =========
-- Add pass_template_config column to security_settings table
-- This stores the design configuration (background image, QR position, etc.) for each event day
-- Format: { "day_1": { "bgUrl": "...", "qr": { "x": 10, "y": 10, "size": 100 } }, ... }

ALTER TABLE public.security_settings 
ADD COLUMN IF NOT EXISTS pass_template_config JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.security_settings.pass_template_config IS 'Stores pass design configuration (background, QR position) indexed by day key';


-- ========= Source Migration: 20260103_auto_cleanup.sql =========
-- 15-DAY AUTO-CLEANUP POLICY
-- 1. Add index for efficient date-range deletes
CREATE INDEX IF NOT EXISTS idx_pass_scans_scanned_at ON public.pass_scans(scanned_at);

-- 2. Create cleanup function (Centralized logic)
CREATE OR REPLACE FUNCTION public.cleanup_old_scans()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
BEGIN
  -- Delete scans older than 15 days
  DELETE FROM public.pass_scans WHERE scanned_at < (NOW() - INTERVAL '15 days');
END; $$;

-- 3. Update get_security_dashboard_stats to perform cleanup on load
CREATE OR REPLACE FUNCTION public.get_security_dashboard_stats(p_username TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_today_count INTEGER;
  v_recent_scans JSON;
  v_today_ist DATE;
BEGIN
  -- Trigger background cleanup
  PERFORM public.cleanup_old_scans();

  IF NOT EXISTS (SELECT 1 FROM public.security_users WHERE username = p_username AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive security user';
  END IF;
  
  v_today_ist := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;
  
  SELECT COUNT(*) INTO v_today_count FROM public.pass_scans ps
  JOIN public.entry_passes ep ON ps.pass_id = ep.id
  WHERE ps.scan_result = 'valid' AND ep.is_active = true
  AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist;
  
  SELECT json_agg(json_build_object(
    'id', id, 
    'participant_name', participant_name, 
    'scanned_at', scanned_at, 
    'scan_result', scan_result, 
    'pass_type', pass_type,
    'guard_name', guard_name
  ))
  INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.scanned_at, ps.scan_result, ps.pass_type, ps.guard_name
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) recent;
  
  RETURN json_build_object('today_count', v_today_count, 'recent_scans', COALESCE(v_recent_scans, '[]'::json));
END; $$;

-- 4. Update get_council_dashboard_stats_v3 to perform cleanup on load
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats_v3(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  -- Trigger background cleanup
  PERFORM public.cleanup_old_scans();

  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  -- 2. Get Total Registrations (Pending + Approved)
  SELECT COUNT(*) INTO v_total_regs FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL;

  -- 3. Get Batch Stats
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other') ORDER BY count DESC
  ) t;

  -- 4. Get Event Stats
  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT COALESCE(e.title, r.event_title, 'General/Other') as event_name, r.participant_type, COUNT(*) as batch_count
      FROM public.registrations r LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved') AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT event_name, SUM(batch_count) as count, json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped GROUP BY event_name ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats
  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    )
  ) INTO v_scan_stats;

  -- 6. Get Recent Scans
  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.pass_type, ps.scan_result, ps.scanned_at, ps.guard_name
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb)
  );
END; $func$;


-- ========= Source Migration: 20260103_consolidate_vp_rpcs.sql =========
-- ABSOLUTE CLEANUP AND ALPHABETICAL CONSOLIDATION
-- Resolves "Could not find function in schema cache" by aligning with PostgREST parameter matching.

-- 1. Robustly drop all versions of the problematic functions
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all overloads of create_vip_pass
    FOR r IN (SELECT oid::regprocedure as proc FROM pg_proc WHERE proname = 'create_vip_pass' AND pronamespace = 'public'::regnamespace) LOOP
        EXECUTE 'DROP FUNCTION ' || r.proc;
    END LOOP;

    -- Drop all overloads of delete_entry_pass
    FOR r IN (SELECT oid::regprocedure as proc FROM pg_proc WHERE proname = 'delete_entry_pass' AND pronamespace = 'public'::regnamespace) LOOP
        EXECUTE 'DROP FUNCTION ' || r.proc;
    END LOOP;
END $$;

-- 2. Re-create create_vip_pass with ALPHABETICAL parameters
-- (p_council_password, p_name, p_notes)
CREATE OR REPLACE FUNCTION public.create_vip_pass(
  p_council_password TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_pass_id UUID;
  v_pass_token TEXT;
  v_settings RECORD;
BEGIN
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to create VIP passes'; END IF;
  
  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_by)
  VALUES (v_pass_token, 'vip', p_name, p_notes, auth.uid()) RETURNING id INTO v_pass_id;
  
  RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END; $$;

-- 3. Re-create delete_entry_pass with ALPHABETICAL parameters
-- (p_council_password, p_pass_id)
CREATE OR REPLACE FUNCTION public.delete_entry_pass(
  p_council_password TEXT DEFAULT NULL,
  p_pass_id UUID DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_settings RECORD;
BEGIN
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to delete passes'; END IF;
  IF p_pass_id IS NULL THEN RAISE EXCEPTION 'Pass ID is required'; END IF;

  DELETE FROM public.entry_passes WHERE id = p_pass_id;
  RETURN json_build_object('success', true, 'message', 'Pass deleted successfully');
END; $$;

-- 4. Re-create get_council_vip_passes
CREATE OR REPLACE FUNCTION public.get_council_vip_passes(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_settings RECORD;
  v_passes JSON;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL OR v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password';
  END IF;

  SELECT json_agg(t) INTO v_passes FROM (
    SELECT id, pass_token, pass_type, participant_name, notes, is_used, is_active, created_at
    FROM public.entry_passes WHERE pass_type = 'vip'
    ORDER BY created_at DESC
  ) t;

  RETURN COALESCE(v_passes, '[]'::json);
END; $$;

GRANT EXECUTE ON FUNCTION public.create_vip_pass(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_entry_pass(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_council_vip_passes(TEXT) TO anon, authenticated;


-- ========= Source Migration: 20260103_dashboard_guard_fields.sql =========
-- Add guard_name to dashboard recent scan results
-- 1. Update get_council_dashboard_stats_v3
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats_v3(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  -- 2. Get Total Registrations (Pending + Approved)
  SELECT COUNT(*) INTO v_total_regs FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL;

  -- 3. Get Batch Stats
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other') ORDER BY count DESC
  ) t;

  -- 4. Get Event Stats
  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT COALESCE(e.title, r.event_title, 'General/Other') as event_name, r.participant_type, COUNT(*) as batch_count
      FROM public.registrations r LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved') AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT event_name, SUM(batch_count) as count, json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped GROUP BY event_name ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats
  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    )
  ) INTO v_scan_stats;

  -- 6. Get Recent Scans (WITH GUARD NAME)
  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.pass_type, ps.scan_result, ps.scanned_at, ps.guard_name
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb)
  );
END; $func$;

-- 2. Update get_security_dashboard_stats (WITH GUARD NAME)
CREATE OR REPLACE FUNCTION public.get_security_dashboard_stats(p_username TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_today_count INTEGER;
  v_recent_scans JSON;
  v_today_ist DATE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.security_users WHERE username = p_username AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive security user';
  END IF;
  
  v_today_ist := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;
  
  SELECT COUNT(*) INTO v_today_count FROM public.pass_scans ps
  JOIN public.entry_passes ep ON ps.pass_id = ep.id
  WHERE ps.scan_result = 'valid' AND ep.is_active = true
  AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist;
  
  SELECT json_agg(json_build_object(
    'id', id, 
    'participant_name', participant_name, 
    'scanned_at', scanned_at, 
    'scan_result', scan_result, 
    'pass_type', pass_type,
    'guard_name', guard_name
  ))
  INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.scanned_at, ps.scan_result, ps.pass_type, ps.guard_name
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) recent;
  
  RETURN json_build_object('today_count', v_today_count, 'recent_scans', COALESCE(v_recent_scans, '[]'::json));
END; $$;


-- ========= Source Migration: 20260103_enhance_council_vip_list.sql =========
-- Enhance Council Dashboard RPCs (Final Fix - Removed Invalid Column)

-- 1. Update get_council_dashboard_stats_v3
DROP FUNCTION IF EXISTS public.get_council_dashboard_stats_v3(text);

CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats_v3(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  PERFORM public.cleanup_old_scans();

  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  SELECT COUNT(*) INTO v_total_regs FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL;

  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other') ORDER BY count DESC
  ) t;

  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT COALESCE(e.title, r.event_title, 'General/Other') as event_name, r.participant_type, COUNT(*) as batch_count
      FROM public.registrations r LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved') AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT event_name, SUM(batch_count) as count, json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped GROUP BY event_name ORDER BY count DESC
  ) t;

  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    )
  ) INTO v_scan_stats;

  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT 
      ps.id, 
      ps.participant_name, 
      ps.pass_type, 
      ps.scan_result, 
      ps.scanned_at, 
      ps.scanned_by_username as guard_name
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb),
    'event_dates', COALESCE(v_settings.event_dates, '[]'::jsonb)
  );
END; $func$;

-- 2. Fix get_council_vip_passes_v3 (Removed deleted_at check)
DROP FUNCTION IF EXISTS public.get_council_vip_passes_v3(text);

CREATE OR REPLACE FUNCTION public.get_council_vip_passes_v3(p_password TEXT)
RETURNS TABLE (
  pass_id UUID,
  participant_name TEXT,
  pass_type public.pass_type,
  created_at TIMESTAMPTZ,
  notes TEXT,
  pass_token TEXT,
  is_used BOOLEAN,
  is_active BOOLEAN,
  usage_logs JSONB
) LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE 
  v_settings RECORD;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE security_settings.id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  RETURN QUERY
  SELECT 
    ep.id AS pass_id,
    ep.participant_name,
    ep.pass_type,
    ep.created_at,
    ep.notes,
    ep.pass_token,
    ep.is_used,
    ep.is_active,
    COALESCE(
      (
        SELECT jsonb_agg(ps.scanned_at ORDER BY ps.scanned_at ASC)
        FROM public.pass_scans ps
        WHERE ps.pass_id = ep.id AND ps.scan_result = 'valid'
      ),
      '[]'::jsonb
    ) AS usage_logs
  FROM public.entry_passes ep
  WHERE ep.pass_type = 'vip' 
    -- Removed invalid column check: AND ep.deleted_at IS NULL
  ORDER BY ep.created_at DESC;
END;
$$;


-- ========= Source Migration: 20260103_fix_council_stats_query.sql =========
-- Fix Council Stats Query to use correct column names
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats_v3(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  -- Trigger background cleanup
  PERFORM public.cleanup_old_scans();

  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  -- 2. Get Total Registrations (Pending + Approved)
  SELECT COUNT(*) INTO v_total_regs FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL;

  -- 3. Get Batch Stats
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other') ORDER BY count DESC
  ) t;

  -- 4. Get Event Stats
  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT COALESCE(e.title, r.event_title, 'General/Other') as event_name, r.participant_type, COUNT(*) as batch_count
      FROM public.registrations r LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved') AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT event_name, SUM(batch_count) as count, json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped GROUP BY event_name ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats
  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    )
  ) INTO v_scan_stats;

  -- 6. Get Recent Scans
  -- Corrected: Uses scanned_by_username instead of guard_name
  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT 
      ps.id, 
      ps.participant_name, 
      ps.pass_type, 
      ps.scan_result, 
      ps.scanned_at, 
      ps.scanned_by_username as guard_name -- Alias for frontend compatibility
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb)
  );
END; $func$;


-- ========= Source Migration: 20260103_fix_offline_scan_data.sql =========
-- Fix Data Integrity for Offline Scans
-- 1. Add missing pass_token column to pass_scans
-- This is required for offline syncs to succeed
ALTER TABLE public.pass_scans 
ADD COLUMN IF NOT EXISTS pass_token TEXT;

-- 2. Create Trigger to automatically link pass_id on insert
-- This ensures future offline syncs (which only send token) get correctly linked to their UUID
CREATE OR REPLACE FUNCTION public.link_scan_to_pass()
RETURNS TRIGGER AS $$
BEGIN
  -- If pass_id is missing but we have a token, look it up
  IF NEW.pass_id IS NULL AND NEW.pass_token IS NOT NULL THEN
    SELECT id INTO NEW.pass_id
    FROM public.entry_passes
    WHERE pass_token = NEW.pass_token;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS link_scan_pass_trigger ON public.pass_scans;

CREATE TRIGGER link_scan_pass_trigger
BEFORE INSERT ON public.pass_scans
FOR EACH ROW
EXECUTE FUNCTION public.link_scan_to_pass();

-- 3. Trigger to automatically mark pass as used when a valid scan is inserted
-- (Re-applying from previous fix for completeness)
CREATE OR REPLACE FUNCTION public.handle_pass_scan_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scan_result = 'valid' AND NEW.pass_id IS NOT NULL THEN
    UPDATE public.entry_passes
    SET 
      is_used = true,
      used_at = COALESCE(NEW.scanned_at, NOW())
    WHERE id = NEW.pass_id
      AND is_used = false; 
  END IF;
  return NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_scan_recorded ON public.pass_scans;

CREATE TRIGGER on_scan_recorded
AFTER INSERT ON public.pass_scans
FOR EACH ROW
EXECUTE FUNCTION public.handle_pass_scan_sync();


-- ========= Source Migration: 20260103_fix_recent_scans_query.sql =========
-- Fix Recent Scans Query to show global recent history, not just today's
-- Corrected: Uses scanned_by_username instead of guard_name
CREATE OR REPLACE FUNCTION public.get_security_dashboard_stats(p_username TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_today_count INTEGER;
  v_recent_scans JSON;
  v_today_ist DATE;
BEGIN
  -- Trigger background cleanup
  PERFORM public.cleanup_old_scans();

  IF NOT EXISTS (SELECT 1 FROM public.security_users WHERE username = p_username AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive security user';
  END IF;
  
  v_today_ist := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;
  
  -- Today's Count (Strictly Today)
  SELECT COUNT(*) INTO v_today_count FROM public.pass_scans ps
  JOIN public.entry_passes ep ON ps.pass_id = ep.id
  WHERE ps.scan_result = 'valid' AND ep.is_active = true
  AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist;
  
  -- Recent Scans (Global - Show last 10 valid scans regardless of date)
  -- Uses scanned_by_username as guard_name
  SELECT json_agg(json_build_object(
    'id', id, 
    'participant_name', participant_name, 
    'scanned_at', scanned_at, 
    'scan_result', scan_result, 
    'pass_type', pass_type,
    'guard_name', scanned_by_username 
  ))
  INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.scanned_at, ps.scan_result, ps.pass_type, ps.scanned_by_username
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) recent;
  
  RETURN json_build_object('today_count', v_today_count, 'recent_scans', COALESCE(v_recent_scans, '[]'::json));
END; $$;


-- ========= Source Migration: 20260103_fix_scan_filtering.sql =========
-- Update get_council_dashboard_stats and get_security_dashboard_stats to robustly filter deleted/inactive passes

-- 1. Update get_council_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  -- 2. Get Total Registrations (Pending + Approved)
  SELECT COUNT(*) INTO v_total_regs FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL;

  -- 3. Get Batch Stats
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other') ORDER BY count DESC
  ) t;

  -- 4. Get Event Stats
  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT COALESCE(e.title, r.event_title, 'General/Other') as event_name, r.participant_type, COUNT(*) as batch_count
      FROM public.registrations r LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved') AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT event_name, SUM(batch_count) as count, json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped GROUP BY event_name ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats (Robustly Filtered)
  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id -- JOIN filters out orphans
      LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
      LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (
        (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
        OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
        OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
      )
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
      LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
      AND (
        (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
        OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
        OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
      )
    )
  ) INTO v_scan_stats;

  -- 6. Get Recent Scans (Robustly Filtered)
  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.pass_type, ps.scan_result, ps.scanned_at
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id -- JOIN filters out orphans
    LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
    LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    AND (
      (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
      OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
      OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
    )
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb)
  );
END; $func$;

-- 2. Update get_security_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_security_dashboard_stats(p_username TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_today_count INTEGER;
  v_recent_scans JSON;
  v_today_ist DATE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.security_users WHERE username = p_username AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive security user';
  END IF;
  
  v_today_ist := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;
  
  SELECT COUNT(*) INTO v_today_count FROM public.pass_scans ps
  JOIN public.entry_passes ep ON ps.pass_id = ep.id -- JOIN filters out orphans
  LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
  LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
  WHERE ps.scan_result = 'valid' AND ep.is_active = true
  AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist
  AND (
    (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
    OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
    OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
  );
  
  SELECT json_agg(json_build_object('id', id, 'participant_name', participant_name, 'scanned_at', scanned_at, 'scan_result', scan_result, 'pass_type', pass_type))
  INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.scanned_at, ps.scan_result, ps.pass_type
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id -- JOIN filters out orphans
    LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
    LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist
    AND (
      (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
      OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
      OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
    )
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) recent;
  
  RETURN json_build_object('today_count', v_today_count, 'recent_scans', COALESCE(v_recent_scans, '[]'::json));
END; $$;

-- 3. Update create_vip_pass for Council support
CREATE OR REPLACE FUNCTION public.create_vip_pass(
  p_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_council_password TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_pass_id UUID;
  v_pass_token TEXT;
  v_settings RECORD;
BEGIN
  -- Check Admin Authorization
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Check Council Authorization fallback
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to create VIP passes'; END IF;
  
  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_by)
  VALUES (v_pass_token, 'vip', p_name, p_notes, auth.uid()) RETURNING id INTO v_pass_id;
  
  RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END; $$;

-- 4. Update delete_entry_pass for Council support
CREATE OR REPLACE FUNCTION public.delete_entry_pass(
  p_pass_id UUID,
  p_council_password TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_settings RECORD;
BEGIN
  -- Check Admin Authorization
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Check Council Authorization fallback
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to delete passes'; END IF;

  DELETE FROM public.entry_passes WHERE id = p_pass_id;
  RETURN json_build_object('success', true, 'message', 'Pass deleted successfully');
END; $$;

-- 5. New function to get VIP passes for Council (bypassing RLS)
CREATE OR REPLACE FUNCTION public.get_council_vip_passes(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_settings RECORD;
  v_passes JSON;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL OR v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password';
  END IF;

  SELECT json_agg(t) INTO v_passes FROM (
    SELECT id, pass_token, pass_type, participant_name, notes, is_used, is_active, created_at
    FROM public.entry_passes WHERE pass_type = 'vip'
    ORDER BY created_at DESC
  ) t;

  RETURN COALESCE(v_passes, '[]'::json);
END; $$;

GRANT EXECUTE ON FUNCTION public.get_council_vip_passes(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_vip_pass(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_entry_pass(UUID, TEXT) TO anon, authenticated;


-- ========= Source Migration: 20260103_fix_sync_usage.sql =========
-- Trigger to automatically mark pass as used when a valid scan is inserted
-- This fixes the issue where Offline Scans synced to the server didn't update the pass status

CREATE OR REPLACE FUNCTION public.handle_pass_scan_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act if the scan result is 'valid'
  IF NEW.scan_result = 'valid' THEN
    
    -- Update entry_passes
    UPDATE public.entry_passes
    SET 
      is_used = true,
      used_at = COALESCE(NEW.scanned_at, NOW())
    WHERE pass_token = NEW.pass_token
      AND is_used = false; -- Performance optimization: don't update if already used
      
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger to ensure it's up to date
DROP TRIGGER IF EXISTS on_scan_recorded ON public.pass_scans;

CREATE TRIGGER on_scan_recorded
AFTER INSERT ON public.pass_scans
FOR EACH ROW
EXECUTE FUNCTION public.handle_pass_scan_sync();


-- ========= Source Migration: 20260103_fix_used_at_column.sql =========
-- Fix Scan Sync logic (Missing column and RPC repair)

-- 1. Add used_at column to entry_passes
ALTER TABLE public.entry_passes 
ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

-- 2. Repair process_pass_scan_v3 (Ensure it works with used_at)
CREATE OR REPLACE FUNCTION public.process_pass_scan_v3(
  p_pass_token TEXT,
  p_guard_name TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_pass RECORD;
  v_result TEXT;
  v_participant_name TEXT;
  v_pass_type public.pass_type;
BEGIN
  -- 1. Find the pass
  SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token;
  
  IF v_pass IS NULL THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, guard_name)
    VALUES (NULL, 'system', 'invalid', p_guard_name);
    RETURN json_build_object('success', false, 'message', 'Invalid Pass Token');
  END IF;

  v_participant_name := v_pass.participant_name;
  v_pass_type := v_pass.pass_type;

  -- 2. Check if active
  IF NOT v_pass.is_active THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name)
    VALUES (v_pass.id, 'system', 'inactive', v_participant_name, v_pass_type, p_guard_name);
    RETURN json_build_object('success', false, 'message', 'Pass is Inactive');
  END IF;

  -- 3. Check if already used logic (multi-day compatible)
  -- If we want to allow re-entry on same day, we'd check pass_scans here.
  -- For now, consistent with offline: mark as used globally.
  IF v_pass.is_used THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name)
    VALUES (v_pass.id, 'system', 'already_used', v_participant_name, v_pass_type, p_guard_name);
    RETURN json_build_object('success', false, 'message', 'Pass Already Scanned');
  END IF;

  -- 4. Mark as used
  UPDATE public.entry_passes 
  SET is_used = true, used_at = NOW() 
  WHERE id = v_pass.id;

  -- 5. Record valid scan
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name)
  VALUES (v_pass.id, 'system', 'valid', v_participant_name, v_pass_type, p_guard_name);

  RETURN json_build_object(
    'success', true, 
    'message', 'Valid Entry', 
    'participant_name', v_participant_name,
    'pass_type', v_pass_type
  );
END; $$;

-- 3. Repair sync trigger
CREATE OR REPLACE FUNCTION public.handle_pass_scan_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scan_result = 'valid' THEN
    UPDATE public.entry_passes 
    SET 
      is_used = true,
      used_at = COALESCE(NEW.scanned_at, NOW())
    WHERE id = NEW.pass_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ========= Source Migration: 20260103_guard_audit_logs.sql =========
-- Add guard_name to pass_scans for accountability
ALTER TABLE public.pass_scans 
ADD COLUMN IF NOT EXISTS guard_name TEXT;

-- Update the main security RPC to handle guard_name
CREATE OR REPLACE FUNCTION public.process_pass_scan_v3(
  p_pass_token TEXT,
  p_guard_name TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_pass RECORD;
  v_result TEXT;
  v_participant_name TEXT;
  v_pass_type public.pass_type;
  v_settings RECORD;
BEGIN
  -- 1. Find the pass
  SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token;
  
  IF v_pass IS NULL THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, guard_name)
    VALUES (NULL, 'system', 'invalid', p_guard_name);
    RETURN json_build_object('success', false, 'message', 'Invalid Pass Token');
  END IF;

  v_participant_name := v_pass.participant_name;
  v_pass_type := v_pass.pass_type;

  -- 2. Check if active
  IF NOT v_pass.is_active THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name)
    VALUES (v_pass.id, 'system', 'inactive', v_participant_name, v_pass_type, p_guard_name);
    RETURN json_build_object('success', false, 'message', 'Pass is Inactive');
  END IF;

  -- 3. Check if already used (unless it's a multi-use type if we ever add one)
  IF v_pass.is_used THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name)
    VALUES (v_pass.id, 'system', 'already_used', v_participant_name, v_pass_type, p_guard_name);
    RETURN json_build_object('success', false, 'message', 'Pass Already Scanned');
  END IF;

  -- 4. Multi-day/Multi-use logic (if any)
  -- For now, all are single use. Mark as used.
  UPDATE public.entry_passes SET is_used = true, used_at = NOW() WHERE id = v_pass.id;

  -- 5. Record valid scan
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name)
  VALUES (v_pass.id, 'system', 'valid', v_participant_name, v_pass_type, p_guard_name);

  RETURN json_build_object(
    'success', true, 
    'message', 'Valid Entry', 
    'participant_name', v_participant_name,
    'pass_type', v_pass_type
  );
END; $$;


-- ========= Source Migration: 20260103_storage_policies.sql =========
-- Storage setup for Pass Templates and Public Content

-- 1. Create the 'public-content' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-content', 'public-content', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts

-- 3. Create Policy: Public Read Access
-- Allow anyone to read files from 'public-content' bucket
DROP POLICY IF EXISTS "Public Content Images are publicly accessible" ON storage.objects;
CREATE POLICY "Public Content Images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'public-content' );

-- 4. Create Policy: Authenticated Upload Access
-- Allow any authenticated user (Admins/Security) to upload files
-- Limiting to specific folders like 'templates' or 'gallery' is possible, but general access is fine for this app context.
DROP POLICY IF EXISTS "Authenticated users can upload public content" ON storage.objects;
CREATE POLICY "Authenticated users can upload public content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'public-content' );

-- 5. Create Policy: Update/Delete for Admins (Optional but good for cleanup)
DROP POLICY IF EXISTS "Admins can update public content" ON storage.objects;
CREATE POLICY "Admins can update public content"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'public-content' );

DROP POLICY IF EXISTS "Admins can delete public content" ON storage.objects;
CREATE POLICY "Admins can delete public content"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'public-content' );


-- ========= Source Migration: 20260103_v2_vip_functions.sql =========
-- FRESH VIP FUNCTIONS (V2)
-- Using new names to definitively bypass PostgREST schema cache issues.

-- 1. Create VIP pass v2
CREATE OR REPLACE FUNCTION public.create_vip_pass_v2(
  p_council_password TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_pass_id UUID;
  v_pass_token TEXT;
  v_settings RECORD;
BEGIN
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to create VIP passes'; END IF;
  
  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_by)
  VALUES (v_pass_token, 'vip', p_name, p_notes, auth.uid()) RETURNING id INTO v_pass_id;
  
  RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END; $$;

-- 2. Delete entry pass v2
CREATE OR REPLACE FUNCTION public.delete_entry_pass_v2(
  p_council_password TEXT DEFAULT NULL,
  p_pass_id UUID DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_settings RECORD;
BEGIN
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to delete passes'; END IF;
  IF p_pass_id IS NULL THEN RAISE EXCEPTION 'Pass ID is required'; END IF;

  DELETE FROM public.entry_passes WHERE id = p_pass_id;
  RETURN json_build_object('success', true, 'message', 'Pass deleted successfully');
END; $$;

-- 3. Get VIP passes v2
CREATE OR REPLACE FUNCTION public.get_council_vip_passes_v2(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_settings RECORD;
  v_passes JSON;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL OR v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password';
  END IF;

  SELECT json_agg(t) INTO v_passes FROM (
    SELECT id, pass_token, pass_type, participant_name, notes, is_used, is_active, created_at
    FROM public.entry_passes WHERE pass_type = 'vip'
    ORDER BY created_at DESC
  ) t;

  RETURN COALESCE(v_passes, '[]'::json);
END; $$;

-- 4. Get Council Dashboard Stats v2
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats_v2(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL OR v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password';
  END IF;

  -- 2. Get Total Registrations
  SELECT COUNT(*) INTO v_total_regs FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL;

  -- 3. Get Batch Stats
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other') ORDER BY count DESC
  ) t;

  -- 4. Get Event Stats
  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT COALESCE(e.title, r.event_title, 'General/Other') as event_name, r.participant_type, COUNT(*) as batch_count
      FROM public.registrations r LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved') AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT event_name, SUM(batch_count) as count, json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped GROUP BY event_name ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats
  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
      LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (
        (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
        OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
        OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
      )
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
      LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
      AND (
        (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
        OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
        OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
      )
    )
  ) INTO v_scan_stats;

  -- 6. Get Recent Scans
  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.pass_type, ps.scan_result, ps.scanned_at
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
    LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    AND (
      (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
      OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
      OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
    )
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb)
  );
END; $$;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.create_vip_pass_v2(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_entry_pass_v2(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_council_vip_passes_v2(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_council_dashboard_stats_v2(TEXT) TO anon, authenticated;


-- ========= Source Migration: 20260103_v3_robust_rpc.sql =========
-- ROBUST VIP FUNCTIONS (V3)
-- Adding 'SET search_path = public, extensions' to ensure extensions like pgcrypto are found.
-- Adding more descriptive error messages for debugging login issues.

-- 1. Create VIP pass v3
CREATE OR REPLACE FUNCTION public.create_vip_pass_v3(
  p_council_password TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_pass_id UUID;
  v_pass_token TEXT;
  v_settings RECORD;
BEGIN
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings IS NULL THEN RAISE EXCEPTION 'Security settings [id=1] not found'; END IF;
     IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured in settings'; END IF;
     
     IF v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to create VIP passes'; END IF;
  
  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_by)
  VALUES (v_pass_token, 'vip', p_name, p_notes, auth.uid()) RETURNING id INTO v_pass_id;
  
  RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END; $$;

-- 2. Delete entry pass v3
CREATE OR REPLACE FUNCTION public.delete_entry_pass_v3(
  p_council_password TEXT DEFAULT NULL,
  p_pass_id UUID DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_settings RECORD;
BEGIN
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings IS NULL THEN RAISE EXCEPTION 'Security settings [id=1] not found'; END IF;
     IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured in settings'; END IF;

     IF v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to delete passes'; END IF;
  IF p_pass_id IS NULL THEN RAISE EXCEPTION 'Pass ID is required'; END IF;

  DELETE FROM public.entry_passes WHERE id = p_pass_id;
  RETURN json_build_object('success', true, 'message', 'Pass deleted successfully');
END; $$;

-- 3. Get VIP passes v3
CREATE OR REPLACE FUNCTION public.get_council_vip_passes_v3(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_settings RECORD;
  v_passes JSON;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings IS NULL THEN RAISE EXCEPTION 'Security settings [id=1] not found'; END IF;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured in settings'; END IF;

  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password (v3)';
  END IF;

  SELECT json_agg(t) INTO v_passes FROM (
    SELECT id, pass_token, pass_type, participant_name, notes, is_used, is_active, created_at
    FROM public.entry_passes WHERE pass_type = 'vip'
    ORDER BY created_at DESC
  ) t;

  RETURN COALESCE(v_passes, '[]'::json);
END; $$;

-- 4. Get Council Dashboard Stats v3
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats_v3(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings IS NULL THEN RAISE EXCEPTION 'Security settings [id=1] not found'; END IF;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured in settings'; END IF;

  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password (v3)';
  END IF;

  -- 2. Get Total Registrations
  SELECT COUNT(*) INTO v_total_regs FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL;

  -- 3. Get Batch Stats
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other') ORDER BY count DESC
  ) t;

  -- 4. Get Event Stats
  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT COALESCE(e.title, r.event_title, 'General/Other') as event_name, r.participant_type, COUNT(*) as batch_count
      FROM public.registrations r LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved') AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT event_name, SUM(batch_count) as count, json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped GROUP BY event_name ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats
  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
      LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (
        (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
        OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
        OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
      )
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
      LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
      AND (
        (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
        OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
        OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
      )
    )
  ) INTO v_scan_stats;

  -- 6. Get Recent Scans
  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.pass_type, ps.scan_result, ps.scanned_at
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
    LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    AND (
      (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
      OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
      OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
    )
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb)
  );
END; $$;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.create_vip_pass_v3(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_entry_pass_v3(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_council_vip_passes_v3(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_council_dashboard_stats_v3(TEXT) TO anon, authenticated;


-- ========= Source Migration: 20260104_add_pass_validity_date.sql =========
-- 1. Add valid_date column to entry_passes
ALTER TABLE public.entry_passes 
ADD COLUMN IF NOT EXISTS valid_date DATE DEFAULT NULL;

-- 2. Create function to update pass date (for Admin/editing)
DROP FUNCTION IF EXISTS public.update_pass_date(UUID, DATE);

CREATE OR REPLACE FUNCTION public.update_pass_date(
  p_pass_id UUID,
  p_new_date DATE
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Check authorization (Admin only for simplicity in this context, or add Council check if needed)
  -- For now, we assume the caller application handles the UI-level permission check, 
  -- but we enforce that the user must be authenticated.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.entry_passes
  SET valid_date = p_new_date
  WHERE id = p_pass_id;

  RETURN json_build_object('success', true, 'message', 'Pass date updated');
END; $$;

-- 3. Update create_vip_pass_v3 to accept valid_date
DROP FUNCTION IF EXISTS public.create_vip_pass_v3(TEXT, TEXT, TEXT); -- Drop old signature
DROP FUNCTION IF EXISTS public.create_vip_pass_v3(TEXT, TEXT, TEXT, DATE); -- Drop new signature if partly created

CREATE OR REPLACE FUNCTION public.create_vip_pass_v3(
  p_council_password TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_valid_date DATE DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_pass_id UUID;
  v_pass_token TEXT;
  v_settings RECORD;
BEGIN
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings IS NULL THEN RAISE EXCEPTION 'Security settings [id=1] not found'; END IF;
     IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured in settings'; END IF;
     
     IF v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to create VIP passes'; END IF;
  
  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  
  INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_by, valid_date)
  VALUES (v_pass_token, 'vip', p_name, p_notes, auth.uid(), p_valid_date) 
  RETURNING id INTO v_pass_id;
  
  RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END; $$;

-- 4. Update get_council_vip_passes_v3 to return valid_date
DROP FUNCTION IF EXISTS public.get_council_vip_passes_v3(TEXT);

CREATE OR REPLACE FUNCTION public.get_council_vip_passes_v3(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_settings RECORD;
  v_passes JSON;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings IS NULL THEN RAISE EXCEPTION 'Security settings [id=1] not found'; END IF;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured in settings'; END IF;

  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password (v3)';
  END IF;

  SELECT json_agg(t) INTO v_passes FROM (
    SELECT id, pass_token, pass_type, participant_name, notes, is_used, is_active, created_at, valid_date
    FROM public.entry_passes WHERE pass_type = 'vip'
    ORDER BY created_at DESC
  ) t;

  RETURN COALESCE(v_passes, '[]'::json);
END; $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_pass_date(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_vip_pass_v3(TEXT, TEXT, TEXT, DATE) TO anon, authenticated;


-- ========= Source Migration: 20260104_council_master_fix.sql =========
-- MASTER FIX V3: Council Dashboard & VIP Passes Logic (Hard Delete + Validity)
-- 1. Restores event_dates to stats
-- 2. Ensures VIP pass list includes usage_logs AND valid_date
-- 3. Ensures create_vip_pass accepts valid_date
-- 4. Ensures delete_entry_pass PERMANENTLY deletes pass and scans (Hard Delete)

-- PART 1: FIX STATS (Returns event_dates)
CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats_v3(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  PERFORM public.cleanup_old_scans();

  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  SELECT COUNT(*) INTO v_total_regs FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL;

  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other') ORDER BY count DESC
  ) t;

  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT COALESCE(e.title, r.event_title, 'General/Other') as event_name, r.participant_type, COUNT(*) as batch_count
      FROM public.registrations r LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved') AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT event_name, SUM(batch_count) as count, json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped GROUP BY event_name ORDER BY count DESC
  ) t;

  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    )
  ) INTO v_scan_stats;

  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT 
      ps.id, 
      ps.participant_name, 
      ps.pass_type, 
      ps.scan_result, 
      ps.scanned_at, 
      ps.scanned_by_username as guard_name
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb),
    'event_dates', COALESCE(v_settings.event_dates, '[]'::jsonb)
  );
END; $func$;

-- PART 2: FIX VIP PASSES FETCH (Added valid_date)
DROP FUNCTION IF EXISTS public.get_council_vip_passes_v3(text);

CREATE OR REPLACE FUNCTION public.get_council_vip_passes_v3(p_password TEXT)
RETURNS TABLE (
  pass_id UUID,
  participant_name TEXT,
  pass_type public.pass_type,
  created_at TIMESTAMPTZ,
  notes TEXT,
  pass_token TEXT,
  is_used BOOLEAN,
  is_active BOOLEAN,
  usage_logs JSONB,
  valid_date DATE
) LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE 
  v_settings RECORD;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE security_settings.id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  RETURN QUERY
  SELECT 
    ep.id AS pass_id,
    ep.participant_name,
    ep.pass_type,
    ep.created_at,
    ep.notes,
    ep.pass_token,
    ep.is_used,
    ep.is_active,
    COALESCE(
      (
        SELECT jsonb_agg(ps.scanned_at ORDER BY ps.scanned_at ASC)
        FROM public.pass_scans ps
        WHERE ps.pass_id = ep.id AND ps.scan_result = 'valid'
      ),
      '[]'::jsonb
    ) AS usage_logs,
    ep.valid_date
  FROM public.entry_passes ep
  WHERE ep.pass_type = 'vip'
  ORDER BY ep.created_at DESC;
END;
$$;

-- PART 3: FIX VIP PASS CREATE (Create logic)
CREATE OR REPLACE FUNCTION public.create_vip_pass_v3(
  p_council_password TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_valid_date DATE DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_pass_id UUID;
  v_pass_token TEXT;
  v_settings RECORD;
BEGIN
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to create VIP passes'; END IF;
  
  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_by, valid_date)
  VALUES (v_pass_token, 'vip', p_name, p_notes, auth.uid(), p_valid_date) RETURNING id INTO v_pass_id;
  
  RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END; $$;

-- PART 4: HARD DELETE VIP PASS (Removes pass and its scans)
CREATE OR REPLACE FUNCTION public.delete_entry_pass_v3(
  p_council_password TEXT DEFAULT NULL,
  p_pass_id UUID DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_settings RECORD;
BEGIN
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings IS NULL THEN RAISE EXCEPTION 'Security settings [id=1] not found'; END IF;
     IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured in settings'; END IF;

     IF v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to delete passes'; END IF;
  IF p_pass_id IS NULL THEN RAISE EXCEPTION 'Pass ID is required'; END IF;

  -- 1. Delete associated scans first (Cleanup junk)
  DELETE FROM public.pass_scans WHERE pass_id = p_pass_id;

  -- 2. Hard Delete the pass
  DELETE FROM public.entry_passes WHERE id = p_pass_id;
  
  RETURN json_build_object('success', true, 'message', 'Pass and associated scans deleted permanently');
END; $$;


-- ========= Source Migration: 20260104_fix_multiday_vip_scans.sql =========
/* 
  FIX MULTI-DAY VIP SCANS
  This migration updates the scan processing logic to allow VIP passes to be used on multiple days
  while still preventing "double scanning" (multiple entries on the same day).
*/

CREATE OR REPLACE FUNCTION public.process_pass_scan_v3(
  p_pass_token TEXT,
  p_guard_name TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_pass RECORD;
  v_participant_name TEXT;
  v_pass_type public.pass_type;
  v_already_scanned_today BOOLEAN := false;
BEGIN
  -- 1. Find the pass
  SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token;
  
  -- 2. Handle Invalid Token
  IF v_pass IS NULL THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, guard_name, pass_token)
    VALUES (NULL, 'system', 'invalid', p_guard_name, p_pass_token);
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Invalid Pass Token',
      'participant_name', 'Unknown',
      'pass_type', NULL
    );
  END IF;

  v_participant_name := v_pass.participant_name;
  v_pass_type := v_pass.pass_type;

  -- 3. Check if active
  IF NOT v_pass.is_active THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name, pass_token)
    VALUES (v_pass.id, 'system', 'inactive', v_participant_name, v_pass_type, p_guard_name, p_pass_token);
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Pass is Inactive',
      'participant_name', v_participant_name,
      'pass_type', v_pass_type
    );
  END IF;

  -- 4. Multi-Day / Same-Day Logic
  -- Check if this pass was already scanned TODAY (IST)
  SELECT EXISTS (
    SELECT 1 FROM public.pass_scans 
    WHERE pass_id = v_pass.id 
    AND scan_result = 'valid' 
    AND (scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
  ) INTO v_already_scanned_today;

  -- Block if already scanned TODAY (prevents passing the same QR back for immediate reuse)
  IF v_already_scanned_today THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name, pass_token)
    VALUES (v_pass.id, 'system', 'already_used', v_participant_name, v_pass_type, p_guard_name, p_pass_token);
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Already Scanned Today',
      'participant_name', v_participant_name,
      'pass_type', v_pass_type
    );
  END IF;

  -- 5. Standard Pass Check (non-VIP)
  -- If not a VIP and already used on a previous day, block it.
  IF v_pass.is_used AND v_pass_type != 'vip' THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name, pass_token)
    VALUES (v_pass.id, 'system', 'already_used', v_participant_name, v_pass_type, p_guard_name, p_pass_token);
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Single-Entry Pass Already Used',
      'participant_name', v_participant_name,
      'pass_type', v_pass_type
    );
  END IF;

  -- 6. Record Valid Scan
  -- The trigger 'tr_sync_pass_usage' will update entry_passes.is_used = true and used_at
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name, pass_token)
  VALUES (v_pass.id, 'system', 'valid', v_participant_name, v_pass_type, p_guard_name, p_pass_token);

  RETURN json_build_object(
    'success', true, 
    'message', 'Valid Entry', 
    'participant_name', v_participant_name,
    'pass_type', v_pass_type
  );
END; $$;


-- ========= Source Migration: 20260104_restore_event_dates_in_stats.sql =========
-- Restore event_dates to get_council_dashboard_stats_v3
-- This fixes the issue where VIP passed show as "Valid" instead of "Checked In" because the frontend couldn't determine the current event day.

CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats_v3(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  -- Trigger background cleanup
  PERFORM public.cleanup_old_scans();

  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  -- 2. Get Total Registrations (Pending + Approved)
  SELECT COUNT(*) INTO v_total_regs FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL;

  -- 3. Get Batch Stats
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other') ORDER BY count DESC
  ) t;

  -- 4. Get Event Stats
  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT COALESCE(e.title, r.event_title, 'General/Other') as event_name, r.participant_type, COUNT(*) as batch_count
      FROM public.registrations r LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved') AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT event_name, SUM(batch_count) as count, json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped GROUP BY event_name ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats
  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    )
  ) INTO v_scan_stats;

  -- 6. Get Recent Scans
  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT 
      ps.id, 
      ps.participant_name, 
      ps.pass_type, 
      ps.scan_result, 
      ps.scanned_at, 
      ps.scanned_by_username as guard_name
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb),
    'event_dates', COALESCE(v_settings.event_dates, '[]'::jsonb) -- RESTORED
  );
END; $func$;


-- ========= Source Migration: 20260106_hide_council_passes.sql =========
-- Migration: Hide VIP Passes from Council
-- 1. Add is_hidden_from_council column to entry_passes
ALTER TABLE public.entry_passes 
ADD COLUMN IF NOT EXISTS is_hidden_from_council BOOLEAN DEFAULT FALSE;

-- 2. Update get_council_vip_passes_v3 to filter hidden passes
DROP FUNCTION IF EXISTS public.get_council_vip_passes_v3(text);

CREATE OR REPLACE FUNCTION public.get_council_vip_passes_v3(p_password TEXT)
RETURNS TABLE (
  pass_id UUID,
  participant_name TEXT,
  pass_type public.pass_type,
  created_at TIMESTAMPTZ,
  notes TEXT,
  pass_token TEXT,
  is_used BOOLEAN,
  is_active BOOLEAN,
  usage_logs JSONB
) LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE 
  v_settings RECORD;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE security_settings.id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  RETURN QUERY
  SELECT 
    ep.id AS pass_id,
    ep.participant_name,
    ep.pass_type,
    ep.created_at,
    ep.notes,
    ep.pass_token,
    ep.is_used,
    ep.is_active,
    COALESCE(
      (
        SELECT jsonb_agg(ps.scanned_at ORDER BY ps.scanned_at ASC)
        FROM public.pass_scans ps
        WHERE ps.pass_id = ep.id AND ps.scan_result = 'valid'
      ),
      '[]'::jsonb
    ) AS usage_logs
  FROM public.entry_passes ep
  WHERE ep.pass_type = 'vip' 
    AND (ep.is_hidden_from_council IS FALSE OR ep.is_hidden_from_council IS NULL)
  ORDER BY ep.created_at DESC;
END;
$$;

-- 3. RPC to Toggle Visibility (Admin Only)
CREATE OR REPLACE FUNCTION public.toggle_pass_council_visibility(
  p_pass_id UUID,
  p_hidden BOOLEAN
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
BEGIN
  -- Admin Authorization Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  IF NOT v_is_authorized THEN 
     RAISE EXCEPTION 'Not authorized'; 
  END IF;

  UPDATE public.entry_passes
  SET is_hidden_from_council = p_hidden
  WHERE id = p_pass_id;

  RETURN json_build_object('success', true, 'message', 'Visibility updated');
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_pass_council_visibility(UUID, BOOLEAN) TO authenticated;


-- ========= Source Migration: 20260106_hide_scans_of_hidden_passes.sql =========
-- Migration: Hide Scans of Hidden VIP Passes from Dashboards

-- 1. Update Council Dashboard Stats (get_council_dashboard_stats_v3)
DROP FUNCTION IF EXISTS public.get_council_dashboard_stats_v3(text);

CREATE OR REPLACE FUNCTION public.get_council_dashboard_stats_v3(p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $func$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  PERFORM public.cleanup_old_scans();

  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  SELECT COUNT(*) INTO v_total_regs FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL;

  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other') ORDER BY count DESC
  ) t;

  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT COALESCE(e.title, r.event_title, 'General/Other') as event_name, r.participant_type, COUNT(*) as batch_count
      FROM public.registrations r LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved') AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT event_name, SUM(batch_count) as count, json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped GROUP BY event_name ORDER BY count DESC
  ) t;

  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    )
  ) INTO v_scan_stats;

  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT 
      ps.id, 
      ps.participant_name, 
      ps.pass_type, 
      ps.scan_result, 
      ps.scanned_at, 
      ps.scanned_by_username as guard_name
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    -- Hide scans if pass is hidden from council
    AND (ep.is_hidden_from_council IS FALSE OR ep.is_hidden_from_council IS NULL)
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb),
    'event_dates', COALESCE(v_settings.event_dates, '[]'::jsonb)
  );
END; $func$;


-- 2. Update Security Dashboard Stats (get_security_dashboard_stats)
DROP FUNCTION IF EXISTS public.get_security_dashboard_stats(text);

CREATE OR REPLACE FUNCTION public.get_security_dashboard_stats(p_username TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  v_today_count INTEGER;
  v_recent_scans JSON;
  v_today_ist DATE;
BEGIN
  -- Trigger background cleanup
  PERFORM public.cleanup_old_scans();

  IF NOT EXISTS (SELECT 1 FROM public.security_users WHERE username = p_username AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive security user';
  END IF;
  
  v_today_ist := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;
  
  -- Today's Count (Strictly Today)
  SELECT COUNT(*) INTO v_today_count FROM public.pass_scans ps
  JOIN public.entry_passes ep ON ps.pass_id = ep.id
  WHERE ps.scan_result = 'valid' AND ep.is_active = true
  AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist;
  
  -- Recent Scans (Global - Show last 10 valid scans regardless of date)
  -- Uses scanned_by_username as guard_name
  SELECT json_agg(json_build_object(
    'id', id, 
    'participant_name', participant_name, 
    'scanned_at', scanned_at, 
    'scan_result', scan_result, 
    'pass_type', pass_type,
    'guard_name', scanned_by_username 
  ))
  INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.scanned_at, ps.scan_result, ps.pass_type, ps.scanned_by_username
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    -- Hide scans if pass is hidden from council
    AND (ep.is_hidden_from_council IS FALSE OR ep.is_hidden_from_council IS NULL)
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) recent;
  
  RETURN json_build_object('today_count', v_today_count, 'recent_scans', COALESCE(v_recent_scans, '[]'::json));
END; $$;


-- ========= Source Migration: 20260213_add_face_indexing_status.sql =========
-- Add faces_indexed column to gallery_images to track scanning status
ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS faces_indexed BOOLEAN DEFAULT FALSE;

-- Update search_gallery_faces to be more robust (optional refinement)
-- (Already created in previous turn, just ensuring persistence)


-- ========= Source Migration: 20260213_add_unique_gallery_src.sql =========
-- Add unique constraint to gallery_images.src to allow upserts
-- and prevent duplicate images (especially for Google Drive integration)

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'gallery_images_src_key'
    ) THEN
        ALTER TABLE gallery_images ADD CONSTRAINT gallery_images_src_key UNIQUE (src);
    END IF;
END $$;


-- ========= Source Migration: 20260213_face_recognition_setup.sql =========
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store detected faces and their embeddings
CREATE TABLE IF NOT EXISTS gallery_faces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id BIGINT REFERENCES gallery_images(id) ON DELETE CASCADE,
    embedding vector(128) NOT NULL, -- 128-dimensional descriptor from face-api.js
    bounds JSONB NOT NULL, -- { x, y, width, height }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search function for finding similar faces
-- We use dot product similarity for speed, but cosine is usually better for faces.
-- descriptors from face-api.js are normalized, so dot product = cosine similarity.
CREATE OR REPLACE FUNCTION search_gallery_faces(
    query_embedding vector(128),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    image_id BIGINT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        gf.image_id,
        1 - (gf.embedding <=> query_embedding) AS similarity
    FROM gallery_faces gf
    WHERE 1 - (gf.embedding <=> query_embedding) > match_threshold
    ORDER BY gf.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


-- ========= Source Migration: 20260213_gallery_subcategory.sql =========
-- Add subcategory column to gallery_images for finer classification
-- e.g. Category = "Culture Fest", Subcategory = "Award Ceremony"
ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT '' NOT NULL;


-- ========= Source Migration: 20260222_coordinator_update_status.sql =========
-- Function to allow event coordinators to update registration status
CREATE OR REPLACE FUNCTION update_coordinator_registration_status(
    p_reg_id TEXT,
    p_event_id BIGINT,
    p_token TEXT,
    p_new_status TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_is_valid BOOLEAN;
    v_actual_event_id BIGINT;
BEGIN
    -- 1. Validate the coordinator token
    SELECT EXISTS (
        SELECT 1 FROM event_coordinators
        WHERE event_id = p_event_id 
        AND token = p_token
    ) INTO v_is_valid;
    
    IF NOT v_is_valid THEN
        RAISE EXCEPTION 'Invalid coordinator token for this event';
    END IF;

    -- 2. Validate the registration belongs to the event
    SELECT event_id INTO v_actual_event_id 
    FROM registrations 
    WHERE id = p_reg_id;
    
    IF v_actual_event_id IS NULL THEN
        RAISE EXCEPTION 'Registration not found';
    END IF;
    
    IF v_actual_event_id != p_event_id THEN
        RAISE EXCEPTION 'Registration does not belong to this event';
    END IF;

    -- 3. Update the status
    IF p_new_status NOT IN ('approved', 'rejected', 'pending', 'Approved', 'Rejected', 'Pending') THEN
        RAISE EXCEPTION 'Invalid status value';
    END IF;

    UPDATE registrations 
    SET status = p_new_status
    WHERE id = p_reg_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

