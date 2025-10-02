-- Add user_id column to admin_blocked_devices to support account-level blocking across browsers.
DO $$
BEGIN
  IF to_regclass('public.admin_blocked_devices') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='admin_blocked_devices' AND column_name='user_id'
    ) THEN
      ALTER TABLE public.admin_blocked_devices ADD COLUMN user_id uuid;
      CREATE INDEX IF NOT EXISTS admin_blocked_devices_user_id_idx ON public.admin_blocked_devices(user_id);
    END IF;
  END IF;
END $$;
