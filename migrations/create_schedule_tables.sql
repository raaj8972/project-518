-- Create schedule tables if they don't exist
-- This is a safety migration to ensure base schema exists

-- Create schedule_days table
CREATE TABLE IF NOT EXISTS schedule_days (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  day TEXT NOT NULL,
  title TEXT,
  schedule_type TEXT CHECK (schedule_type IN ('prelims', 'mains')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create schedule_events table
CREATE TABLE IF NOT EXISTS schedule_events (
  id SERIAL PRIMARY KEY,
  schedule_day_id INTEGER NOT NULL REFERENCES schedule_days(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  time TEXT,  -- Changed to TEXT to support free-form ranges like "9-10 PM"
  venue TEXT,
  type TEXT,
  duration TEXT,
  event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  guest_artist_id INTEGER REFERENCES guest_artists(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure mutual exclusivity between event_id and guest_artist_id
  CONSTRAINT schedule_events_link_check CHECK (
    (event_id IS NOT NULL AND guest_artist_id IS NULL) OR
    (event_id IS NULL AND guest_artist_id IS NOT NULL) OR
    (event_id IS NULL AND guest_artist_id IS NULL)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedule_days_date ON schedule_days(date);
CREATE INDEX IF NOT EXISTS idx_schedule_days_schedule_type ON schedule_days(schedule_type);
CREATE INDEX IF NOT EXISTS idx_schedule_events_schedule_day_id ON schedule_events(schedule_day_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_event_id ON schedule_events(event_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_guest_artist_id ON schedule_events(guest_artist_id);

-- Enable RLS (Row Level Security)
ALTER TABLE schedule_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY IF NOT EXISTS "Public can view schedule days"
  ON schedule_days FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Public can view schedule events"
  ON schedule_events FOR SELECT
  USING (true);

-- Admin write access policies (assuming admin_users table exists)
CREATE POLICY IF NOT EXISTS "Admins can manage schedule days"
  ON schedule_days FOR ALL
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE role IN ('super_admin', 'admin'))
  );

CREATE POLICY IF NOT EXISTS "Admins can manage schedule events"
  ON schedule_events FOR ALL
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE role IN ('super_admin', 'admin'))
  );
