-- migration.sql
BEGIN;

-- 1. Add annual_sports_registration_id to entry_passes
ALTER TABLE public.entry_passes 
ADD COLUMN IF NOT EXISTS annual_sports_registration_id BIGINT REFERENCES public.annual_sports_registrations(id) ON DELETE CASCADE;

-- 2. Create a unified function for internal pass generation
CREATE OR REPLACE FUNCTION public.internal_generate_pass(
    p_registration_id UUID DEFAULT NULL,
    p_sports_registration_id BIGINT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_name TEXT;
    v_user_id UUID;
    v_pass_token TEXT;
    v_pass_id UUID;
    v_type public.pass_type := 'event_registration';
BEGIN
    IF p_registration_id IS NOT NULL THEN
        SELECT full_name, user_id INTO v_name, v_user_id
        FROM public.registrations
        WHERE id = p_registration_id;
    ELSIF p_sports_registration_id IS NOT NULL THEN
        SELECT name, user_id INTO v_name, v_user_id
        FROM public.annual_sports_registrations
        WHERE id = p_sports_registration_id;
    ELSE
        RETURN json_build_object('success', false, 'error', 'No registration ID provided');
    END IF;

    IF v_name IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Registration not found');
    END IF;

    -- Check if pass already exists
    IF EXISTS (
        SELECT 1 FROM public.entry_passes
        WHERE (event_registration_id IS NOT NULL AND event_registration_id = p_registration_id)
        OR (annual_sports_registration_id IS NOT NULL AND annual_sports_registration_id = p_sports_registration_id)
        AND is_active = true
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Pass already exists');
    END IF;

    -- Generate unique token
    v_pass_token := 'EVNT-' || upper(substring(md5(random()::text || COALESCE(p_registration_id::text, p_sports_registration_id::text)) from 1 for 12));

    -- Create pass (valid_date = NULL means valid for all event days by scanning logic)
    INSERT INTO public.entry_passes (
        pass_token,
        pass_type,
        event_registration_id,
        annual_sports_registration_id,
        participant_name,
        created_by
    )
    VALUES (
        v_pass_token,
        v_type,
        p_registration_id,
        p_sports_registration_id,
        v_name,
        v_user_id
    )
    RETURNING id INTO v_pass_id;

    RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END;
$$;

-- 3. Trigger for registrations
CREATE OR REPLACE FUNCTION public.tr_generate_pass_on_reg()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.internal_generate_pass(NEW.id, NULL);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_generate_pass_on_reg ON public.registrations;
CREATE TRIGGER trigger_generate_pass_on_reg
AFTER INSERT ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.tr_generate_pass_on_reg();

-- 4. Trigger for sports_registrations
CREATE OR REPLACE FUNCTION public.tr_generate_pass_on_sports_reg()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.internal_generate_pass(NULL, NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_generate_pass_on_sports_reg ON public.annual_sports_registrations;
CREATE TRIGGER trigger_generate_pass_on_sports_reg
AFTER INSERT ON public.annual_sports_registrations
FOR EACH ROW EXECUTE FUNCTION public.tr_generate_pass_on_sports_reg();

-- 5. Update RLS policies for students to view their own passes
DROP POLICY IF EXISTS entry_passes_own_event_registration ON public.entry_passes;
CREATE POLICY entry_passes_own_event_registration ON public.entry_passes
    FOR SELECT
    USING (
        (event_registration_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.registrations r
            WHERE r.id = entry_passes.event_registration_id
            AND r.user_id = auth.uid()
        ))
        OR
        (annual_sports_registration_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.annual_sports_registrations sr
            WHERE sr.id = entry_passes.annual_sports_registration_id
            AND sr.user_id = auth.uid()
        ))
    );

COMMIT;
