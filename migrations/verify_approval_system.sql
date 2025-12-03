-- Quick verification script: Check if approval system tables exist
-- Run this in Supabase SQL Editor to verify the migration was applied

-- 1. Check if pending_approvals table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'pending_approvals'
) as pending_approvals_exists;

-- 2. Check if admin_users has requires_approval column
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'admin_users'
  AND column_name = 'requires_approval'
) as requires_approval_column_exists;

-- 3. If both exist, show sample data
SELECT 
  user_id, 
  email,
  requires_approval,
  approval_enabled_at
FROM admin_users
ORDER BY created_at DESC;

-- 4. Show any pending approvals
SELECT 
  id,
  entity_type,
  action_type,
  status,
  created_at
FROM pending_approvals
ORDER BY created_at DESC
LIMIT 10;
