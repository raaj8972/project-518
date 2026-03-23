-- Create a security_logs table for auditing bypasses and suspicious activities
CREATE TABLE IF NOT EXISTS security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- e.g., 'bypass_triggered', 'admin_access_failed', 'role_change'
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    user_id TEXT, -- Might be Firebase UID or Supabase UUID
    email TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write logs normally, or admin owners
CREATE POLICY "Admins can view security logs" ON security_logs
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM admin_users WHERE role = 'owner'
        )
    );

-- Add helpful index for performance
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at DESC);

COMMENT ON TABLE security_logs IS 'Audit log for security-sensitive operations and alerts.';
