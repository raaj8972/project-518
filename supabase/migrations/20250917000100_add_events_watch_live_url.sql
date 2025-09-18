-- Add watch_live_url column to events for live streaming link
alter table public.events
  add column if not exists watch_live_url text;

comment on column public.events.watch_live_url is 'Optional live stream URL shown near start time (60m pre-live window, disabled until live).';
