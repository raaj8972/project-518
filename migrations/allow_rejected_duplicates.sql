-- Migration: Allow duplicate registrations if previous status is 'rejected'
-- Objective: Drop strict unique constraints and replace with partial indexes.

-- 1. Drop existing unique constraints if they exist
-- Note: Constraint names might vary, so we try standard naming patterns.
DO $$
BEGIN
    -- Drop constraint on (event_id, email)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registrations_event_id_email_key') THEN
        ALTER TABLE public.registrations DROP CONSTRAINT registrations_event_id_email_key;
    END IF;

    -- Drop constraint on (event_id, phone)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registrations_event_id_phone_key') THEN
        ALTER TABLE public.registrations DROP CONSTRAINT registrations_event_id_phone_key;
    END IF;

    -- Also drop unique indexes if they were created manually without constraints
    DROP INDEX IF EXISTS idx_registrations_event_email;
    DROP INDEX IF EXISTS idx_registrations_event_phone;
    DROP INDEX IF EXISTS registrations_event_id_email_key;
    DROP INDEX IF EXISTS registrations_event_id_phone_key;
END $$;

-- 1.5 Data Cleanup: Handle existing duplicates that violate the new index
-- We mark older duplicates as 'rejected' so they don't conflict with the "active" unique index.

-- Cleanup Email Duplicates
WITH email_duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY event_id, lower(email) 
           ORDER BY 
             CASE WHEN status = 'approved' THEN 10 WHEN status = 'pending' THEN 5 ELSE 1 END DESC, 
             registration_date DESC
         ) as rn
  FROM public.registrations
  WHERE status != 'rejected' AND deleted_at IS NULL
)
UPDATE public.registrations
SET status = 'rejected'
WHERE id IN (
  SELECT id FROM email_duplicates WHERE rn > 1
);

-- Cleanup Phone Duplicates
WITH phone_duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY event_id, phone 
           ORDER BY 
             CASE WHEN status = 'approved' THEN 10 WHEN status = 'pending' THEN 5 ELSE 1 END DESC, 
             registration_date DESC
         ) as rn
  FROM public.registrations
  WHERE status != 'rejected' AND deleted_at IS NULL
)
UPDATE public.registrations
SET status = 'rejected'
WHERE id IN (
  SELECT id FROM phone_duplicates WHERE rn > 1
);

-- 2. Create partial unique indexes
-- These indexes enforce uniqueness ONLY when status is NOT 'rejected'.
-- This effectively allows multiple 'rejected' rows for the same email/phone,
-- but only ONE 'pending' or 'approved' row.

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_unique_email_active 
ON public.registrations (event_id, email)
WHERE status != 'rejected' AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_unique_phone_active 
ON public.registrations (event_id, phone)
WHERE status != 'rejected' AND deleted_at IS NULL;

-- 3. Comments
COMMENT ON INDEX idx_registrations_unique_email_active IS 'Enforces unique email per event only for non-rejected, non-deleted registrations.';
COMMENT ON INDEX idx_registrations_unique_phone_active IS 'Enforces unique phone per event only for non-rejected, non-deleted registrations.';
