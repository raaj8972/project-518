-- Add a per-event winners display mode toggle
-- photos (default): show photo cards per winner
-- list: show top-4 positions as names (supports multiple winners per position)

alter table if exists public.events
  add column if not exists winners_display_mode text
  check (winners_display_mode in ('photos','list'))
  default 'list';

-- Ensure event_winners can link to a registration when owners want to show year from registration
-- (Column may already exist; add if missing)
alter table if exists public.event_winners
  add column if not exists registration_id uuid;

-- Optionally add an index for faster lookups by event and position
create index if not exists idx_event_winners_event_pos on public.event_winners(event_id, position);
