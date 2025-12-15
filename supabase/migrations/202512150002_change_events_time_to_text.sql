-- Change events.time column from TIME to TEXT to support free-text ranges
ALTER TABLE events 
ALTER COLUMN time TYPE TEXT;
