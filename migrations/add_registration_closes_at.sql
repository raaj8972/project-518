-- Add registration closing timer field to events table
-- This allows admins to set automatic registration closing deadlines

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS registration_closes_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN events.registration_closes_at IS 'Timestamp when registration automatically closes for this event';
