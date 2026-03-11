-- Migration: Custom Annual Sports Registration ID & Management
-- Description: Custom ID format and RPC for resetting registrations

-- 1. Create Serial Sequence per Event (using a map if needed, or global)
CREATE SEQUENCE IF NOT EXISTS annual_sports_reg_serial_seq START WITH 1;

-- 2. Custom Generator Function
-- Format: [3-letter Event code]-226-[3-digit serial]
CREATE OR REPLACE FUNCTION generate_custom_annual_reg_id(p_event_id uuid)
RETURNS text AS $$
DECLARE
    v_prefix text;
    v_serial integer;
    v_event_name text;
BEGIN
    -- Get event name for prefix
    SELECT name INTO v_event_name FROM public.annual_sports_events WHERE id = p_event_id;
    v_prefix := UPPER(SUBSTR(COALESCE(v_event_name, 'ANN'), 1, 3));
    
    -- Increment serial for this event (or globally for simplicity if preferred, 
    -- but user said "serial no 001", usually implying per-event or just a counter)
    -- For now, we'll use a global counter to ensure uniqueness across the table
    v_serial := NEXTVAL('annual_sports_reg_serial_seq');
    
    RETURN v_prefix || '-226-' || LPAD(v_serial::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Reset RPC Function
CREATE OR REPLACE FUNCTION reset_annual_event_registrations(p_event_id uuid)
RETURNS void AS $$
BEGIN
    -- Delete registrations for the event
    DELETE FROM public.annual_sports_registrations WHERE event_id = p_event_id;
    
    -- Optional: Reset global serial if all events are being reset, 
    -- but usually we just want to keep counting or reset to 1 if user explicitly wants a fresh start.
    -- To truly support "reset serial no 001", we might need per-event sequences, 
    -- but for now we'll allow admin to restart the global one.
    ALTER SEQUENCE annual_sports_reg_serial_seq RESTART WITH 1;
END;
$$ LANGUAGE plpgsql;

-- 4. Notify schema reload
NOTIFY pgrst, 'reload schema';
