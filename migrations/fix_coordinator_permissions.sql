-- Grant UPDATE permissions to anon role for Coordinator Dashboard functionality

-- 1. Allow toggling registration and updating WhatsApp links in 'events' table
DROP POLICY IF EXISTS "Allow anon to update event status" ON public.events;
CREATE POLICY "Allow anon to update event status"
  ON public.events
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Allow updating registration status (Approved/Rejected) in 'registrations' table
DROP POLICY IF EXISTS "Allow anon to update registration status" ON public.registrations;
CREATE POLICY "Allow anon to update registration status"
  ON public.registrations
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Ensure public can read events (already exists but re-asserting for clarity)
DROP POLICY IF EXISTS "Allow public read access to events" ON public.events;
CREATE POLICY "Allow public read access to events"
  ON public.events
  FOR SELECT
  TO anon, authenticated
  USING (true);
