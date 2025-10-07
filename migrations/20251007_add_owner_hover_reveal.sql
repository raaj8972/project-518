-- Migration: Add owner_hover_reveal to events
-- Date: 2025-10-07
-- Allows the site owner to enable hover reveal for a specific event (visible to owner when viewing event page)

BEGIN;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS owner_hover_reveal boolean DEFAULT false;

COMMENT ON COLUMN public.events.owner_hover_reveal IS 'When true, owner viewing the site will see the motion poster/image revealed by default (owner-only preview toggle)';

COMMIT;
