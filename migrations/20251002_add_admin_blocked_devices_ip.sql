-- Adds ip_address column to admin_blocked_devices for IP-based blocking.
-- Safe to run multiple times (IF NOT EXISTS guards).
ALTER TABLE admin_blocked_devices
  ADD COLUMN IF NOT EXISTS ip_address text;

CREATE INDEX IF NOT EXISTS idx_admin_blocked_devices_ip ON admin_blocked_devices (ip_address);
