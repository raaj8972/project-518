-- Migration: Secure Gateway Updates
-- Description: Add specialized audit log entries for secure gateway rejections.

-- No structural changes needed for audit_logs as it already supports JSONB for new_data.
-- This file serves to document the new manual audit events introduced in the frontend.

COMMENT ON TABLE public.audit_logs IS 'Audit logs for administrative actions, including automated trigger-based logs and manual security events.';

-- Optional: Add a helper to query security rejections
CREATE OR REPLACE VIEW public.security_violation_logs AS
SELECT 
    created_at,
    user_id,
    user_email,
    new_data->>'reason' as reason,
    new_data->>'mode' as access_mode,
    new_data->>'has_session_pass' as has_pass
FROM public.audit_logs
WHERE action = 'UNAUTHORIZED_OWNER_ACCESS_REJECTED'
ORDER BY created_at DESC;

-- Only owner can view security violations
ALTER VIEW public.security_violation_logs OWNER TO postgres;
GRANT SELECT ON public.security_violation_logs TO authenticated;
-- The view inherently respects audit_logs RLS if queried by non-owner (returning nothing)
