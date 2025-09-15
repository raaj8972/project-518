-- Add schedule fields to guest artists: performance datetime, venue, and countdown toggle
alter table if exists public.guest_artists
  add column if not exists performance_at timestamptz null,
  add column if not exists venue text null,
  add column if not exists countdown_enabled boolean default false;

comment on column public.guest_artists.performance_at is 'Scheduled performance datetime (UTC) for countdown display';
comment on column public.guest_artists.venue is 'Venue/location of the performance';
comment on column public.guest_artists.countdown_enabled is 'If true and performance_at present, show a countdown timer';
