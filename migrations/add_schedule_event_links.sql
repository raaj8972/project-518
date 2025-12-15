-- Add event_id and guest_artist_id foreign key columns to schedule_events
-- This allows linking schedule items to either regular events or guest artist performances

-- Add event_id column (links to events table)
ALTER TABLE schedule_events 
ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES events(id) ON DELETE SET NULL;

-- Add guest_artist_id column (links to guest_artists table)
ALTER TABLE schedule_events 
ADD COLUMN IF NOT EXISTS guest_artist_id INTEGER REFERENCES guest_artists(id) ON DELETE SET NULL;

-- Add check constraint to ensure mutual exclusivity (either event_id OR guest_artist_id, not both)
ALTER TABLE schedule_events
ADD CONSTRAINT IF NOT EXISTS schedule_events_link_check 
CHECK (
  (event_id IS NOT NULL AND guest_artist_id IS NULL) OR
  (event_id IS NULL AND guest_artist_id IS NOT NULL) OR
  (event_id IS NULL AND guest_artist_id IS NULL)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_schedule_events_event_id ON schedule_events(event_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_guest_artist_id ON schedule_events(guest_artist_id);
