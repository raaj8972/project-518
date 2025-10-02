-- Add device_id columns to history & blocked tables (nullable backfill)
alter table if exists admin_device_sessions add column if not exists device_id text;
alter table if exists admin_blocked_devices add column if not exists device_id text;
create index if not exists idx_admin_device_sessions_device_id on admin_device_sessions(device_id);
-- No RLS changes required here (reuse existing policies).