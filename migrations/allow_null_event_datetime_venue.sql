-- Allow NULL values for event date, time, and venue
-- This enables "Yet to be announced" functionality without database errors

-- Make date, time, and venue columns nullable
ALTER TABLE events 
  ALTER COLUMN date DROP NOT NULL,
  ALTER COLUMN time DROP NOT NULL,
  ALTER COLUMN venue DROP NOT NULL;

-- Optional: Update existing placeholder values to NULL if any exist
-- UPDATE events SET date = NULL WHERE date = 'TBA' OR date = '';
-- UPDATE events SET time = NULL WHERE time = 'TBA' OR time = '';
-- UPDATE events SET venue = NULL WHERE venue = 'TBA' OR venue = '';
