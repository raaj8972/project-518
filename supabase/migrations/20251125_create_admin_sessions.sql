-- Create admin_sessions table for tracking active logins
create table if not exists public.admin_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  ip_address text,
  user_agent text,
  last_seen_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.admin_sessions enable row level security;

-- Policies
-- Admins can view all sessions (to see who is logged in)
drop policy if exists "Admins can view all sessions" on public.admin_sessions;
create policy "Admins can view all sessions"
  on public.admin_sessions for select
  using (
    exists (
      select 1 from public.admin_users
      where user_id = auth.uid()
    )
  );

-- Users can insert/update their own sessions
drop policy if exists "Users can manage their own sessions" on public.admin_sessions;
create policy "Users can manage their own sessions"
  on public.admin_sessions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Function to clean up old sessions (optional, can be run via cron or trigger)
create or replace function public.cleanup_old_sessions()
returns void as $$
begin
  delete from public.admin_sessions
  where last_seen_at < now() - interval '24 hours';
end;
$$ language plpgsql security definer;
