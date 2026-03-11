-- Migration: Restore Annual Sports Registration ID Auto-generation
-- Description: Re-introduces the sequence and default value for reg_id that was lost.

-- 1. Create Sequence
CREATE SEQUENCE IF NOT EXISTS annual_sports_reg_id_seq START WITH 1001;

-- 2. Create Generator Function
CREATE OR REPLACE FUNCTION generate_annual_sports_reg_id()
RETURNS text AS $$
BEGIN
  RETURN 'RICO-2' || TO_CHAR(NOW(), 'YY') || '-' || LPAD(NEXTVAL('annual_sports_reg_id_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Add column and set default
ALTER TABLE public.annual_sports_registrations 
ADD COLUMN IF NOT EXISTS reg_id text UNIQUE DEFAULT generate_annual_sports_reg_id();

-- 4. Notify schema reload
NOTIFY pgrst, 'reload schema';
