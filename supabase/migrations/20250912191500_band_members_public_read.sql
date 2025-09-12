-- Ensure RLS is enabled and allow public read of enabled band members
-- Safe guards to avoid duplicate objects across repeated applies

-- Enable RLS on the table (idempotent: enabling twice is fine)
alter table if exists public.band_members enable row level security;

-- Policy: Public can select only rows where enabled = true
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'band_members'
      and policyname = 'Public read enabled band_members'
  ) then
    create policy "Public read enabled band_members"
      on public.band_members
      for select
      to public
      using (enabled = true);
  end if;
end$$;

-- Helpful index for filters and ordering
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and tablename = 'band_members' and indexname = 'band_members_enabled_order_idx'
  ) then
    create index band_members_enabled_order_idx on public.band_members (enabled, order_position);
  end if;
end$$;
