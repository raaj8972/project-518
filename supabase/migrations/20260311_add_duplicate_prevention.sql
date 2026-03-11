-- Migration: Add Duplicate Registration Prevention
-- Description: Adds unique constraints to prevent multiple registrations for the same event.

-- 1. Remove existing duplicates (keeping the latest one)
DELETE FROM public.annual_sports_registrations a
USING public.annual_sports_registrations b
WHERE a.id < b.id
  AND a.event_id = b.event_id
  AND (
    (a.email = b.email AND a.email IS NOT NULL AND b.email IS NOT NULL) OR
    (a.roll_no = b.roll_no AND a.roll_no IS NOT NULL AND b.roll_no IS NOT NULL)
  );

-- 2. Add Unique Constraints
-- We use unique indexes with filter to handle NULLs properly if needed,
-- but standard UNIQUE constraints on multiple columns usually treat NULL as distinct.
-- However, we want to prevent multiple NULL roll_numbers for the same person... 
-- actually, one person might not have a roll number.

-- Prevent same email for same event
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'annual_sports_reg_unique_email') THEN
        ALTER TABLE public.annual_sports_registrations 
        ADD CONSTRAINT annual_sports_reg_unique_email UNIQUE (event_id, email);
    END IF;
END $$;

-- Prevent same roll number for same event (if roll_no is provided)
CREATE UNIQUE INDEX IF NOT EXISTS annual_sports_reg_unique_roll_no 
ON public.annual_sports_registrations (event_id, roll_no) 
WHERE roll_no IS NOT NULL;

-- 3. Notify schema reload
NOTIFY pgrst, 'reload schema';
