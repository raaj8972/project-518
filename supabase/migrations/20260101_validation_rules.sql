-- Create validation_rules table
CREATE TABLE IF NOT EXISTS validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- 'time_window', 'capacity', 'day_restriction', 'date_restriction', 'custom'
  pass_type TEXT, -- NULL = applies to all
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_validation_rules_active ON validation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_validation_rules_type ON validation_rules(rule_type);

-- Enable RLS
ALTER TABLE validation_rules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read active rules" ON validation_rules
  FOR SELECT TO public USING (true); -- Allow all to read rules (needed for scanners)

CREATE POLICY "Admins manage rules" ON validation_rules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND (role = 'owner' OR role = 'admin' OR is_primary = true)
    )
  );

-- Insert DEFAULT RULES if table is empty
INSERT INTO validation_rules (id, rule_name, rule_type, pass_type, config, is_active, priority, error_message)
SELECT 
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- consistent UUID
  'Event Day 1 Only',
  'date_restriction',
  'regular',
  '{"allowedDates": ["2025-12-30"]}'::jsonb,
  false,
  20,
  'This pass is only valid for Day 1 (Dec 30)'
WHERE NOT EXISTS (SELECT 1 FROM validation_rules WHERE rule_type = 'date_restriction');

INSERT INTO validation_rules (id, rule_name, rule_type, pass_type, config, is_active, priority, error_message)
SELECT 
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'Venue Capacity Limit',
  'capacity',
  NULL,
  '{"maxCapacity": 500}'::jsonb,
  false,
  5,
  'Venue has reached maximum capacity'
WHERE NOT EXISTS (SELECT 1 FROM validation_rules WHERE rule_type = 'capacity');
