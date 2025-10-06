-- Migration: Add order_position to event_categories and create reorder RPC
-- Adds a nullable integer column `order_position`, populates existing rows deterministically,
-- and creates a server-side function `reorder_event_categories(p_ids integer[])` which
-- atomically persists the ordering using a single UPDATE with ordinality.

BEGIN;

-- Add column if missing
ALTER TABLE IF EXISTS public.event_categories
  ADD COLUMN IF NOT EXISTS order_position integer;

-- Populate order_position with a deterministic order based on created_at (fallback to id)
WITH seq AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC NULLS LAST, id ASC) AS rn
  FROM public.event_categories
)
UPDATE public.event_categories e
SET order_position = seq.rn
FROM seq
WHERE e.id = seq.id
  AND (e.order_position IS NULL);

COMMIT;

-- Create a safe, atomic server-side function to persist ordering in one statement.
-- Usage: SELECT public.reorder_event_categories(ARRAY[3,1,2]);
CREATE OR REPLACE FUNCTION public.reorder_event_categories(p_ids integer[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_ids IS NULL OR array_length(p_ids,1) IS NULL THEN
    RETURN;
  END IF;

  -- Update using ordinality produced by unnest(...) WITH ORDINALITY so the order in the
  -- provided array becomes the order_position value (1-based).
  UPDATE public.event_categories AS e
  SET order_position = t.ord
  FROM (
    SELECT (unnest(p_ids))::int AS id, ord
    FROM unnest(p_ids) WITH ORDINALITY AS un(id, ord)
  ) AS t
  WHERE e.id = t.id;
END;
$$;

-- Optional: grant execute to anon or authenticated role depending on your RLS setup.
-- Example (uncomment and adapt if you manage roles here):
-- GRANT EXECUTE ON FUNCTION public.reorder_event_categories(integer[]) TO authenticated;
