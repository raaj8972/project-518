-- Migration: Add default_schedule_type to site_settings
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS default_schedule_type TEXT DEFAULT 'prelims' CHECK (default_schedule_type IN ('prelims', 'mains'));

COMMENT ON COLUMN site_settings.default_schedule_type IS 'Pins whether Prelims or Mains shows first in the schedule view';
