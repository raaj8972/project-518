-- SCHEMA PATCH: Fix missing elements causing frontend "No Events Found" error
-- Date: 2026-03-05

BEGIN;

-- 1. Add missing display_order to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Backfill display_order deterministically
UPDATE public.events e
SET display_order = sub.rn
FROM (
  SELECT id, row_number() OVER (ORDER BY coalesce(created_at, now()), id) as rn
  FROM public.events
) sub
WHERE e.id = sub.id AND e.display_order IS NULL;

-- Optional index
CREATE INDEX IF NOT EXISTS events_display_order_idx ON public.events (display_order ASC, id ASC);

-- 2. Create missing get_public_event_winners RPC function
-- Note: registration_id is TEXT to match the registrations table schema
CREATE OR REPLACE FUNCTION public.get_public_event_winners()
RETURNS TABLE (
  id BIGINT,
  event_id BIGINT,
  registration_id TEXT,
  "position" INTEGER,
  name TEXT,
  category TEXT,
  "year" TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ,
  registration_name TEXT,
  team_members JSONB
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    w.id,
    w.event_id,
    w.registration_id,
    w."position",
    w.name,
    w.category,
    w."year",
    w.photo_url,
    w.created_at,
    r.full_name as registration_name,
    r.team_members
  FROM public.event_winners w
  LEFT JOIN public.registrations r ON w.registration_id = r.id;
$$;

-- Grant permissions for the RPC
GRANT EXECUTE ON FUNCTION public.get_public_event_winners() TO public;
GRANT EXECUTE ON FUNCTION public.get_public_event_winners() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_event_winners() TO authenticated;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
