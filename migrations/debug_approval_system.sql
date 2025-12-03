-- STEP 1: Check if the migration was applied
-- Run each query separately in Supabase SQL Editor

-- Query 1: Check if pending_approvals table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'pending_approvals';
-- Expected: Should return 'pending_approvals'

-- Query 2: Check if requires_approval column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'admin_users'
AND column_name IN ('requires_approval', 'approval_enabled_by', 'approval_enabled_at');
-- Expected: Should return 3 rows

-- Query 3: Check current admin users and their approval status
SELECT 
  email,
  role,
  requires_approval,
  approval_enabled_at
FROM admin_users
ORDER BY created_at DESC;
-- Expected: See your admins with requires_approval column

-- Query 4: Check if there are any pending approvals
SELECT * FROM pending_approvals
WHERE status = 'pending'
ORDER BY created_at DESC;
-- Expected: If empty, approvals aren't being saved

-- Query 5: Check RLS policies on pending_approvals
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'pending_approvals';
-- Expected: Should see INSERT, SELECT, UPDATE policies
