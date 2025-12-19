-- Create event_winners table
create table if not exists public.event_winners (
  id bigint generated always as identity primary key,
  event_id bigint references public.events(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete set null,
  position integer not null check (position > 0),
  name text not null,
  category text,
  year text, -- Batch or participant type info
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.event_winners enable row level security;

-- Policies
create policy "Current winners are viewable by everyone"
  on public.event_winners for select
  using (true);

create policy "Admins can insert winners"
  on public.event_winners for insert
  with check (
    exists (
      select 1 from public.admin_users
      where admin_users.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.admin_permissions
      where admin_permissions.user_id = auth.uid()
      and admin_permissions.can_events = true
    )
    or
    auth.uid() in (
       select user_id from public.event_coordinators
       where event_id = event_winners.event_id
    )
  );

create policy "Admins can update winners"
  on public.event_winners for update
  using (
    exists (
      select 1 from public.admin_users
      where admin_users.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.admin_permissions
      where admin_permissions.user_id = auth.uid()
      and admin_permissions.can_events = true
    )
    or
    auth.uid() in (
       select user_id from public.event_coordinators
       where event_id = event_winners.event_id
    )
  );

create policy "Admins can delete winners"
  on public.event_winners for delete
  using (
    exists (
      select 1 from public.admin_users
      where admin_users.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.admin_permissions
      where admin_permissions.user_id = auth.uid()
      and admin_permissions.can_events = true
    )
    or
    auth.uid() in (
       select user_id from public.event_coordinators
       where event_id = event_winners.event_id
    )
  );
