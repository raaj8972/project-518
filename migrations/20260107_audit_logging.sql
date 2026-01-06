-- Advanced Security: Audit Logs & Owner Invisibility
-- 1. Create audit_logs table
-- 2. Create trigger to log changes automatically on key tables
-- 3. Restrict visibility to Owner only

BEGIN;

-- 1. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    table_name TEXT NOT NULL,
    record_id TEXT, -- The primary key or unique identifier of the affected record
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only Owner can see audit logs
CREATE POLICY "Owner eyes only for audit logs" 
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (public.is_owner());

-- Allow internal insertion (system level)
CREATE POLICY "Allow authenticated to insert audit logs"
    ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 2. Audit Trigger Function
CREATE OR REPLACE FUNCTION public.proc_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_record_id TEXT;
BEGIN
    -- Get current user info from Supabase session
    v_user_id := auth.uid();
    
    -- Attempt to get email from admin_users for logging
    SELECT email INTO v_user_email FROM public.admin_users WHERE user_id = v_user_id;

    -- Determine record ID (usually 'id')
    IF (TG_OP = 'DELETE') THEN
        v_record_id := CAST(OLD.id AS TEXT);
        INSERT INTO public.audit_logs (user_id, user_email, action, table_name, record_id, old_data)
        VALUES (v_user_id, v_user_email, TG_OP, TG_TABLE_NAME, v_record_id, row_to_json(OLD)::jsonb);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_record_id := CAST(NEW.id AS TEXT);
        INSERT INTO public.audit_logs (user_id, user_email, action, table_name, record_id, old_data, new_data)
        VALUES (v_user_id, v_user_email, TG_OP, TG_TABLE_NAME, v_record_id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        v_record_id := CAST(NEW.id AS TEXT);
        INSERT INTO public.audit_logs (user_id, user_email, action, table_name, record_id, new_data)
        VALUES (v_user_id, v_user_email, TG_OP, TG_TABLE_NAME, v_record_id, row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply Trigger to Key Tables
-- Events
DROP TRIGGER IF EXISTS tr_audit_events ON public.events;
CREATE TRIGGER tr_audit_events
    AFTER INSERT OR UPDATE OR DELETE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.proc_audit_log();

-- Registrations
DROP TRIGGER IF EXISTS tr_audit_registrations ON public.registrations;
CREATE TRIGGER tr_audit_registrations
    AFTER INSERT OR UPDATE OR DELETE ON public.registrations
    FOR EACH ROW EXECUTE FUNCTION public.proc_audit_log();

-- Sponsors
DROP TRIGGER IF EXISTS tr_audit_sponsors ON public.sponsors;
CREATE TRIGGER tr_audit_sponsors
    AFTER INSERT OR UPDATE OR DELETE ON public.sponsors
    FOR EACH ROW EXECUTE FUNCTION public.proc_audit_log();

-- Admin Users (Log changes to permissions/roles)
DROP TRIGGER IF EXISTS tr_audit_admin_users ON public.admin_users;
CREATE TRIGGER tr_audit_admin_users
    AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
    FOR EACH ROW EXECUTE FUNCTION public.proc_audit_log();

COMMIT;
