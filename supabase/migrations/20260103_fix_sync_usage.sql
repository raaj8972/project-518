-- Trigger to automatically mark pass as used when a valid scan is inserted
-- This fixes the issue where Offline Scans synced to the server didn't update the pass status

CREATE OR REPLACE FUNCTION public.handle_pass_scan_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act if the scan result is 'valid'
  IF NEW.scan_result = 'valid' THEN
    
    -- Update entry_passes
    UPDATE public.entry_passes
    SET 
      is_used = true,
      used_at = COALESCE(NEW.scanned_at, NOW())
    WHERE pass_token = NEW.pass_token
      AND is_used = false; -- Performance optimization: don't update if already used
      
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger to ensure it's up to date
DROP TRIGGER IF EXISTS on_scan_recorded ON public.pass_scans;

CREATE TRIGGER on_scan_recorded
AFTER INSERT ON public.pass_scans
FOR EACH ROW
EXECUTE FUNCTION public.handle_pass_scan_sync();
