-- Make core_team_members fields optional to allow empty inserts from admin UI
-- This migration drops NOT NULL constraints on selected columns

begin;

alter table if exists public.core_team_members
  alter column name drop not null,
  alter column role drop not null,
  alter column image drop not null,
  alter column description drop not null,
  alter column specialty drop not null,
  alter column committee_id drop not null;

commit;
