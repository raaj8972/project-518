-- Add per-device zoom and horizontal offset for hero media
-- Desktop vs Mobile. Zoom range 0.25 - 3.0, horizontal offset range -0.5 to 0.5 (fraction of width, applied as translateX(percent)).

alter table public.hero_media
  add column if not exists desktop_zoom numeric not null default 1 check (desktop_zoom >= 0.25 and desktop_zoom <= 3),
  add column if not exists desktop_offset_x numeric not null default 0 check (desktop_offset_x >= -0.5 and desktop_offset_x <= 0.5),
  add column if not exists mobile_zoom numeric not null default 1 check (mobile_zoom >= 0.25 and mobile_zoom <= 3),
  add column if not exists mobile_offset_x numeric not null default 0 check (mobile_offset_x >= -0.5 and mobile_offset_x <= 0.5);

notify pgrst, 'reload schema';
