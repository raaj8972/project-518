-- Migration: 20260317_pass_logic_v3.sql
-- Description: Updates entry_passes to support a 3-day structure with strict one-time use per day.

-- 1. Ensure the entry_passes table has the required structure
DO $$ 
BEGIN
    -- Add registration_id if missing. Using TEXT to match registrations.id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='entry_passes' AND column_name='registration_id') THEN
        ALTER TABLE public.entry_passes ADD COLUMN registration_id TEXT;
    END IF;

    -- Add day_number if missing (1, 2, or 3)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='entry_passes' AND column_name='day_number') THEN
        ALTER TABLE public.entry_passes ADD COLUMN day_number INTEGER DEFAULT 1;
    END IF;

    -- Add valid_date if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='entry_passes' AND column_name='valid_date') THEN
        ALTER TABLE public.entry_passes ADD COLUMN valid_date DATE;
    END IF;

    -- ensure is_used is present
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='entry_passes' AND column_name='is_used') THEN
        ALTER TABLE public.entry_passes ADD COLUMN is_used BOOLEAN DEFAULT FALSE;
    END IF;

    -- add scanned metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='entry_passes' AND column_name='scanned_at') THEN
        ALTER TABLE public.entry_passes ADD COLUMN scanned_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='entry_passes' AND column_name='scanned_by') THEN
        ALTER TABLE public.entry_passes ADD COLUMN scanned_by TEXT;
    ELSE
        ALTER TABLE public.entry_passes ALTER COLUMN scanned_by TYPE TEXT;
    END IF;
END $$;

-- 2. Add Unique Constraint to prevent multiple passes for same person on same day
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_registration_day_v3'
    ) THEN
        ALTER TABLE public.entry_passes ADD CONSTRAINT unique_registration_day_v3 UNIQUE (registration_id, day_number);
    END IF;
END $$;

-- 3. Create helpful indexes
CREATE INDEX IF NOT EXISTS idx_entry_passes_registration_id_v3 ON public.entry_passes(registration_id);
CREATE INDEX IF NOT EXISTS idx_entry_passes_day_v3 ON public.entry_passes(day_number);

-- 4. RLS update (ensure security can see and update)
ALTER TABLE public.entry_passes ENABLE ROW LEVEL SECURITY;

-- Admins and Security can read all
-- Pattern: Admins use auth.uid(), Security use CURRENT_USER
DROP POLICY IF EXISTS "Admin and Security can view all passes v3" ON public.entry_passes;
CREATE POLICY "Admin and Security can view all passes v3" 
ON public.entry_passes FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM security_users WHERE username = CURRENT_USER AND is_active = true)
);

-- Admins and Security can update usage status
DROP POLICY IF EXISTS "Security can update pass usage v3" ON public.entry_passes;
CREATE POLICY "Security can update pass usage v3"
ON public.entry_passes FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM security_users WHERE username = CURRENT_USER AND is_active = true) AND is_used = false)
)
WITH CHECK (is_used = true);


