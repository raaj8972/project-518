-- Add vertical (Y) offsets for hero media framing
-- Range mirrors X offsets: -0.5 to 0.5 (fraction of height, applied as translateY)

alter table public.hero_media
  add column if not exists desktop_offset_y numeric not null default 0 check (desktop_offset_y >= -0.5 and desktop_offset_y <= 0.5),
  add column if not exists mobile_offset_y numeric not null default 0 check (mobile_offset_y >= -0.5 and mobile_offset_y <= 0.5);

notify pgrst, 'reload schema';
