-- Emergency Debug: Find out WHY owner can't see approvals

-- Step 1: Who is currently logged in as owner?
-- Run this to find the owner's user_id
SELECT user_id, email, role, is_primary 
FROM admin_users
WHERE role = 'owner' OR is_primary = true;

-- Step 2: Check if that user_id can access pending_approvals
-- Replace YOUR_OWNER_USER_ID with the user_id from Step 1
-- SELECT * FROM pending_approvals WHERE status = 'pending';

-- Step 3: Completely remove RLS to test (TEMPORARY - just for debugging)
ALTER TABLE pending_approvals DISABLE ROW LEVEL SECURITY;

-- Step 4: Check if approvals show up now (they should)
SELECT id, entity_type, action_type, status, created_at 
FROM pending_approvals 
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Step 5: Re-enable RLS after testing
-- ALTER TABLE pending_approvals ENABLE ROW LEVEL SECURITY;
