-- Add pass_template_config column to security_settings table
-- This stores the design configuration (background image, QR position, etc.) for each event day
-- Format: { "day_1": { "bgUrl": "...", "qr": { "x": 10, "y": 10, "size": 100 } }, ... }

ALTER TABLE public.security_settings 
ADD COLUMN IF NOT EXISTS pass_template_config JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.security_settings.pass_template_config IS 'Stores pass design configuration (background, QR position) indexed by day key';
