-- Add admin_only flag for notifications and tighten anon read policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'admin_only'
  ) THEN
    ALTER TABLE public.notifications
      ADD COLUMN admin_only boolean NOT NULL DEFAULT false;
    COMMENT ON COLUMN public.notifications.admin_only IS 'true => only admins/owners should see this; false => public-visible';
  END IF;
END $$;

-- Backfill any nulls for safety (older rows)
UPDATE public.notifications
SET admin_only = false
WHERE admin_only IS NULL;

-- Ensure anon/public queries never return admin-only rows
DROP POLICY IF EXISTS "Public can read active notifications" ON public.notifications;

CREATE POLICY "Public can read active notifications"
  ON public.notifications
  FOR SELECT
  TO anon
  USING (
    visible = true
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at >= now())
    AND admin_only = false
  );
