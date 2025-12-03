-- FIX: Allow owners to see ALL pending approvals
-- The current policy only lets admins see their own approvals
-- We need to add a policy so owners can see EVERYONE'S approvals

-- First, drop the old restrictive policy
DROP POLICY IF EXISTS "Owners can view all pending approvals" ON pending_approvals;

-- Create the correct policy for owners
CREATE POLICY "Owners can view all pending approvals" ON pending_approvals
FOR SELECT TO authenticated
USING (
  -- Either you're an owner (can see all)
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND (admin_users.role = 'owner' OR admin_users.is_primary = true)
  )
  -- Or you're the admin who created it (can see your own)
  OR admin_user_id = auth.uid()
);

-- Verify the policy was created
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'pending_approvals' 
AND policyname = 'Owners can view all pending approvals';
