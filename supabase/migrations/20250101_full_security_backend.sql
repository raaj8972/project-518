-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

----------------------------------------------------------------
-- 1. SECURITY SETTINGS (Fixes "Settings" tab not working)
----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_settings (
  id INTEGER PRIMARY KEY, -- Singleton configuration row (ID=1)
  entry_pass_button_enabled BOOLEAN DEFAULT true,
  event_dates JSONB DEFAULT '[]'::jsonb, -- Stores allowed event dates as ["YYYY-MM-DD"]
  councils_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read settings (required for scanners/dashboard)
CREATE POLICY "Public read security settings" ON security_settings
  FOR SELECT TO public USING (true);

-- Policy: Admins can update settings
CREATE POLICY "Admins update security settings" ON security_settings
  FOR UPDATE TO authenticated
  USING (
    -- User must be in admin_users table
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  )
  WITH CHECK (true);

-- Initialize the default settings row (ID=1) if it doesn't exist
INSERT INTO security_settings (id, entry_pass_button_enabled, event_dates, councils_enabled)
VALUES (1, true, '[]'::jsonb, false)
ON CONFLICT (id) DO NOTHING;


----------------------------------------------------------------
-- 2. VALIDATION RULES (Fixes "Rules" tab / "Read Only Mode")
----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- e.g. 'date_restriction', 'capacity'
  pass_type TEXT, -- NULL = all passes
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE validation_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read active rules
CREATE POLICY "Public read validation rules" ON validation_rules
  FOR SELECT TO public USING (true);

-- Policy: Admins can manage rules
CREATE POLICY "Admins manage validation rules" ON validation_rules
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Insert default rules if the table is empty
INSERT INTO validation_rules (rule_name, rule_type, pass_type, config, is_active, priority, error_message)
SELECT 
  'Event Day 1 Only', 
  'date_restriction', 
  'regular', 
  '{"allowedDates": ["2025-12-30"]}'::jsonb, 
  false, 
  20, 
  'This pass is only valid for Day 1'
WHERE NOT EXISTS (SELECT 1 FROM validation_rules WHERE rule_type = 'date_restriction');

INSERT INTO validation_rules (rule_name, rule_type, pass_type, config, is_active, priority, error_message)
SELECT 
  'Venue Capacity Limit', 
  'capacity', 
  NULL, 
  '{"maxCapacity": 500}'::jsonb, 
  false, 
  5, 
  'Venue has reached maximum capacity'
WHERE NOT EXISTS (SELECT 1 FROM validation_rules WHERE rule_type = 'capacity');


----------------------------------------------------------------
-- 3. ADMIN USERS (Dependency for permissions)
----------------------------------------------------------------
-- Ensure admin_users table exists so policies don't fail
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read admin users" ON admin_users
  FOR SELECT TO authenticated USING (true);

-- NOTE: You may need to manually insert your user into 'admin_users' if you are locked out.
-- Example: INSERT INTO admin_users (user_id, email, role) VALUES ('YOUR_UUID', 'email@example.com', 'owner');
