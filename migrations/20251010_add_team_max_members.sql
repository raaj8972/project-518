-- Add per-event team max members limit used by Registration modal when in team mode
-- Nullable means: if NULL, fall back to global default (currently 50 in UI)
alter table if exists public.events
  add column if not exists team_max_members integer;

-- Optional safety bounds (keep values sensible). Wrap in DO block to avoid errors if already exists.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_team_max_members_bounds'
  ) then
    alter table public.events
      add constraint events_team_max_members_bounds
      check (team_max_members is null or (team_max_members >= 2 and team_max_members <= 50));
  end if;
end $$;

comment on column public.events.team_max_members is 'Max team members allowed for this event when registering as a team; NULL uses default (UI default 50).';
