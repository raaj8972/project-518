-- Add chat_locked boolean to site_settings (defaults to false)
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS chat_locked boolean NOT NULL DEFAULT false;
