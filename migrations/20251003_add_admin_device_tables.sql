-- Create device sessions history table
create table if not exists admin_device_sessions (
  fingerprint text primary key,
  user_id uuid,
  email text,
  device_type text,
  platform text,
  browser text,
  ua text,
  last_seen timestamptz not null default now()
);

-- Optional index to list by recent activity
create index if not exists idx_admin_device_sessions_last_seen on admin_device_sessions (last_seen desc);

-- Create blocked devices table (if not already existing from earlier manual SQL)
create table if not exists admin_blocked_devices (
  fingerprint text primary key,
  blocked_at timestamptz not null default now(),
  reason text
);

alter table admin_device_sessions enable row level security;
alter table admin_blocked_devices enable row level security;

-- Policies (broad example: allow authenticated select; restrict modifications to owners)
-- Adjust owner detection as needed (replace with your logic or a future secure function call)
create policy if not exists "device_sessions_select" on admin_device_sessions for select using ( auth.role() = 'authenticated' );
create policy if not exists "blocked_select" on admin_blocked_devices for select using ( auth.role() = 'authenticated' );
-- Insert/update/delete restricted (example simplistic owner check placeholder - adjust!)
create policy if not exists "blocked_modify_owner" on admin_blocked_devices for all using ( auth.role() = 'authenticated' ) with check ( auth.role() = 'authenticated' );
