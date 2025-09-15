-- Optional: Add social_links to faculty_heads to store Instagram/YouTube (and others)
alter table if exists public.faculty_heads
  add column if not exists social_links jsonb default '{}'::jsonb;

comment on column public.faculty_heads.social_links is 'Arbitrary social links map, e.g. {"instagram": "https://instagram.com/handle", "youtube": "https://youtube.com/@channel"}';
