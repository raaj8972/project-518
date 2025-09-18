-- Add branding fields for dynamic logo and year on the site header
-- Safe, idempotent migration: only adds columns if missing

begin;

alter table if exists public.homepage_settings
  add column if not exists brand_logo_url text;

alter table if exists public.homepage_settings
  add column if not exists brand_year integer;

-- Seed singleton row id=1 if table exists but row missing (kept minimal)
insert into public.homepage_settings (id, hero_media_url, hero_media_type, hero_title, hero_subtitle, hero_description, sponsor_logos, sponsor_section_enabled, sponsor_section_text, featured_partners_enabled, show_faculty_heads, show_committee_heads, leadership_carousel_speed_ms, sponsors_belt_speed_px_per_sec, committee_marquee_speed_px_per_sec, sponsors_belt_direction, committee_marquee_direction)
select 1, null, 'image', 'RICORRENZA', 'Experience the Future', 'Experience the future of Healthcare, Technology, and Creativity', '[]'::jsonb, false, 'Powered by', true, true, true, 2500, 140, 75, 'left', 'right'
where not exists (select 1 from public.homepage_settings where id = 1);

-- If year not set, set it to current year for the singleton row
update public.homepage_settings set brand_year = extract(year from now())::int
where id = 1 and brand_year is null;

commit;
