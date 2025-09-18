-- Add admin controls for brand logo size and glow strength
-- Safe/idempotent: only adds columns if missing; sets reasonable defaults

begin;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_size_px integer;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_glow_strength numeric;

-- Ensure singleton row exists (kept minimal)
insert into public.homepage_settings (id)
select 1 where not exists (select 1 from public.homepage_settings where id = 1);

-- Defaults: size = 36px, glow_strength = 1.0
update public.homepage_settings
set 
  brand_logo_size_px = coalesce(brand_logo_size_px, 36),
  brand_logo_glow_strength = coalesce(brand_logo_glow_strength, 1.0)
where id = 1;

commit;
