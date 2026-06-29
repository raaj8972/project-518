-- Update register_cart_event RPC to set status as 'payment_pending' if the event requires payment
CREATE OR REPLACE FUNCTION public.register_cart_event(
  p_event_id text,
  p_user_ids uuid[],
  p_team_name text,
  p_participant_details jsonb
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_max_participants integer;
  v_current_registrations integer;
  v_team_min_members integer;
  v_team_max_members integer;
  v_reg_mode_team boolean;
  v_payment_enabled boolean;
  v_payment_amount numeric;
  v_coordinator_upi_id text;
  v_already_registered_names text;
  v_members_count integer;
  v_i integer;
  v_details jsonb;
  v_new_id text;
  v_reg_count_to_add integer := 1; -- 1 group/team registration counts as 1 slot
BEGIN
  -- 1. Lock the event row for update to prevent concurrent double-booking
  SELECT 
    max_participants, 
    current_registrations, 
    team_min_members, 
    team_max_members, 
    (registration_default_mode = 'team'),
    coalesce(payment_enabled, false),
    coalesce(payment_amount, 0),
    coordinator_upi_id
  INTO 
    v_max_participants, 
    v_current_registrations, 
    v_team_min_members, 
    v_team_max_members, 
    v_reg_mode_team,
    v_payment_enabled,
    v_payment_amount,
    v_coordinator_upi_id
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  v_members_count := array_length(p_user_ids, 1);

  -- 2. Validate group size limits
  IF p_team_name IS NOT NULL OR v_reg_mode_team THEN
    IF v_team_min_members IS NOT NULL AND v_members_count < v_team_min_members THEN
      RAISE EXCEPTION 'Group size (%) is smaller than the minimum required members (%) for this event.', v_members_count, v_team_min_members;
    END IF;
    IF v_team_max_members IS NOT NULL AND v_members_count > v_team_max_members THEN
      RAISE EXCEPTION 'Group size (%) exceeds the maximum allowed members (%) for this event.', v_members_count, v_team_max_members;
    END IF;
  END IF;

  -- 3. Check for duplicates (users already registered for this event)
  SELECT string_agg(full_name, ', ')
  INTO v_already_registered_names
  FROM public.registrations
  WHERE event_id = p_event_id AND user_id = ANY(p_user_ids);

  IF v_already_registered_names IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate registration: % already registered for this event.', v_already_registered_names;
  END IF;

  -- 4. Check if event is full
  IF v_max_participants IS NOT NULL AND (v_current_registrations + v_reg_count_to_add) > v_max_participants THEN
    RAISE EXCEPTION 'Registration failed: Event is full! Limit is % teams/participants.', v_max_participants;
  END IF;

  -- 5. Perform the insertions
  FOR v_i IN 1..v_members_count LOOP
    v_details := p_participant_details->(v_i - 1);
    
    -- Generate custom registration ID
    v_new_id := 'RICO' || (floor(random() * 900000) + 100000)::text;

    INSERT INTO public.registrations (
      id,
      event_id,
      event_title,
      full_name,
      email,
      phone,
      college,
      participant_type,
      is_team_registration,
      team_name,
      total_members,
      registration_date,
      user_id,
      status
    ) VALUES (
      v_new_id,
      p_event_id,
      (SELECT title FROM public.events WHERE id = p_event_id),
      (v_details->>'full_name'),
      (v_details->>'email'),
      (v_details->>'phone'),
      (v_details->>'college'),
      (v_details->>'batch'),
      (p_team_name IS NOT NULL),
      p_team_name,
      v_members_count,
      now(),
      p_user_ids[v_i],
      CASE 
        WHEN v_payment_enabled AND v_payment_amount > 0 AND v_coordinator_upi_id IS NOT NULL THEN 'payment_pending'::text
        WHEN p_team_name IS NOT NULL THEN 'approved'::text 
        ELSE 'pending'::text 
      END
    );
  END LOOP;

  -- 6. Update current registrations count on events table
  UPDATE public.events
  SET current_registrations = current_registrations + v_reg_count_to_add
  WHERE id = p_event_id;

  RETURN jsonb_build_object('success', true, 'registered_count', v_reg_count_to_add);
END;
$$;
