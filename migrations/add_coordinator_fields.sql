-- Add coordinator_password and whatsapp_group_link to events table

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS coordinator_password TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_group_link TEXT;

-- Comment on columns
COMMENT ON COLUMN events.coordinator_password IS 'Password for event coordinator login';
COMMENT ON COLUMN events.whatsapp_group_link IS 'WhatsApp group link for this event';
