-- Add contact fields for faculty heads and core team members
alter table if exists public.faculty_heads
  add column if not exists email text,
  add column if not exists phone text;

alter table if exists public.core_team_members
  add column if not exists phone text;
