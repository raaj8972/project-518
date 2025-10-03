-- Add mobile-specific hero media columns (safe additive migration)
alter table public.hero_media
  add column if not exists mobile_video_url text,
  add column if not exists mobile_poster_url text;

-- No additional RLS changes required (existing policies allow select/update)
notify pgrst, 'reload schema';
