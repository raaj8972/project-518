-- Fix Data Integrity for Offline Scans
-- 1. Add missing pass_token column to pass_scans
-- This is required for offline syncs to succeed
ALTER TABLE public.pass_scans 
ADD COLUMN IF NOT EXISTS pass_token TEXT;

-- 2. Create Trigger to automatically link pass_id on insert
-- This ensures future offline syncs (which only send token) get correctly linked to their UUID
CREATE OR REPLACE FUNCTION public.link_scan_to_pass()
RETURNS TRIGGER AS $$
BEGIN
  -- If pass_id is missing but we have a token, look it up
  IF NEW.pass_id IS NULL AND NEW.pass_token IS NOT NULL THEN
    SELECT id INTO NEW.pass_id
    FROM public.entry_passes
    WHERE pass_token = NEW.pass_token;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS link_scan_pass_trigger ON public.pass_scans;

CREATE TRIGGER link_scan_pass_trigger
BEFORE INSERT ON public.pass_scans
FOR EACH ROW
EXECUTE FUNCTION public.link_scan_to_pass();

-- 3. Trigger to automatically mark pass as used when a valid scan is inserted
-- (Re-applying from previous fix for completeness)
CREATE OR REPLACE FUNCTION public.handle_pass_scan_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scan_result = 'valid' AND NEW.pass_id IS NOT NULL THEN
    UPDATE public.entry_passes
    SET 
      is_used = true,
      used_at = COALESCE(NEW.scanned_at, NOW())
    WHERE id = NEW.pass_id
      AND is_used = false; 
  END IF;
  return NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_scan_recorded ON public.pass_scans;

CREATE TRIGGER on_scan_recorded
AFTER INSERT ON public.pass_scans
FOR EACH ROW
EXECUTE FUNCTION public.handle_pass_scan_sync();
