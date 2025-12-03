-- Owner Approval System - Database Migration
-- This creates the infrastructure for owner approval workflow

-- 1. Create pending_approvals table
CREATE TABLE IF NOT EXISTS pending_approvals (
  id SERIAL PRIMARY KEY,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'event', 
    'sponsor', 
    'gallery_image',
    'faculty_head',
    'core_committee',
    'core_team_member',
    'guest_artist',
    'chief_guest',
    'homepage_settings',
    'about_settings'
  )),
  entity_id INTEGER, -- NULL for creates, populated for updates/deletes
  action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'delete')),
  changes JSONB NOT NULL, -- Stores the actual data/changes
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add approval settings to admin_users table
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approval_enabled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approval_enabled_at TIMESTAMPTZ;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_approvals_status ON pending_approvals(status);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_admin_user ON pending_approvals(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_entity ON pending_approvals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_created_at ON pending_approvals(created_at DESC);

-- 4. Enable RLS on pending_approvals
ALTER TABLE pending_approvals ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for pending_approvals

-- Admins can view their own pending approvals
CREATE POLICY "Admins can view own pending approvals"
  ON pending_approvals
  FOR SELECT
  USING (
    admin_user_id = auth.uid()
  );

-- Admins can insert their own pending approvals
CREATE POLICY "Admins can create pending approvals"
  ON pending_approvals
  FOR INSERT
  WITH CHECK (
    admin_user_id = auth.uid()
  );

-- Only owners can view all pending approvals
CREATE POLICY "Owners can view all pending approvals"
  ON pending_approvals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- Only owners can update (approve/reject) pending approvals
CREATE POLICY "Owners can update pending approvals"
  ON pending_approvals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- 6. Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pending_approvals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pending_approvals_updated_at
  BEFORE UPDATE ON pending_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_approvals_updated_at();

-- 7. Function to check if admin requires approval
CREATE OR REPLACE FUNCTION check_admin_requires_approval(admin_uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(requires_approval, FALSE)
    FROM admin_users
    WHERE user_id = admin_uid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant necessary permissions
GRANT SELECT, INSERT ON pending_approvals TO authenticated;
GRANT UPDATE ON pending_approvals TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE pending_approvals_id_seq TO authenticated;

-- Comments for documentation
COMMENT ON TABLE pending_approvals IS 'Stores admin changes awaiting owner approval';
COMMENT ON COLUMN pending_approvals.entity_type IS 'Type of content being changed';
COMMENT ON COLUMN pending_approvals.action_type IS 'Whether creating, updating, or deleting';
COMMENT ON COLUMN pending_approvals.changes IS 'JSON data of the actual changes or new content';
COMMENT ON COLUMN pending_approvals.status IS 'Current approval status: pending, approved, or rejected';
