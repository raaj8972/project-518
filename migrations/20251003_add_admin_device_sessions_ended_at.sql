-- Add ended_at column to admin_device_sessions to record explicit session end time
DO $$
BEGIN
	IF to_regclass('public.admin_device_sessions') IS NOT NULL THEN
		ALTER TABLE admin_device_sessions ADD COLUMN IF NOT EXISTS ended_at timestamptz;
		-- Create index only if it doesn't already exist
		IF NOT EXISTS (
			SELECT 1 FROM pg_class c WHERE c.relname = 'idx_admin_device_sessions_ended_at'
		) THEN
			EXECUTE 'CREATE INDEX idx_admin_device_sessions_ended_at ON admin_device_sessions(ended_at DESC)';
		END IF;
	END IF;
END $$;