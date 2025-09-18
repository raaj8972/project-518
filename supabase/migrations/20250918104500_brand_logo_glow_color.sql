-- Add admin-configurable glow color for the brand logo
-- Idempotent migration: add column if missing; set default for singleton row

begin;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_glow_color text;

-- Ensure singleton row exists
insert into public.homepage_settings (id)
select 1 where not exists (select 1 from public.homepage_settings where id = 1);

-- Default to theme magenta if null
update public.homepage_settings
set brand_logo_glow_color = coalesce(brand_logo_glow_color, '#ff00ff')
where id = 1;

commit;
