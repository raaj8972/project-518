-- Create admin device tracking tables (sessions + blocked devices)
-- Run before any altering migrations (e.g., ended_at addition)

-- Sessions table tracks last_seen and optional ended_at
CREATE TABLE IF NOT EXISTS admin_device_sessions (
  fingerprint text PRIMARY KEY,
  user_id uuid,
  email text,
  device_type text,
  platform text,
  browser text,
  ua text,
  last_seen timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_admin_device_sessions_last_seen ON admin_device_sessions (last_seen DESC);

-- Blocked devices (by fingerprint/device_id/ip)
CREATE TABLE IF NOT EXISTS admin_blocked_devices (
  id bigserial PRIMARY KEY,
  fingerprint text UNIQUE,
  device_id text,
  ip_address text,
  reason text,
  blocked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_blocked_devices_device_id ON admin_blocked_devices (device_id);
CREATE INDEX IF NOT EXISTS idx_admin_blocked_devices_ip ON admin_blocked_devices (ip_address);

-- (Optional) enable RLS if you plan to add policies; commented out for now.
-- ALTER TABLE admin_device_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE admin_blocked_devices ENABLE ROW LEVEL SECURITY;
-- Add policies as needed to restrict modification to admins.
