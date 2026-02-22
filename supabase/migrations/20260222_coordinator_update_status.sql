-- Function to allow event coordinators to update registration status
CREATE OR REPLACE FUNCTION update_coordinator_registration_status(
    p_reg_id TEXT,
    p_event_id BIGINT,
    p_token TEXT,
    p_new_status TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_is_valid BOOLEAN;
    v_actual_event_id BIGINT;
BEGIN
    -- 1. Validate the coordinator token
    SELECT EXISTS (
        SELECT 1 FROM event_coordinators
        WHERE event_id = p_event_id 
        AND token = p_token
    ) INTO v_is_valid;
    
    IF NOT v_is_valid THEN
        RAISE EXCEPTION 'Invalid coordinator token for this event';
    END IF;

    -- 2. Validate the registration belongs to the event
    SELECT event_id INTO v_actual_event_id 
    FROM registrations 
    WHERE id = p_reg_id;
    
    IF v_actual_event_id IS NULL THEN
        RAISE EXCEPTION 'Registration not found';
    END IF;
    
    IF v_actual_event_id != p_event_id THEN
        RAISE EXCEPTION 'Registration does not belong to this event';
    END IF;

    -- 3. Update the status
    IF p_new_status NOT IN ('approved', 'rejected', 'pending', 'Approved', 'Rejected', 'Pending') THEN
        RAISE EXCEPTION 'Invalid status value';
    END IF;

    UPDATE registrations 
    SET status = p_new_status
    WHERE id = p_reg_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
