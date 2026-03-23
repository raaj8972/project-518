-- Migration: 20260317_pass_logic_v4.sql
-- Description: Update entry_passes to support user_id and day-specific passes for all users

-- 1. Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'entry_passes' AND column_name = 'user_id') THEN
        ALTER TABLE entry_passes ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Make registration_id optional
ALTER TABLE entry_passes ALTER COLUMN registration_id DROP NOT NULL;

-- 3. Add day_number if it doesn't exist (should already be there from v3 but just in case)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'entry_passes' AND column_name = 'day_number') THEN
        ALTER TABLE entry_passes ADD COLUMN day_number INTEGER DEFAULT 1;
    END IF;
END $$;

-- 4. Clean up existing passes that might violate the new unique constraint
-- (Optional: only if you want a clean start or to ensure data integrity)
-- DELETE FROM entry_passes WHERE user_id IS NULL AND registration_id IS NOT NULL;

-- 5. Add unique constraint on (user_id, day_number)
-- First remove any existing constraint if we want to replace it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entry_passes_user_day_unique') THEN
        ALTER TABLE entry_passes DROP CONSTRAINT entry_passes_user_day_unique;
    END IF;
END $$;

ALTER TABLE entry_passes ADD CONSTRAINT entry_passes_user_day_unique UNIQUE (user_id, day_number);

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_entry_passes_user_id ON entry_passes(user_id);
CREATE INDEX IF NOT EXISTS idx_entry_passes_day_number ON entry_passes(day_number);

-- 7. Ensure RLS policies are updated for user-based access
DROP POLICY IF EXISTS "Users can view their own entry passes" ON entry_passes;
CREATE POLICY "Users can view their own entry passes"
ON entry_passes FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
        SELECT user_id FROM registrations WHERE id = registration_id
    )
);

-- 8. Add participant_name and pass_type if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'entry_passes' AND column_name = 'participant_name') THEN
        ALTER TABLE entry_passes ADD COLUMN participant_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'entry_passes' AND column_name = 'pass_type') THEN
        ALTER TABLE entry_passes ADD COLUMN pass_type TEXT DEFAULT 'General Admission';
    END IF;
END $$;
