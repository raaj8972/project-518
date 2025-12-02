-- Admin Presence Tracking Table
-- Tracks real-time presence of admins in the dashboard

CREATE TABLE IF NOT EXISTS admin_presence (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  current_page TEXT, -- e.g., "Events Management", "Gallery", "Settings"
  current_section TEXT, -- more granular, e.g., "Editing Event: Web Design Workshop"
  is_typing BOOLEAN DEFAULT FALSE,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE admin_presence ENABLE ROW LEVEL SECURITY;

-- Admins can read all presence data
CREATE POLICY "Admins can view all presence"
  ON admin_presence FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Admins can update only their own presence
CREATE POLICY "Admins can update own presence"
  ON admin_presence FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index for faster lookups
CREATE INDEX idx_admin_presence_user_id ON admin_presence(user_id);
CREATE INDEX idx_admin_presence_last_activity ON admin_presence(last_activity_at DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_presence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_presence_updated_at
  BEFORE UPDATE ON admin_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_presence_updated_at();
