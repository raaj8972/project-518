-- Add a customizable label for the registration photo field per event
alter table if exists public.events
  add column if not exists registration_photo_label text;

-- No default needed; UI will fallback when null/empty.