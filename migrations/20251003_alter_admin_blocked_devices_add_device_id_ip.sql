-- Ensure device_id and ip_address columns exist on admin_blocked_devices (upgrade path)
ALTER TABLE admin_blocked_devices ADD COLUMN IF NOT EXISTS device_id text;
ALTER TABLE admin_blocked_devices ADD COLUMN IF NOT EXISTS ip_address text;
CREATE INDEX IF NOT EXISTS idx_admin_blocked_devices_device_id ON admin_blocked_devices (device_id);
CREATE INDEX IF NOT EXISTS idx_admin_blocked_devices_ip ON admin_blocked_devices (ip_address);
