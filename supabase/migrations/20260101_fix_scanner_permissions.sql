----------------------------------------------------------------
-- FIX: Scanner Permissions (Offline Sync)
----------------------------------------------------------------
-- Issue: Non-admin users (Security guards) cannot fetch passes or upload scans.
-- Solution: Grant authenticated users (scanners) access to necessary tables.

-- 1. ENTRY PASSES (Read Access for Offline Cache)
ALTER TABLE entry_passes ENABLE ROW LEVEL SECURITY;

-- Allow Scanners to read ALL passes (Required for offline validation)
-- Note: Requires user to be logged in (authenticated)
CREATE POLICY "Scanners can read entry passes" ON entry_passes
  FOR SELECT TO authenticated
  USING (true);

-- 2. PASS SCANS (Write Access for Sync)
ALTER TABLE pass_scans ENABLE ROW LEVEL SECURITY;

-- Allow Scanners to upload new scans
CREATE POLICY "Scanners can insert scans" ON pass_scans
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow Scanners to read their own scans (Optional: for history)
-- drop policy if exists "Scanners can read own scans" on pass_scans;
create policy "Scanners can read own scans" on pass_scans
--  FOR SELECT TO authenticated
--  USING (true); -- Simplified to allow reading history (or restrict to auth.uid())

-- 3. VALIDATION RULES (Already covered, but ensuring)
ALTER TABLE validation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read validation rules" ON validation_rules
  FOR SELECT TO public USING (true);
