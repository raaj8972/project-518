-- Migration: Create event_winners table
-- Date: 2025-09-30
-- Purpose: create the event_winners table to store winners (name, position, optional photo) per event or category.
-- Notes:
--  - event_id is nullable to support category-/track-level winners that aren't tied to a single event.
--  - A partial unique index prevents duplicate 'position' values for the same event (when event_id is present).
--  - Row Level Security (RLS) policies below are examples; adapt the admin check to your project's auth/permission model.

BEGIN;

CREATE TABLE IF NOT EXISTS public.event_winners (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id bigint REFERENCES public.events(id) ON DELETE SET NULL,
  category text,
  position integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Useful lookups
CREATE INDEX IF NOT EXISTS idx_event_winners_event_id ON public.event_winners (event_id);
CREATE INDEX IF NOT EXISTS idx_event_winners_category ON public.event_winners (category);

-- Prevent two winners from having the same position for the same event (only when event_id is set)
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_winners_event_position ON public.event_winners (event_id, position) WHERE event_id IS NOT NULL;

-- Enable Row Level Security so policies below can be applied
ALTER TABLE public.event_winners ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read winners (public). If you want to restrict reads, change the USING clause.
CREATE POLICY "EventWinners_Select" ON public.event_winners
  FOR SELECT
  USING (true);

-- Allow authenticated admin users to INSERT winners.
-- This example checks the `admin_permissions` table for a matching user_id with can_events = true.
-- Adjust the condition if your project uses a different permission model.
CREATE POLICY "EventWinners_Insert_Admins" ON public.event_winners
  FOR INSERT
  TO authenticated
  WITH CHECK (exists (
    select 1 from public.admin_permissions ap where ap.user_id = auth.uid() and ap.can_events = true
  ));

-- Allow authenticated admin users to UPDATE winners (only if they are allowed to manage events)
CREATE POLICY "EventWinners_Update_Admins" ON public.event_winners
  FOR UPDATE
  TO authenticated
  USING (exists (
    select 1 from public.admin_permissions ap where ap.user_id = auth.uid() and ap.can_events = true
  ))
  WITH CHECK (exists (
    select 1 from public.admin_permissions ap where ap.user_id = auth.uid() and ap.can_events = true
  ));

-- Allow authenticated admin users to DELETE winners
CREATE POLICY "EventWinners_Delete_Admins" ON public.event_winners
  FOR DELETE
  TO authenticated
  USING (exists (
    select 1 from public.admin_permissions ap where ap.user_id = auth.uid() and ap.can_events = true
  ));

COMMIT;
