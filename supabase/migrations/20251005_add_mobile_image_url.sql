-- Add mobile-specific image column for hero media
alter table public.hero_media
  add column if not exists mobile_image_url text;

-- Make sure PostgREST reloads schema
notify pgrst, 'reload schema';
