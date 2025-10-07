-- Add nullable rules_link column to events so we can store PDF / Drive URLs
ALTER TABLE IF EXISTS events
  ADD COLUMN IF NOT EXISTS rules_link text;
