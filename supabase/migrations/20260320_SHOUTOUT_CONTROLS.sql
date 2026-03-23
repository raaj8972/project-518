-- Update site_settings for Shout-out Controls
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS shoutouts_enabled      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS shoutouts_daily_limit  integer NOT NULL DEFAULT 3, -- 0 for infinite
  ADD COLUMN IF NOT EXISTS shoutouts_expiry_hours integer NOT NULL DEFAULT 24;

-- Comment for clarity
COMMENT ON COLUMN site_settings.shoutouts_daily_limit IS 'Max shout-outs per user in a rolling 24h window. 0 means infinite.';
COMMENT ON COLUMN site_settings.shoutouts_expiry_hours IS 'Duration in hours for which a shout-out remains visible on the board.';
