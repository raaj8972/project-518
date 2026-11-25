-- Retired: historical anonymous write policies must never be restored.
-- Apply the versioned migrations with `supabase db push` instead.
DO $$ BEGIN RAISE EXCEPTION 'Retired insecure repair script. Apply supabase/migrations/20261124010000_prelaunch_security_remediation.sql through the migration workflow.'; END $$;
