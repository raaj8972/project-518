-- Add responsive per-breakpoint offsets for brand logo (sm/md/lg), nullable
-- Safe/idempotent: add columns only if missing

begin;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_offset_x_sm_px integer;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_offset_y_sm_px integer;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_offset_x_md_px integer;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_offset_y_md_px integer;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_offset_x_lg_px integer;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_offset_y_lg_px integer;

commit;
