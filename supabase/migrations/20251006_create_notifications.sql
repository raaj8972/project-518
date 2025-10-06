-- Notifications table and RLS policies
-- This mirrors the app-level migration and ensures Supabase CLI picks it up.

-- 1) Table
create table if not exists public.notifications (
  id bigserial primary key,
  title text null,
  message text not null,
  type text not null default 'info', -- admin/owner can set any string label
  link_url text null,
  visible boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz null,
  priority int not null default 0,
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now(),
);

comment on table public.notifications is 'Admin-pushed notifications for viewer panel';
comment on column public.notifications.type is 'info | success | warning | error';

-- 2) RLS
alter table public.notifications enable row level security;

-- Make the script idempotent
drop policy if exists "Public can read active notifications" on public.notifications;
drop policy if exists "Authenticated can read notifications" on public.notifications;
drop policy if exists "Admins can insert notifications" on public.notifications;
drop policy if exists "Admins can update notifications" on public.notifications;
drop policy if exists "Admins can delete notifications" on public.notifications;

-- Allow anonymous/public to read only currently active notifications
create policy "Public can read active notifications"
  on public.notifications for select
  to anon
  using (
    visible = true
    and starts_at <= now()
    and (ends_at is null or ends_at >= now())
  );

-- Allow authenticated users (admins/owner) to read everything from the dashboard
create policy "Authenticated can read notifications"
  on public.notifications for select
  to authenticated
  using (true);

-- Write policies (owner or admin)
create policy "Admins can insert notifications"
  on public.notifications for insert
  to authenticated
  with check ( public.is_owner() or public.is_admin() );

create policy "Admins can update notifications"
  on public.notifications for update
  to authenticated
  using ( public.is_owner() or public.is_admin() )
  with check ( public.is_owner() or public.is_admin() );

create policy "Admins can delete notifications"
  on public.notifications for delete
  to authenticated
  using ( public.is_owner() or public.is_admin() );

-- 3) Helpful indexes for viewer queries
create index if not exists idx_notifications_active_window
  on public.notifications (visible, starts_at, ends_at);
