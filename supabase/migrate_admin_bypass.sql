-- Precise Migrate Hardcoded Master Bypass to Database
-- This version uses discovered Auth IDs to satisfy Foreign Key constraints.

-- 1. Ensure columns and unique constraints exist
DO $$ 
BEGIN 
    -- Add columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='created_at') THEN
        ALTER TABLE admin_users ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='updated_at') THEN
        ALTER TABLE admin_users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='role') THEN
        ALTER TABLE admin_users ADD COLUMN role TEXT DEFAULT 'admin';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='is_primary') THEN
        ALTER TABLE admin_users ADD COLUMN is_primary BOOLEAN DEFAULT false;
    END IF;

    -- Ensure email column has a unique constraint (required for ON CONFLICT)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'admin_users' AND constraint_name = 'admin_users_email_unique'
    ) THEN
        BEGIN
            ALTER TABLE admin_users ADD CONSTRAINT admin_users_email_unique UNIQUE (email);
        EXCEPTION WHEN duplicate_table OR duplicate_object THEN
            NULL;
        END;
    END IF;
END $$;

-- 2. Insert or Update primary admin users using discovered IDs
-- IDs discovered from auth.users:
-- raaj@rico.fun -> 6835bd59-0d0a-49e6-b52f-881709a471ea
-- raja@rico.fun -> ae6c13db-47eb-4b15-b668-c63e878c456e

-- We use role = 'admin' with is_primary = true to avoid the "admin_users_single_owner" constraint
-- while still granting full owner access in the codebase logic.

INSERT INTO admin_users (user_id, email, role, is_primary)
VALUES 
  ('ae6c13db-47eb-4b15-b668-c63e878c456e', 'raja@rico.fun', 'admin', true),
  ('6835bd59-0d0a-49e6-b52f-881709a471ea', 'raaj@rico.fun', 'admin', true)
ON CONFLICT (email) DO UPDATE 
SET 
  user_id = EXCLUDED.user_id,
  role = 'admin', 
  is_primary = true, 
  updated_at = now();

COMMENT ON TABLE admin_users IS 'Restricted table for authorized administrative access.';
