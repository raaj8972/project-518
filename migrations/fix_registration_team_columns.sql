-- Ensure registrations table has all team registration columns
-- Safe to run multiple times

DO $$
BEGIN
  -- Add is_team_registration if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'registrations' AND column_name = 'is_team_registration'
  ) THEN
    ALTER TABLE public.registrations ADD COLUMN is_team_registration boolean DEFAULT false;
  END IF;

  -- Add team_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'registrations' AND column_name = 'team_name'
  ) THEN
    ALTER TABLE public.registrations ADD COLUMN team_name text;
  END IF;

  -- Add team_members if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'registrations' AND column_name = 'team_members'
  ) THEN
    ALTER TABLE public.registrations ADD COLUMN team_members jsonb;
  END IF;

  -- Add total_members if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'registrations' AND column_name = 'total_members'
  ) THEN
    ALTER TABLE public.registrations ADD COLUMN total_members integer DEFAULT 1;
  END IF;
END$$;
