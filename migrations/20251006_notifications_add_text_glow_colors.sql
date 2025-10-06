-- Add optional text and glow color columns to notifications
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'text_color'
    ) THEN
      ALTER TABLE public.notifications ADD COLUMN text_color text NULL;
      COMMENT ON COLUMN public.notifications.text_color IS 'Optional CSS color for title/message text (e.g., #ffffff).';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'glow_color'
    ) THEN
      ALTER TABLE public.notifications ADD COLUMN glow_color text NULL;
      COMMENT ON COLUMN public.notifications.glow_color IS 'Optional CSS color for title glow (e.g., #ff00ff).';
    END IF;
  END IF;
END $$;

-- Safe to run repeatedly