-- Fix RLS policy for registrations table to allow public users to submit registrations

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public can insert registrations" ON registrations;
DROP POLICY IF EXISTS "Allow public insert registrations" ON registrations;
DROP POLICY IF EXISTS "Registrations_Public_Insert" ON registrations;

-- Enable RLS on registrations table if not already enabled
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Allow public (anonymous and authenticated) users to insert registrations
CREATE POLICY "Public can insert registrations"
  ON registrations
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow admins and owners to view all registrations
CREATE POLICY "Admins can view all registrations"
  ON registrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Allow admins to update registrations (approve/reject)
CREATE POLICY "Admins can update registrations"
  ON registrations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      LEFT JOIN admin_permissions ap ON au.user_id = ap.user_id
      WHERE au.user_id = auth.uid()
        AND (au.role = 'owner' OR au.is_primary = true OR ap.can_registrations = true)
    )
  );

-- Allow admins to delete registrations
CREATE POLICY "Admins can delete registrations"
  ON registrations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
        AND (au.role = 'owner' OR au.is_primary = true)
    )
  );
