-- Add category column to announcements table
-- Categories: 'general' (default), 'sports', 'cultural', 'academic'
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';

-- Index for fast category filtering
CREATE INDEX IF NOT EXISTS idx_announcements_category ON announcements (category);
