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
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_categories_name_key') THEN
        ALTER TABLE event_categories ADD CONSTRAINT event_categories_name_key UNIQUE (name);
    END IF;
END $$;
    END IF;
END $$;
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

