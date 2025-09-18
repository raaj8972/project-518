-- Add position controls for brand logo (side + X/Y offsets)
-- Safe/idempotent: add columns only if missing and seed defaults for singleton row

begin;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_side text default 'left';

alter table if exists public.homepage_settings
  add column if not exists brand_logo_offset_x_px integer default 0;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_offset_y_px integer default 0;

-- Seed defaults on singleton row id=1 if present
update public.homepage_settings
set brand_logo_side = coalesce(brand_logo_side, 'left'),
    brand_logo_offset_x_px = coalesce(brand_logo_offset_x_px, 0),
    brand_logo_offset_y_px = coalesce(brand_logo_offset_y_px, 0)
where id = 1;

commit;
