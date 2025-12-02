-- Fix RLS policies for admin_permissions table
-- This ensures Owners can SEE and UPDATE everyone's permissions
-- While regular Admins can only SEE their own permissions

-- Enable RLS on the table (just in case)
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can view their own permissions" ON admin_permissions;
DROP POLICY IF EXISTS "Owners can view all permissions" ON admin_permissions;
DROP POLICY IF EXISTS "Owners can update all permissions" ON admin_permissions;
DROP POLICY IF EXISTS "Owners can insert permissions" ON admin_permissions;
DROP POLICY IF EXISTS "Owners can delete permissions" ON admin_permissions;

-- 1. VIEW (SELECT) Policies
-- Allow users to view their own permissions
CREATE POLICY "Admins can view their own permissions"
ON admin_permissions FOR SELECT
USING (auth.uid() = user_id);

-- Allow Owners to view ALL permissions
CREATE POLICY "Owners can view all permissions"
ON admin_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND (role = 'owner' OR is_primary = true)
  )
);

-- 2. UPDATE Policies
-- Only Owners can update permissions
CREATE POLICY "Owners can update all permissions"
ON admin_permissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND (role = 'owner' OR is_primary = true)
  )
);

-- 3. INSERT Policies
-- Only Owners can insert permissions
CREATE POLICY "Owners can insert permissions"
ON admin_permissions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND (role = 'owner' OR is_primary = true)
  )
);

-- 4. DELETE Policies
-- Only Owners can delete permissions
CREATE POLICY "Owners can delete permissions"
ON admin_permissions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND (role = 'owner' OR is_primary = true)
  )
);
