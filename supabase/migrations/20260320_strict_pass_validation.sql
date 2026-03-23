-- Migration: 20260320_strict_pass_validation.sql
-- Description: Implement strict one-time use and date-specific validation for entry passes

CREATE OR REPLACE FUNCTION public.validate_entry_pass(
    p_pass_token TEXT,
    p_scanned_by TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pass RECORD;
    v_settings RECORD;
    v_current_date DATE;
    v_target_date DATE;
    v_target_date_str TEXT;
BEGIN
    -- 1. Get current date in Asia/Kolkata
    v_current_date := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::DATE;

    -- 2. Fetch pass and related info
    SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token;

    -- 3. Fetch security settings
    SELECT * INTO v_settings FROM public.security_settings LIMIT 1;

    -- 4. Initial existence check
    IF v_pass IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'reason', 'Pass not found',
            'error_code', 'not_found'
        );
    END IF;

    -- 5. Active check
    IF NOT v_pass.is_active THEN
        RETURN jsonb_build_object(
            'valid', false,
            'reason', 'Pass has been deactivated',
            'error_code', 'inactive'
        );
    END IF;

    -- 6. STRICT ONE-TIME USE CHECK
    IF v_pass.is_used THEN
        RETURN jsonb_build_object(
            'valid', false,
            'reason', 'Pass has already been used',
            'error_code', 'already_used',
            'scanned_at', v_pass.scanned_at,
            'participant_name', v_pass.participant_name
        );
    END IF;

    -- 7. DATE VALIDATION ("Not before and after")
    IF v_pass.valid_date IS NOT NULL THEN
        v_target_date := v_pass.valid_date;
    ELSIF v_pass.day_number IS NOT NULL AND v_settings.event_dates IS NOT NULL THEN
        -- PostgreSQL arrays are 1-indexed. day_number 1 -> index 1
        IF v_pass.day_number > 0 AND v_pass.day_number <= array_length(v_settings.event_dates, 1) THEN
            v_target_date_str := v_settings.event_dates[v_pass.day_number];
            IF v_target_date_str IS NOT NULL THEN
                v_target_date := v_target_date_str::DATE;
            END IF;
        END IF;
    END IF;

    -- Enforce the date restriction
    IF v_target_date IS NOT NULL THEN
        IF v_current_date < v_target_date THEN
            RETURN jsonb_build_object(
                'valid', false,
                'reason', 'Valid for ' || v_target_date || ' (Today is ' || v_current_date || ')',
                'error_code', 'invalid_date'
            );
        ELSIF v_current_date > v_target_date THEN
            RETURN jsonb_build_object(
                'valid', false,
                'reason', 'Pass expired on ' || v_target_date || ' (Today is ' || v_current_date || ')',
                'error_code', 'invalid_date'
            );
        END IF;
    END IF;

    -- 8. Success - Mark as used atomicaly
    UPDATE public.entry_passes
    SET 
        is_used = true,
        scanned_at = CURRENT_TIMESTAMP,
        scanned_by = COALESCE(p_scanned_by, scanned_by)
    WHERE id = v_pass.id;

    -- 9. Log the successful scan in pass_scans
    INSERT INTO public.pass_scans (
        pass_id,
        scanned_by_username,
        scanned_at,
        scan_result,
        participant_name,
        pass_type
    ) VALUES (
        v_pass.id,
        p_scanned_by,
        CURRENT_TIMESTAMP,
        'valid',
        v_pass.participant_name,
        v_pass.pass_type
    );

    RETURN jsonb_build_object(
        'valid', true,
        'result', 'valid',
        'name', v_pass.participant_name,
        'pass_type', v_pass.pass_type,
        'scanned_by', p_scanned_by
    );
END;
$$;

