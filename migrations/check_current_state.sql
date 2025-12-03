-- ✅ Migration is Applied - Now Let's Debug

-- Step 1: Verify table exists and see its structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pending_approvals'
ORDER BY ordinal_position;

-- Step 2: Check if admin has approval enabled
SELECT 
  user_id,
  email,
  role,
  requires_approval,
  approval_enabled_by,
  approval_enabled_at
FROM admin_users
ORDER BY created_at DESC;

-- Step 3: Check if there are ANY pending approvals (bypass RLS)
SET LOCAL ROLE postgres; -- Run as superuser to bypass RLS
SELECT 
  id,
  admin_user_id,
  entity_type,
  action_type,
  status,
  created_at,
  changes
FROM pending_approvals
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Check RLS policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'pending_approvals';

-- Step 5: Find the owner's user_id
SELECT user_id, email, role 
FROM admin_users 
WHERE role = 'owner' OR is_primary = true;
