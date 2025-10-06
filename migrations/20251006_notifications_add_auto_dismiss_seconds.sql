-- Add per-notification auto-dismiss timer (seconds)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'auto_dismiss_seconds'
  ) THEN
    ALTER TABLE public.notifications
      ADD COLUMN auto_dismiss_seconds integer NULL;
    COMMENT ON COLUMN public.notifications.auto_dismiss_seconds IS 'Optional: number of seconds the popup should auto-dismiss after showing; 0 or null means disabled (falls back to client defaults).';
  END IF;
END $$;

-- No-op if table missing; safe to run in any environment