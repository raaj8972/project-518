-- Migration: Add Phone Duplicate Registration Prevention
-- Description: Adds unique constraint to prevent multiple registrations with the same phone for the same event.

-- 1. Remove existing duplicate phones (keeping the latest one)
DELETE FROM public.annual_sports_registrations a
USING public.annual_sports_registrations b
WHERE a.id < b.id
  AND a.event_id = b.event_id
  AND a.phone = b.phone
  AND a.phone IS NOT NULL;

-- 2. Add Unique Constraint for Phone
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'annual_sports_reg_unique_phone') THEN
        ALTER TABLE public.annual_sports_registrations 
        ADD CONSTRAINT annual_sports_reg_unique_phone UNIQUE (event_id, phone);
    END IF;
END $$;

-- 3. Notify schema reload
NOTIFY pgrst, 'reload schema';
