-- Add cursor tracking columns to admin_presence table
ALTER TABLE admin_presence 
ADD COLUMN IF NOT EXISTS cursor_x FLOAT,
ADD COLUMN IF NOT EXISTS cursor_y FLOAT,
ADD COLUMN IF NOT EXISTS screen_w INTEGER,
ADD COLUMN IF NOT EXISTS screen_h INTEGER,
ADD COLUMN IF NOT EXISTS focused_element TEXT;

-- Increase the heartbeat timeout tolerance in the query (handled in frontend, but good to know)
-- No RLS changes needed as we already allow updates to own rows
