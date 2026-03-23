-- migration: migrate_events_id_to_text.sql
-- Description: Converts events.id and all foreign key references from INTEGER/BIGINT to TEXT.
-- This resolves the type mismatch where dualInsert sends string UUIDs to an integer column.

-- 1. Drop policies that depend on the event_id column
DROP POLICY IF EXISTS "Admins can insert winners" ON public.event_winners;
DROP POLICY IF EXISTS "Admins can update winners" ON public.event_winners;
DROP POLICY IF EXISTS "Admins can delete winners" ON public.event_winners;

-- 2. Drop foreign keys and constraints
ALTER TABLE IF EXISTS public.registrations DROP CONSTRAINT IF EXISTS registrations_event_id_fkey;
ALTER TABLE IF EXISTS public.schedule_events DROP CONSTRAINT IF EXISTS schedule_events_event_id_fkey;
ALTER TABLE IF EXISTS public.event_winners DROP CONSTRAINT IF EXISTS event_winners_event_id_fkey;
ALTER TABLE IF EXISTS public.event_coordinators DROP CONSTRAINT IF EXISTS event_coordinators_event_id_fkey;

-- 3. Alter column types in events table
-- Cast existing numeric IDs to text and remove SERIAL default
ALTER TABLE public.events ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE public.events ALTER COLUMN id DROP DEFAULT; 

-- 4. Alter column types in dependent tables
ALTER TABLE public.registrations ALTER COLUMN event_id TYPE TEXT USING event_id::TEXT;
ALTER TABLE public.schedule_events ALTER COLUMN event_id TYPE TEXT USING event_id::TEXT;
ALTER TABLE public.event_winners ALTER COLUMN event_id TYPE TEXT USING event_id::TEXT;
ALTER TABLE public.event_coordinators ALTER COLUMN event_id TYPE TEXT USING event_id::TEXT;

-- 5. Re-add foreign keys with ON DELETE CASCADE where appropriate
ALTER TABLE public.registrations 
  ADD CONSTRAINT registrations_event_id_fkey 
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.schedule_events
  ADD CONSTRAINT schedule_events_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

ALTER TABLE public.event_winners
  ADD CONSTRAINT event_winners_event_id_fkey 
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- 6. Re-add event_coordinators fkey
ALTER TABLE public.event_coordinators 
  ADD CONSTRAINT event_coordinators_event_id_fkey 
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- 7. Recreate policies on event_winners
CREATE POLICY "Admins can insert winners"
  ON public.event_winners FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.admin_permissions WHERE admin_permissions.user_id = auth.uid() AND admin_permissions.can_events = true)
    OR
    auth.uid() IN (
       SELECT user_id FROM public.event_coordinators
       WHERE event_id = event_winners.event_id
    )
  );

CREATE POLICY "Admins can update winners"
  ON public.event_winners FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.admin_permissions WHERE admin_permissions.user_id = auth.uid() AND admin_permissions.can_events = true)
    OR
    auth.uid() IN (
       SELECT user_id FROM public.event_coordinators
       WHERE event_id = event_winners.event_id
    )
  );

CREATE POLICY "Admins can delete winners"
  ON public.event_winners FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.admin_permissions WHERE admin_permissions.user_id = auth.uid() AND admin_permissions.can_events = true)
    OR
    auth.uid() IN (
       SELECT user_id FROM public.event_coordinators
       WHERE event_id = event_winners.event_id
    )
  );

-- 8. Add a comment to document the change
COMMENT ON COLUMN public.events.id IS 'Event ID converted to TEXT to support dual-write (Firestore UUID strings).';
