----------------------------------------------------------------
-- FIX: Public/Anonymous Scanner Access
----------------------------------------------------------------
-- Issue: User requested offline fetching without admin/user login.
-- Solution: Grant PUBLIC (Anonymous) access to fetch passes and upload scans.
-- WARNING: This makes pass data readable by anyone with the API URL and Key (which is public in frontend).
-- Ensure this is intended for your use case (e.g., Kiosk mode).

-- 1. ENTRY PASSES (Public Read)
ALTER TABLE entry_passes ENABLE ROW LEVEL SECURITY;

-- Drop previous restricted policy
DROP POLICY IF EXISTS "Scanners can read entry passes" ON entry_passes; 

-- Allow ANYONE to read passes (for anonymous offline cache)
CREATE POLICY "Public read entry passes" ON entry_passes
  FOR SELECT TO public
  USING (true);

-- 2. PASS SCANS (Public Write)
ALTER TABLE pass_scans ENABLE ROW LEVEL SECURITY;

-- Drop previous restricted policy
DROP POLICY IF EXISTS "Scanners can insert scans" ON pass_scans;

-- Allow ANYONE to upload scans
CREATE POLICY "Public insert scans" ON pass_scans
  FOR INSERT TO public
  WITH CHECK (true);

-- 3. VALIDATION RULES (Already public, but ensuring)
DROP POLICY IF EXISTS "Public read validation rules" ON validation_rules;
CREATE POLICY "Public read validation rules" ON validation_rules
  FOR SELECT TO public USING (true);
