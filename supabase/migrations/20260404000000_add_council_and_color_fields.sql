-- ============================================================
-- Migration: Add is_council and color columns to core_team_members
-- Purpose:
--   1. is_council (boolean) — marks council members distinctly
--      so they show in the "THE COUNCIL" section on Rico Family page.
--   2. color (text) — allows admin to pick a per-member theme color
--      (e.g. "emerald" for Treasurer, "red" for General Secretary).
--      Consumed by the frontend to style cards with matching glow/border.
-- ============================================================

-- 1. Add is_council flag (default false so existing rows are unaffected)
ALTER TABLE public.core_team_members
  ADD COLUMN IF NOT EXISTS is_council boolean NOT NULL DEFAULT false;

-- 2. Add color column (nullable, defaults to NULL which means "use section default")
ALTER TABLE public.core_team_members
  ADD COLUMN IF NOT EXISTS color text DEFAULT NULL;

-- 3. Add email column (nullable)
ALTER TABLE public.core_team_members
  ADD COLUMN IF NOT EXISTS email text DEFAULT NULL;

-- 3. Grant RLS permissions (match existing policies — anon can read, authenticated can write)
-- No policy changes needed since existing RLS policies on core_team_members
-- are column-agnostic (they grant access to all columns).

-- 4. Optional: If you want to update icon/badge colors on existing council members
-- you can run something like:
-- UPDATE public.core_team_members SET is_council = true WHERE role ILIKE '%president%' OR role ILIKE '%secretary%' OR role ILIKE '%treasurer%';
