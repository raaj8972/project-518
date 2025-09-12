/*
  # Ensure public read access to events and sane defaults

  1. Security
    - Enable RLS on events (idempotent)
    - Ensure a public SELECT policy exists so the site can read events without auth

  2. Data correctness
    - Ensure the `visible` column exists and default is TRUE
    - Backfill any NULL `visible` values to TRUE so events render publicly
*/

-- Enable Row Level Security (safe if already enabled)
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER TABLE public.events ENABLE ROW LEVEL SECURITY';
  EXCEPTION WHEN others THEN
    -- table may not exist in this project yet; ignore
    NULL;
  END;
END $$;

-- Ensure the `visible` column exists with a default of TRUE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'events'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'visible'
    ) THEN
      EXECUTE 'ALTER TABLE public.events ADD COLUMN visible boolean DEFAULT true';
    END IF;
    -- Ensure default TRUE (in case column existed without default)
    EXECUTE 'ALTER TABLE public.events ALTER COLUMN visible SET DEFAULT true';
    -- Backfill any NULLs to TRUE for existing rows
    EXECUTE 'UPDATE public.events SET visible = true WHERE visible IS NULL';
  END IF;
END $$;

-- Create a public SELECT policy if missing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'events'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'events'
        AND policyname = 'Allow public read access to events'
    ) THEN
      EXECUTE $$
        CREATE POLICY "Allow public read access to events"
        ON public.events
        FOR SELECT
        TO anon, authenticated
        USING (true)
      $$;
    END IF;
  END IF;
END $$;
