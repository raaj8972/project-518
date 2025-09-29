-- Migration: add/normalize about_settings label columns
-- Date: 2025-09-29
-- This script is safe to run multiple times. It will:
-- 1. If a lowercase column (trackslabel/zoneslabel) exists, rename it to the quoted camelCase form.
-- 2. If the camelCase column does not exist, add it as text.

BEGIN;

-- Ensure "zonesLabel" exists; rename lowercase if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'about_settings' AND column_name = 'zoneslabel'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'about_settings' AND column_name = 'zonesLabel'
  ) THEN
    EXECUTE 'ALTER TABLE public.about_settings RENAME COLUMN zoneslabel TO "zonesLabel"';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'about_settings' AND column_name = 'zonesLabel'
  ) THEN
    EXECUTE 'ALTER TABLE public.about_settings ADD COLUMN "zonesLabel" text';
  END IF;
END$$;

-- Ensure "tracksLabel" exists; rename lowercase if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'about_settings' AND column_name = 'trackslabel'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'about_settings' AND column_name = 'tracksLabel'
  ) THEN
    EXECUTE 'ALTER TABLE public.about_settings RENAME COLUMN trackslabel TO "tracksLabel"';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'about_settings' AND column_name = 'tracksLabel'
  ) THEN
    EXECUTE 'ALTER TABLE public.about_settings ADD COLUMN "tracksLabel" text';
  END IF;
END$$;

COMMIT;

-- Optional: verify
-- SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='about_settings' ORDER BY ordinal_position;
