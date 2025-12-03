-- Fix PGRST200: Add missing foreign key relationship
-- Supabase needs this to know how to join pending_approvals with admin_users

-- 1. Add the foreign key constraint
ALTER TABLE pending_approvals
ADD CONSTRAINT fk_pending_approvals_admin_users
FOREIGN KEY (admin_user_id)
REFERENCES admin_users(user_id)
ON DELETE CASCADE;

-- 2. Verify it was added
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_name = 'fk_pending_approvals_admin_users';
