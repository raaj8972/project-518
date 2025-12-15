-- Change schedule_events.time column from TIME to TEXT to support free-text ranges
ALTER TABLE schedule_events 
ALTER COLUMN time TYPE TEXT;
