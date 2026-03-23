-- Fix events id column default.
-- events.id is type TEXT — so no SERIAL sequence.
-- Instead, set a UUID default so Postgres auto-generates an id when none is supplied.

ALTER TABLE events
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
