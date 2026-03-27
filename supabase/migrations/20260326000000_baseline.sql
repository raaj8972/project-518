


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE TYPE "public"."admin_role" AS ENUM (
    'owner',
    'admin'
);


ALTER TYPE "public"."admin_role" OWNER TO "postgres";


CREATE TYPE "public"."announcement_target" AS ENUM (
    'all',
    'students',
    'coordinators'
);


ALTER TYPE "public"."announcement_target" OWNER TO "postgres";


CREATE TYPE "public"."pass_type" AS ENUM (
    'event_registration',
    'general_entry',
    'vip'
);


ALTER TYPE "public"."pass_type" OWNER TO "postgres";


CREATE TYPE "public"."sender_role_type" AS ENUM (
    'admin',
    'coordinator',
    'student'
);


ALTER TYPE "public"."sender_role_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_admin_by_email"("p_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
declare
  v_uid uuid;
  v_exists boolean;
  v_has_admin boolean;
  v_has_owner boolean;
  v_role public.admin_role := 'admin';
begin
  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'INVALID_EMAIL';
  end if;
  select exists(select 1 from public.admin_users) into v_has_admin;
  select exists(select 1 from public.admin_users where role = 'owner') into v_has_owner;
  -- If an owner already exists, only the owner can add more admins
  if v_has_owner and not public.is_owner() then
    raise exception 'NOT_OWNER';
  end if;
  -- If there is no owner yet (even if admins exist), promote this email to owner
  if not v_has_owner then
    v_role := 'owner';
  end if;
  select u.id into v_uid from auth.users u where lower(u.email) = lower(p_email) limit 1;
  if v_uid is null then
    raise exception 'NO_SUCH_USER';
  end if;
  select exists(select 1 from public.admin_users a where a.user_id = v_uid) into v_exists;
  if v_exists then
    return true; -- already admin, treat as success
  end if;
  insert into public.admin_users(user_id, email, role, is_primary)
  values (v_uid, p_email, v_role, (v_role = 'owner'))
  on conflict (user_id) do nothing;
  return true;
end;
$$;


ALTER FUNCTION "public"."add_admin_by_email"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_pass_registration"("p_pass_reg_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_registration RECORD;
  v_pass_id UUID;
  v_pass_token TEXT;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can approve pass registrations';
  END IF;
  
  -- Get registration
  SELECT * INTO v_registration
  FROM public.pass_registrations
  WHERE id = p_pass_reg_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pass registration not found';
  END IF;
  
  IF v_registration.status != 'pending' THEN
    RAISE EXCEPTION 'Pass registration has already been processed';
  END IF;
  
  -- Update registration status
  UPDATE public.pass_registrations
  SET status = 'approved',
      approved_by = auth.uid(),
      approved_at = NOW()
  WHERE id = p_pass_reg_id;
  
  -- Generate unique token
  v_pass_token := 'PASS-' || upper(substring(md5(random()::text || p_pass_reg_id::text) from 1 for 12));
  
  -- Create pass
  INSERT INTO public.entry_passes (
    pass_token,
    pass_type,
    pass_registration_id,
    participant_name,
    created_by
  )
  VALUES (
    v_pass_token,
    'general_entry',
    p_pass_reg_id,
    v_registration.full_name,
    auth.uid()
  )
  RETURNING id INTO v_pass_id;
  
  RETURN json_build_object(
    'success', true,
    'pass_id', v_pass_id,
    'pass_token', v_pass_token
  );
END;
$$;


ALTER FUNCTION "public"."approve_pass_registration"("p_pass_reg_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."authenticate_security_user"("p_username" "text", "p_password" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user RECORD;
  v_success BOOLEAN := false;
BEGIN
  SELECT * INTO v_user
  FROM public.security_users
  WHERE username = p_username
  AND is_active = true;
  
  IF FOUND AND v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
    v_success := true;
    PERFORM public.log_login_attempt('security', p_username, 'success');
  ELSE
    PERFORM public.log_login_attempt('security', p_username, 'failure');
  END IF;

  IF v_success THEN
    RETURN json_build_object(
      'success', true,
      'user', json_build_object(
        'id', v_user.id,
        'username', v_user.username,
        'full_name', v_user.full_name
      )
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid username or password'
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."authenticate_security_user"("p_username" "text", "p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."award_xp"("p_user_id" "uuid", "p_action" "text", "p_xp" integer, "p_meta" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_xp INTEGER;
BEGIN
  INSERT INTO public.student_activity_log (user_id, action, xp_earned, meta)
  VALUES (p_user_id, p_action, p_xp, p_meta);

  INSERT INTO public.student_xp (id, xp_total, tier)
  VALUES (p_user_id, p_xp, 'bronze')
  ON CONFLICT (id) DO UPDATE SET
    xp_total = public.student_xp.xp_total + p_xp,
    updated_at = NOW();

  SELECT xp_total INTO new_xp FROM public.student_xp WHERE id = p_user_id;
  
  UPDATE public.student_xp SET tier = 
    CASE 
      WHEN new_xp >= 1000 THEN 'elite'
      WHEN new_xp >= 500 THEN 'gold'
      WHEN new_xp >= 100 THEN 'silver'
      ELSE 'bronze'
    END
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."award_xp"("p_user_id" "uuid", "p_action" "text", "p_xp" integer, "p_meta" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_edit_site_settings"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
        SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text) 
        OR EXISTS (SELECT 1 FROM public.admin_permissions WHERE user_id = auth.uid()::text AND can_sports = true);
      $$;


ALTER FUNCTION "public"."can_edit_site_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_auth_data"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM public.purge_all_logs();
END;
$$;


ALTER FUNCTION "public"."cleanup_auth_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_messages"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.chat_messages WHERE expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_messages"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_scans"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
  -- Delete scans older than 15 days
  DELETE FROM public.pass_scans WHERE scanned_at < (NOW() - INTERVAL '15 days');
END; $$;


ALTER FUNCTION "public"."cleanup_old_scans"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_sessions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  delete from public.admin_sessions
  where last_seen_at < now() - interval '24 hours';
end;
$$;


ALTER FUNCTION "public"."cleanup_old_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_security_user"("p_username" "text", "p_password" "text", "p_full_name" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_password_hash TEXT;
  v_new_id BIGINT;
BEGIN
  -- Check if caller is owner
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND role = 'owner'
  ) INTO v_is_owner;
  
  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Only owners can create security users';
  END IF;
  
  -- Hash password (basic - in production use proper bcrypt)
  v_password_hash := crypt(p_password, gen_salt('bf'));
  
  -- Insert security user
  INSERT INTO public.security_users (username, password_hash, full_name, created_by)
  VALUES (p_username, v_password_hash, p_full_name, auth.uid())
  RETURNING id INTO v_new_id;
  
  RETURN json_build_object(
    'success', true,
    'id', v_new_id,
    'username', p_username
  );
END;
$$;


ALTER FUNCTION "public"."create_security_user"("p_username" "text", "p_password" "text", "p_full_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_vip_pass"("p_name" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text", "p_council_password" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_pass_id UUID;
  v_pass_token TEXT;
  v_settings RECORD;
BEGIN
  -- Check Admin Authorization
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Check Council Authorization fallback
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to create VIP passes'; END IF;
  
  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_by)
  VALUES (v_pass_token, 'vip', p_name, p_notes, auth.uid()) RETURNING id INTO v_pass_id;
  
  RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END; $$;


ALTER FUNCTION "public"."create_vip_pass"("p_name" "text", "p_notes" "text", "p_council_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_vip_pass_v2"("p_council_password" "text" DEFAULT NULL::"text", "p_name" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_pass_id UUID;
  v_pass_token TEXT;
  v_settings RECORD;
BEGIN
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to create VIP passes'; END IF;
  
  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_by)
  VALUES (v_pass_token, 'vip', p_name, p_notes, auth.uid()) RETURNING id INTO v_pass_id;
  
  RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END; $$;


ALTER FUNCTION "public"."create_vip_pass_v2"("p_council_password" "text", "p_name" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_vip_pass_v3"("p_council_password" "text" DEFAULT NULL::"text", "p_name" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text", "p_valid_date" "date" DEFAULT NULL::"date") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_pass_id UUID;
  v_pass_token TEXT;
  v_settings RECORD;
BEGIN
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to create VIP passes'; END IF;
  
  v_pass_token := 'VIP-' || upper(substring(md5(random()::text || NOW()::text) from 1 for 12));
  INSERT INTO public.entry_passes (pass_token, pass_type, participant_name, notes, created_by, valid_date)
  VALUES (v_pass_token, 'vip', p_name, p_notes, auth.uid(), p_valid_date) RETURNING id INTO v_pass_id;
  
  RETURN json_build_object('success', true, 'pass_id', v_pass_id, 'pass_token', v_pass_token);
END; $$;


ALTER FUNCTION "public"."create_vip_pass_v3"("p_council_password" "text", "p_name" "text", "p_notes" "text", "p_valid_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_entry_pass"("p_pass_id" "uuid", "p_council_password" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_settings RECORD;
BEGIN
  -- Check Admin Authorization
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Check Council Authorization fallback
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to delete passes'; END IF;

  DELETE FROM public.entry_passes WHERE id = p_pass_id;
  RETURN json_build_object('success', true, 'message', 'Pass deleted successfully');
END; $$;


ALTER FUNCTION "public"."delete_entry_pass"("p_pass_id" "uuid", "p_council_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_entry_pass_v2"("p_council_password" "text" DEFAULT NULL::"text", "p_pass_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_settings RECORD;
BEGIN
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings.council_password_hash IS NOT NULL AND v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to delete passes'; END IF;
  IF p_pass_id IS NULL THEN RAISE EXCEPTION 'Pass ID is required'; END IF;

  DELETE FROM public.entry_passes WHERE id = p_pass_id;
  RETURN json_build_object('success', true, 'message', 'Pass deleted successfully');
END; $$;


ALTER FUNCTION "public"."delete_entry_pass_v2"("p_council_password" "text", "p_pass_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_entry_pass_v3"("p_council_password" "text" DEFAULT NULL::"text", "p_pass_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
  v_settings RECORD;
BEGIN
  -- Admin Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  
  -- Council Check
  IF NOT v_is_authorized AND p_council_password IS NOT NULL THEN
     SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
     IF v_settings IS NULL THEN RAISE EXCEPTION 'Security settings [id=1] not found'; END IF;
     IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured in settings'; END IF;

     IF v_settings.council_password_hash = crypt(p_council_password, v_settings.council_password_hash) THEN
        v_is_authorized := true;
     END IF;
  END IF;

  IF NOT v_is_authorized THEN RAISE EXCEPTION 'Not authorized to delete passes'; END IF;
  IF p_pass_id IS NULL THEN RAISE EXCEPTION 'Pass ID is required'; END IF;

  -- 1. Delete associated scans first (Cleanup junk)
  DELETE FROM public.pass_scans WHERE pass_id = p_pass_id;

  -- 2. Hard Delete the pass
  DELETE FROM public.entry_passes WHERE id = p_pass_id;
  
  RETURN json_build_object('success', true, 'message', 'Pass and associated scans deleted permanently');
END; $$;


ALTER FUNCTION "public"."delete_entry_pass_v3"("p_council_password" "text", "p_pass_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_event_category"("p_category_id" integer, "p_fallback_name" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_removed_name text;
  v_fallback_name text;
begin
  -- Get the name of the category to remove
  select name into v_removed_name
  from event_categories
  where id = p_category_id;

  -- If category doesn't exist, nothing to do
  if v_removed_name is null then
    return;
  end if;

  -- Choose fallback: explicit param, or any other existing, else ensure 'General'
  if p_fallback_name is not null and length(trim(p_fallback_name)) > 0 then
    v_fallback_name := p_fallback_name;
  else
    select name into v_fallback_name
    from event_categories
    where id <> p_category_id
    order by name
    limit 1;
  end if;

  if v_fallback_name is null then
    -- No other category exists; ensure 'General' exists
    insert into event_categories(name, color, description)
    values ('General', '#6B7280', 'Default category')
    on conflict(name) do nothing;
    v_fallback_name := 'General';
  end if;

  -- Reassign events that reference the removed name
  update events
  set category = v_fallback_name
  where category = v_removed_name;

  -- Finally, delete the category row
  delete from event_categories where id = p_category_id;
end;
$$;


ALTER FUNCTION "public"."delete_event_category"("p_category_id" integer, "p_fallback_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_pass_registration"("p_reg_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE 
  v_is_admin BOOLEAN;
  v_pass_id UUID;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can delete registrations'; 
  END IF;

  -- Get associated pass_id
  SELECT pass_id INTO v_pass_id FROM public.pass_registrations WHERE id = p_reg_id;

  -- Delete the registration
  DELETE FROM public.pass_registrations WHERE id = p_reg_id;

  -- If there was an associated pass, delete it too (cleanup)
  IF v_pass_id IS NOT NULL THEN
     PERFORM public.delete_entry_pass(v_pass_id);
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Registration deleted successfully');
END; $$;


ALTER FUNCTION "public"."delete_pass_registration"("p_reg_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_pass_scan_for_date"("p_pass_id" "uuid", "p_date" "date") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can delete scans'; 
  END IF;

  -- Delete scans for that date, explicitly converting scanned_at to IST
  DELETE FROM public.pass_scans 
  WHERE pass_id = p_pass_id 
  AND (scanned_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = p_date;
  
  RETURN json_build_object('success', true, 'message', 'Scan deleted successfully');
END; $$;


ALTER FUNCTION "public"."delete_pass_scan_for_date"("p_pass_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_security_user"("p_user_id" integer) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can delete security users'; 
  END IF;

  -- Delete the scans by this user first to resolve FK constraints if any,
  -- but usually we want to keep audit logs.
  -- If we want to keep audits, we might need to NULL out the scanned_by_username
  -- but since it's a TEXT field in pass_scans, it doesn't strictly depend on the user ID.
  
  -- Delete the security user
  DELETE FROM public.security_users WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Security user deleted successfully');
END; $$;


ALTER FUNCTION "public"."delete_security_user"("p_user_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_annual_sports_reg_id"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN 'RICO-2' || TO_CHAR(NOW(), 'YY') || '-' || LPAD(NEXTVAL('annual_sports_reg_id_seq')::text, 4, '0');
END;
$$;


ALTER FUNCTION "public"."generate_annual_sports_reg_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_pass_for_event_registration"("p_registration_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_registration RECORD;
  v_pass_id UUID;
  v_pass_token TEXT;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can generate passes';
  END IF;
  
  -- Get registration details
  SELECT * INTO v_registration
  FROM public.registrations
  WHERE id = p_registration_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;
  
  -- Check if pass already exists
  IF EXISTS (
    SELECT 1 FROM public.entry_passes
    WHERE event_registration_id = p_registration_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Pass already exists for this registration';
  END IF;
  
  -- Generate unique token
  v_pass_token := 'EVNT-' || upper(substring(md5(random()::text || p_registration_id::text) from 1 for 12));
  
  -- Create pass
  INSERT INTO public.entry_passes (
    pass_token,
    pass_type,
    event_registration_id,
    participant_name,
    created_by
  )
  VALUES (
    v_pass_token,
    'event_registration',
    p_registration_id,
    v_registration.full_name,
    auth.uid()
  )
  RETURNING id INTO v_pass_id;
  
  RETURN json_build_object(
    'success', true,
    'pass_id', v_pass_id,
    'pass_token', v_pass_token
  );
END;
$$;


ALTER FUNCTION "public"."generate_pass_for_event_registration"("p_registration_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_council_dashboard_stats"("p_password" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  -- 2. Get Total Registrations (Pending + Approved)
  SELECT COUNT(*) INTO v_total_regs FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL;

  -- 3. Get Batch Stats
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other') ORDER BY count DESC
  ) t;

  -- 4. Get Event Stats
  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT COALESCE(e.title, r.event_title, 'General/Other') as event_name, r.participant_type, COUNT(*) as batch_count
      FROM public.registrations r LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved') AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT event_name, SUM(batch_count) as count, json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped GROUP BY event_name ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats (Robustly Filtered)
  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id -- JOIN filters out orphans
      LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
      LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (
        (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
        OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
        OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
      )
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
      LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
      AND (
        (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
        OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
        OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
      )
    )
  ) INTO v_scan_stats;

  -- 6. Get Recent Scans (Robustly Filtered)
  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.pass_type, ps.scan_result, ps.scanned_at
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id -- JOIN filters out orphans
    LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
    LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    AND (
      (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
      OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
      OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
    )
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb)
  );
END; $$;


ALTER FUNCTION "public"."get_council_dashboard_stats"("p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_council_dashboard_stats_v2"("p_password" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  -- 1. Verify Password
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL OR v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password';
  END IF;

  -- 2. Get Total Registrations
  SELECT COUNT(*) INTO v_total_regs FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL;

  -- 3. Get Batch Stats
  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other') ORDER BY count DESC
  ) t;

  -- 4. Get Event Stats
  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT COALESCE(e.title, r.event_title, 'General/Other') as event_name, r.participant_type, COUNT(*) as batch_count
      FROM public.registrations r LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved') AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT event_name, SUM(batch_count) as count, json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped GROUP BY event_name ORDER BY count DESC
  ) t;

  -- 5. Get Scan Stats
  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
      LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (
        (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
        OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
        OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
      )
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
      LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
      AND (
        (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
        OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
        OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
      )
    )
  ) INTO v_scan_stats;

  -- 6. Get Recent Scans
  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.pass_type, ps.scan_result, ps.scanned_at
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    LEFT JOIN public.registrations r ON ep.event_registration_id = r.id
    LEFT JOIN public.pass_registrations pr ON ep.pass_registration_id = pr.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    AND (
      (ep.event_registration_id IS NULL AND ep.pass_registration_id IS NULL)
      OR (ep.event_registration_id IS NOT NULL AND r.status = 'approved' AND r.deleted_at IS NULL)
      OR (ep.pass_registration_id IS NOT NULL AND pr.status = 'approved')
    )
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb)
  );
END; $$;


ALTER FUNCTION "public"."get_council_dashboard_stats_v2"("p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_council_dashboard_stats_v3"("p_password" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE 
  v_settings RECORD;
  v_total_regs INTEGER;
  v_scan_stats JSONB;
  v_batch_stats JSONB;
  v_event_stats JSONB;
  v_recent_scans JSONB;
BEGIN
  PERFORM public.cleanup_old_scans();

  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  SELECT COUNT(*) INTO v_total_regs FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL;

  SELECT json_agg(t) INTO v_batch_stats FROM (
    SELECT COALESCE(participant_type, 'Other') as batch, COUNT(*) as count
    FROM public.registrations WHERE status IN ('pending', 'approved') AND deleted_at IS NULL
    GROUP BY COALESCE(participant_type, 'Other') ORDER BY count DESC
  ) t;

  SELECT json_agg(t) INTO v_event_stats FROM (
    WITH event_grouped AS (
      SELECT COALESCE(e.title, r.event_title, 'General/Other') as event_name, r.participant_type, COUNT(*) as batch_count
      FROM public.registrations r LEFT JOIN public.events e ON r.event_id = e.id
      WHERE r.status IN ('pending', 'approved') AND r.deleted_at IS NULL
      GROUP BY COALESCE(e.title, r.event_title, 'General/Other'), r.participant_type
    )
    SELECT event_name, SUM(batch_count) as count, json_agg(json_build_object('batch', participant_type, 'count', batch_count)) as batch_breakdown
    FROM event_grouped GROUP BY event_name ORDER BY count DESC
  ) t;

  SELECT json_build_object(
    'total_valid', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
    ),
    'valid_today', (
      SELECT COUNT(*) FROM public.pass_scans ps
      JOIN public.entry_passes ep ON ps.pass_id = ep.id
      WHERE ps.scan_result = 'valid' AND ep.is_active = true
      AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
    )
  ) INTO v_scan_stats;

  SELECT json_agg(t) INTO v_recent_scans FROM (
    SELECT 
      ps.id, 
      ps.participant_name, 
      ps.pass_type, 
      ps.scan_result, 
      ps.scanned_at, 
      ps.scanned_by_username as guard_name
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    -- Hide scans if pass is hidden from council
    AND (ep.is_hidden_from_council IS FALSE OR ep.is_hidden_from_council IS NULL)
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) t;

  RETURN json_build_object(
    'total_registrations', v_total_regs,
    'batch_stats', COALESCE(v_batch_stats, '[]'::jsonb),
    'event_stats', COALESCE(v_event_stats, '[]'::jsonb),
    'scan_stats', v_scan_stats,
    'recent_scans', COALESCE(v_recent_scans, '[]'::jsonb),
    'event_dates', COALESCE(v_settings.event_dates, '[]'::jsonb)
  );
END; $$;


ALTER FUNCTION "public"."get_council_dashboard_stats_v3"("p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_council_vip_passes"("p_password" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_settings RECORD;
  v_passes JSON;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL OR v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password';
  END IF;

  SELECT json_agg(t) INTO v_passes FROM (
    SELECT id, pass_token, pass_type, participant_name, notes, is_used, is_active, created_at
    FROM public.entry_passes WHERE pass_type = 'vip'
    ORDER BY created_at DESC
  ) t;

  RETURN COALESCE(v_passes, '[]'::json);
END; $$;


ALTER FUNCTION "public"."get_council_vip_passes"("p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_council_vip_passes_v2"("p_password" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_settings RECORD;
  v_passes JSON;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE id = 1;
  IF v_settings.council_password_hash IS NULL OR v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN
     RAISE EXCEPTION 'Invalid password';
  END IF;

  SELECT json_agg(t) INTO v_passes FROM (
    SELECT id, pass_token, pass_type, participant_name, notes, is_used, is_active, created_at
    FROM public.entry_passes WHERE pass_type = 'vip'
    ORDER BY created_at DESC
  ) t;

  RETURN COALESCE(v_passes, '[]'::json);
END; $$;


ALTER FUNCTION "public"."get_council_vip_passes_v2"("p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_council_vip_passes_v3"("p_password" "text") RETURNS TABLE("pass_id" "uuid", "participant_name" "text", "pass_type" "public"."pass_type", "created_at" timestamp with time zone, "notes" "text", "pass_token" "text", "is_used" boolean, "is_active" boolean, "usage_logs" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE 
  v_settings RECORD;
BEGIN
  SELECT * INTO v_settings FROM public.security_settings WHERE security_settings.id = 1;
  IF v_settings.council_password_hash IS NULL THEN RAISE EXCEPTION 'Council access not configured'; END IF;
  IF v_settings.council_password_hash != crypt(p_password, v_settings.council_password_hash) THEN RAISE EXCEPTION 'Invalid password'; END IF;

  RETURN QUERY
  SELECT 
    ep.id AS pass_id,
    ep.participant_name,
    ep.pass_type,
    ep.created_at,
    ep.notes,
    ep.pass_token,
    ep.is_used,
    ep.is_active,
    COALESCE(
      (
        SELECT jsonb_agg(ps.scanned_at ORDER BY ps.scanned_at ASC)
        FROM public.pass_scans ps
        WHERE ps.pass_id = ep.id AND ps.scan_result = 'valid'
      ),
      '[]'::jsonb
    ) AS usage_logs
  FROM public.entry_passes ep
  WHERE ep.pass_type = 'vip' 
    AND (ep.is_hidden_from_council IS FALSE OR ep.is_hidden_from_council IS NULL)
  ORDER BY ep.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_council_vip_passes_v3"("p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_event_winners"() RETURNS TABLE("id" bigint, "event_id" bigint, "registration_id" "text", "position" integer, "name" "text", "category" "text", "year" "text", "photo_url" "text", "created_at" timestamp with time zone, "registration_name" "text", "team_members" "jsonb")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select 
    w.id,
    w.event_id,
    w.registration_id,
    w.position as "position",
    w.name,
    w.category,
    w.year,
    w.photo_url,
    w.created_at,
    r.full_name as registration_name,
    r.team_members
  from public.event_winners w
  left join public.registrations r on w.registration_id = r.id;
$$;


ALTER FUNCTION "public"."get_public_event_winners"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_security_users"() RETURNS TABLE("username" "text", "full_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    su.username,
    su.full_name
  FROM public.security_users su
  WHERE su.is_active = true
  ORDER BY su.full_name ASC;
END;
$$;


ALTER FUNCTION "public"."get_public_security_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_security_dashboard_stats"("p_username" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_today_count INTEGER;
  v_recent_scans JSON;
  v_today_ist DATE;
BEGIN
  -- Trigger background cleanup
  PERFORM public.cleanup_old_scans();

  IF NOT EXISTS (SELECT 1 FROM public.security_users WHERE username = p_username AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive security user';
  END IF;
  
  v_today_ist := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;
  
  -- Today's Count (Strictly Today)
  SELECT COUNT(*) INTO v_today_count FROM public.pass_scans ps
  JOIN public.entry_passes ep ON ps.pass_id = ep.id
  WHERE ps.scan_result = 'valid' AND ep.is_active = true
  AND (ps.scanned_at AT TIME ZONE 'Asia/Kolkata')::date = v_today_ist;
  
  -- Recent Scans (Global - Show last 10 valid scans regardless of date)
  -- Uses scanned_by_username as guard_name
  SELECT json_agg(json_build_object(
    'id', id, 
    'participant_name', participant_name, 
    'scanned_at', scanned_at, 
    'scan_result', scan_result, 
    'pass_type', pass_type,
    'guard_name', scanned_by_username 
  ))
  INTO v_recent_scans FROM (
    SELECT ps.id, ps.participant_name, ps.scanned_at, ps.scan_result, ps.pass_type, ps.scanned_by_username
    FROM public.pass_scans ps
    JOIN public.entry_passes ep ON ps.pass_id = ep.id
    WHERE ps.scan_result = 'valid' AND ep.is_active = true
    -- Hide scans if pass is hidden from council
    AND (ep.is_hidden_from_council IS FALSE OR ep.is_hidden_from_council IS NULL)
    ORDER BY ps.scanned_at DESC LIMIT 10
  ) recent;
  
  RETURN json_build_object('today_count', v_today_count, 'recent_scans', COALESCE(v_recent_scans, '[]'::json));
END; $$;


ALTER FUNCTION "public"."get_security_dashboard_stats"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id, 
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'name', 
      ''
    ), 
    COALESCE(
      new.raw_user_meta_data->>'avatar_url', 
      new.raw_user_meta_data->>'picture', 
      NULL
    )
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_pass_scan_sync"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.scan_result = 'valid' THEN
    UPDATE public.entry_passes 
    SET 
      is_used = true,
      used_at = COALESCE(NEW.scanned_at, NOW())
    WHERE id = NEW.pass_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_pass_scan_sync"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("p_section" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.admin_permissions p 
          WHERE p.user_id = auth.uid()::text 
          AND (
            CASE 
              WHEN p_section = 'can_events' THEN p.can_events
              WHEN p_section = 'can_sports' THEN p.can_sports
              WHEN p_section = 'can_registrations' THEN p.can_registrations
              ELSE false
            END
          )
        );
      $$;


ALTER FUNCTION "public"."has_permission"("p_section" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
        SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text);
      $$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_or_owner"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
        SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()::text AND (role = 'owner' OR role = 'admin'));
      $$;


ALTER FUNCTION "public"."is_admin_or_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_or_owner"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = uid);
$$;


ALTER FUNCTION "public"."is_admin_or_owner"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_coordinator"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.event_coordinators WHERE user_id = uid);
$$;


ALTER FUNCTION "public"."is_coordinator"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_owner"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()::text 
    AND role = 'owner'
  );
END;
$$;


ALTER FUNCTION "public"."is_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_scan_to_pass"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- If pass_id is missing but we have a token, look it up
  IF NEW.pass_id IS NULL AND NEW.pass_token IS NOT NULL THEN
    SELECT id INTO NEW.pass_id
    FROM public.entry_passes
    WHERE pass_token = NEW.pass_token;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."link_scan_to_pass"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_login_attempt"("p_role" "text", "p_identifier" "text", "p_status" "text" DEFAULT 'success'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.login_history (role, identifier, ip_address, user_agent, status)
  VALUES (
    p_role,
    p_identifier,
    current_setting('request.header.x-forwarded-for', true),
    current_setting('request.header.user-agent', true),
    p_status
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Login logging failed: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."log_login_attempt"("p_role" "text", "p_identifier" "text", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."login_coordinator"("event_id_param" bigint, "password_param" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  stored_pass TEXT;
  event_title TEXT;
  new_token TEXT;
  expires_at TIMESTAMPTZ;
BEGIN
  SELECT TRIM(e.coordinator_password::TEXT), e.title INTO stored_pass, event_title
  FROM events e WHERE e.id = event_id_param;
  
  IF stored_pass IS NULL OR stored_pass != password_param THEN 
    PERFORM public.log_login_attempt('coordinator', COALESCE(event_title, event_id_param::text), 'failure');
    RAISE EXCEPTION 'Invalid access code'; 
  END IF;

  new_token := gen_random_uuid()::TEXT || '-' || extract(epoch from now())::TEXT;
  expires_at := now() + interval '8 hours';
  
  UPDATE events 
  SET coordinator_session_token = new_token,
      coordinator_token_expires_at = expires_at
  WHERE id = event_id_param;

  PERFORM public.log_login_attempt('coordinator', event_title, 'success');
  
  RETURN json_build_object(
    'token', new_token,
    'expires_at', expires_at
  );
END;
$$;


ALTER FUNCTION "public"."login_coordinator"("event_id_param" bigint, "password_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."next_registration_id"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_next bigint;
BEGIN
  SELECT nextval('public.registration_id_seq') INTO v_next;
  RETURN 'RICO-' || v_next::text;
END;
$$;


ALTER FUNCTION "public"."next_registration_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_pass_scan_v3"("p_pass_token" "text", "p_guard_name" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_pass RECORD;
  v_participant_name TEXT;
  v_pass_type public.pass_type;
  v_already_scanned_today BOOLEAN := false;
BEGIN
  -- 1. Find the pass
  SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token;
  
  -- 2. Handle Invalid Token
  IF v_pass IS NULL THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, guard_name, pass_token)
    VALUES (NULL, 'system', 'invalid', p_guard_name, p_pass_token);
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Invalid Pass Token',
      'participant_name', 'Unknown',
      'pass_type', NULL
    );
  END IF;

  v_participant_name := v_pass.participant_name;
  v_pass_type := v_pass.pass_type;

  -- 3. Check if active
  IF NOT v_pass.is_active THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name, pass_token)
    VALUES (v_pass.id, 'system', 'inactive', v_participant_name, v_pass_type, p_guard_name, p_pass_token);
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Pass is Inactive',
      'participant_name', v_participant_name,
      'pass_type', v_pass_type
    );
  END IF;

  -- 4. Multi-Day / Same-Day Logic
  -- Check if this pass was already scanned TODAY (IST)
  SELECT EXISTS (
    SELECT 1 FROM public.pass_scans 
    WHERE pass_id = v_pass.id 
    AND scan_result = 'valid' 
    AND (scanned_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
  ) INTO v_already_scanned_today;

  -- Block if already scanned TODAY (prevents passing the same QR back for immediate reuse)
  IF v_already_scanned_today THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name, pass_token)
    VALUES (v_pass.id, 'system', 'already_used', v_participant_name, v_pass_type, p_guard_name, p_pass_token);
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Already Scanned Today',
      'participant_name', v_participant_name,
      'pass_type', v_pass_type
    );
  END IF;

  -- 5. Standard Pass Check (non-VIP)
  -- If not a VIP and already used on a previous day, block it.
  IF v_pass.is_used AND v_pass_type != 'vip' THEN
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name, pass_token)
    VALUES (v_pass.id, 'system', 'already_used', v_participant_name, v_pass_type, p_guard_name, p_pass_token);
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Single-Entry Pass Already Used',
      'participant_name', v_participant_name,
      'pass_type', v_pass_type
    );
  END IF;

  -- 6. Record Valid Scan
  -- The trigger 'tr_sync_pass_usage' will update entry_passes.is_used = true and used_at
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type, guard_name, pass_token)
  VALUES (v_pass.id, 'system', 'valid', v_participant_name, v_pass_type, p_guard_name, p_pass_token);

  RETURN json_build_object(
    'success', true, 
    'message', 'Valid Entry', 
    'participant_name', v_participant_name,
    'pass_type', v_pass_type
  );
END; $$;


ALTER FUNCTION "public"."process_pass_scan_v3"("p_pass_token" "text", "p_guard_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purge_all_logs"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.admin_sessions
  WHERE last_seen_at < now() - interval '48 hours';
  
  DELETE FROM public.login_history
  WHERE created_at < now() - interval '48 hours';
  
  RAISE NOTICE 'Successfully purged logs older than 48 hours';
END;
$$;


ALTER FUNCTION "public"."purge_all_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_for_event"("p_id" "text", "p_event_id" integer, "p_event_title" "text", "p_participant_type" "text", "p_full_name" "text", "p_email" "text", "p_phone" "text", "p_college" "text", "p_registration_date" timestamp with time zone, "p_is_team_registration" boolean, "p_team_name" "text", "p_team_members" "jsonb", "p_total_members" integer, "p_photo_url" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_id text := COALESCE(p_id, public.next_registration_id());
BEGIN
  INSERT INTO public.registrations(
    id,
    event_id,
    event_title,
    participant_type,
    full_name,
    email,
    phone,
    college,
    registration_date,
    status,
    is_team_registration,
    team_name,
    team_members,
    total_members,
    photo_url
  ) VALUES (
    v_id,
    p_event_id,
    p_event_title,
    p_participant_type,
    p_full_name,
    p_email,
    p_phone,
    p_college,
    COALESCE(p_registration_date, now()),
    'pending',
    COALESCE(p_is_team_registration, false),
    p_team_name,
    p_team_members,
    COALESCE(p_total_members, 1),
    p_photo_url
  );

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."register_for_event"("p_id" "text", "p_event_id" integer, "p_event_title" "text", "p_participant_type" "text", "p_full_name" "text", "p_email" "text", "p_phone" "text", "p_college" "text", "p_registration_date" timestamp with time zone, "p_is_team_registration" boolean, "p_team_name" "text", "p_team_members" "jsonb", "p_total_members" integer, "p_photo_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reorder_event_categories"("p_ids" integer[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF p_ids IS NULL OR array_length(p_ids,1) IS NULL THEN
    RETURN;
  END IF;

  -- Update using ordinality produced by unnest(...) WITH ORDINALITY so the order in the
  -- provided array becomes the order_position value (1-based).
  UPDATE public.event_categories AS e
  SET order_position = t.ord
  FROM (
    SELECT (unnest(p_ids))::int AS id, ord
    FROM unnest(p_ids) WITH ORDINALITY AS un(id, ord)
  ) AS t
  WHERE e.id = t.id;
END;
$$;


ALTER FUNCTION "public"."reorder_event_categories"("p_ids" integer[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_pass_usage"("p_pass_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can reset passes'; 
  END IF;

  -- Delete scans
  DELETE FROM public.pass_scans WHERE pass_id = p_pass_id;
  
  -- Reset pass status
  UPDATE public.entry_passes 
  SET is_used = false 
  WHERE id = p_pass_id;

  RETURN json_build_object('success', true, 'message', 'Pass usage reset successfully');
END; $$;


ALTER FUNCTION "public"."reset_pass_usage"("p_pass_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_pass_id_from_token"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If pass_id is null but token is present, find the pass
  IF NEW.pass_id IS NULL AND NEW.pass_token IS NOT NULL THEN
    SELECT id INTO NEW.pass_id FROM public.entry_passes WHERE pass_token = NEW.pass_token;
  END IF;
  
  -- If we still don't have a pass_id (e.g. invalid token), we allow the scan but mark as invalid
  IF NEW.pass_id IS NULL THEN
    NEW.scan_result := 'invalid';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."resolve_pass_id_from_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_gallery_faces"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) RETURNS TABLE("image_id" bigint, "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        gf.image_id,
        1 - (gf.embedding <=> query_embedding) AS similarity
    FROM gallery_faces gf
    WHERE 1 - (gf.embedding <=> query_embedding) > match_threshold
    ORDER BY gf.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."search_gallery_faces"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_council_password"("p_password" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE 
  v_is_admin BOOLEAN;
BEGIN
  -- Check Admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN 
    RAISE EXCEPTION 'Only admins can set council password'; 
  END IF;

  UPDATE public.security_settings
  SET council_password_hash = crypt(p_password, gen_salt('bf'))
  WHERE id = 1;

  RETURN json_build_object('success', true);
END; $$;


ALTER FUNCTION "public"."set_council_password"("p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_current_timestamp_chief_guests"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_current_timestamp_chief_guests"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end; $$;


ALTER FUNCTION "public"."set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_pass_council_visibility"("p_pass_id" "uuid", "p_hidden" boolean) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_is_authorized BOOLEAN := false;
BEGIN
  -- Admin Authorization Check
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) INTO v_is_authorized;
  IF NOT v_is_authorized THEN 
     RAISE EXCEPTION 'Not authorized'; 
  END IF;

  UPDATE public.entry_passes
  SET is_hidden_from_council = p_hidden
  WHERE id = p_pass_id;

  RETURN json_build_object('success', true, 'message', 'Visibility updated');
END;
$$;


ALTER FUNCTION "public"."toggle_pass_council_visibility"("p_pass_id" "uuid", "p_hidden" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_admin_permissions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_admin_permissions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_site_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_site_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_update_profile_likes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Increment the like count on the target profile
    UPDATE public.profiles 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.profile_id;
    
    -- Award XP to the recipient (10 XP per like received)
    PERFORM public.award_xp(NEW.profile_id, 'received_like', 10, jsonb_build_object('by', NEW.liker_id));
    
  ELSIF (TG_OP = 'DELETE') THEN
    -- Decrement the like count
    UPDATE public.profiles 
    SET likes_count = GREATEST(0, likes_count - 1) 
    WHERE id = OLD.profile_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."trg_update_profile_likes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_xp_multi_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM public.registrations
  WHERE user_id = NEW.user_id AND status IN ('pending','approved');
  IF cnt = 3 THEN
    PERFORM public.award_xp(NEW.user_id::UUID, 'multi_event_bonus', 100, NULL);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_xp_multi_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_xp_on_reg_approve"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    PERFORM public.award_xp(
      NEW.user_id::UUID,
      'event_registration_approved',
      50,
      jsonb_build_object('event_id', NEW.event_id)
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_xp_on_reg_approve"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_biometric_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_biometric_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_coordinator_registration_status"("p_reg_id" "text", "p_event_id" bigint, "p_token" "text", "p_new_status" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."update_coordinator_registration_status"("p_reg_id" "text", "p_event_id" bigint, "p_token" "text", "p_new_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_event_payment_gateway"("p_event_id" bigint, "p_token" "text", "p_new_config" "jsonb", "p_new_amount" numeric DEFAULT NULL::numeric) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_is_valid BOOLEAN;
BEGIN
    -- Validate the coordinator token using the events table
    SELECT EXISTS (
        SELECT 1 FROM public.events
        WHERE id = p_event_id 
        AND coordinator_session_token = p_token
        AND (coordinator_token_expires_at IS NULL OR coordinator_token_expires_at > now())
    ) INTO v_is_valid;
    
    IF NOT v_is_valid THEN
        RAISE EXCEPTION 'Invalid session - please login again';
    END IF;

    -- Update the event gateway settings
    UPDATE public.events
    SET 
        payment_gateway_config = p_new_config,
        payment_amount = COALESCE(p_new_amount, payment_amount)
    WHERE id = p_event_id;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."update_event_payment_gateway"("p_event_id" bigint, "p_token" "text", "p_new_config" "jsonb", "p_new_amount" numeric) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."form_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "audition_form_enabled" boolean DEFAULT true,
    "membership_form_enabled" boolean DEFAULT true,
    "audition_form_message" "text" DEFAULT 'Auditions are currently closed. Please check back later.'::"text",
    "membership_form_message" "text" DEFAULT 'Membership applications are currently closed. Please check back later.'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."form_settings" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_form_settings"("p_audition_form_enabled" boolean DEFAULT NULL::boolean, "p_audition_form_message" "text" DEFAULT NULL::"text", "p_membership_form_enabled" boolean DEFAULT NULL::boolean, "p_membership_form_message" "text" DEFAULT NULL::"text") RETURNS "public"."form_settings"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_row public.form_settings;
begin
  -- Require authentication
  if v_uid is null then
    raise exception 'not_authenticated' using hint = 'Sign in required';
  end if;

  -- Authorization: must be admin via admin_permissions or admin_users
  if not exists (select 1 from public.admin_permissions ap where ap.user_id = v_uid)
     and not exists (select 1 from public.admin_users au where au.user_id = v_uid and au.role in ('owner','admin')) then
    raise exception 'forbidden';
  end if;

  insert into public.form_settings as fs (
    id,
    audition_form_enabled,
    audition_form_message,
    membership_form_enabled,
    membership_form_message
  ) values (
    1,
    p_audition_form_enabled,
    p_audition_form_message,
    p_membership_form_enabled,
    p_membership_form_message
  )
  on conflict (id) do update set
    audition_form_enabled = coalesce(excluded.audition_form_enabled, fs.audition_form_enabled),
    audition_form_message = coalesce(excluded.audition_form_message, fs.audition_form_message),
    membership_form_enabled = coalesce(excluded.membership_form_enabled, fs.membership_form_enabled),
    membership_form_message = coalesce(excluded.membership_form_message, fs.membership_form_message)
  returning * into v_row;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."update_form_settings"("p_audition_form_enabled" boolean, "p_audition_form_message" "text", "p_membership_form_enabled" boolean, "p_membership_form_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pass_date"("p_pass_id" "uuid", "p_new_date" "date") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
  -- Check authorization (Admin only for simplicity in this context, or add Council check if needed)
  -- For now, we assume the caller application handles the UI-level permission check, 
  -- but we enforce that the user must be authenticated.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.entry_passes
  SET valid_date = p_new_date
  WHERE id = p_pass_id;

  RETURN json_build_object('success', true, 'message', 'Pass date updated');
END; $$;


ALTER FUNCTION "public"."update_pass_date"("p_pass_id" "uuid", "p_new_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_entry_pass"("p_pass_token" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE 
  v_pass RECORD; 
  v_scan_result TEXT; 
  v_username TEXT;
  v_already_scanned_today BOOLEAN;
  v_today DATE;
BEGIN
  v_username := current_user;
  v_today := CURRENT_DATE; -- Uses server date (UTC usually, ensure consistent timezone if needed)

  SELECT * INTO v_pass FROM public.entry_passes WHERE pass_token = p_pass_token;
  
  -- 1. Check if exists
  IF NOT FOUND THEN
    v_scan_result := 'invalid';
    -- Log invalid attempt
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (NULL, v_username, v_scan_result, NULL, 'general_entry'); -- logging as generic
    
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Invalid pass token');
  END IF;

  -- 2. Check if manually deactivated
  IF NOT v_pass.is_active THEN
    v_scan_result := 'inactive';
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    
    RETURN json_build_object('valid', false, 'result', v_scan_result, 'message', 'Pass has been deactivated');
  END IF;

  -- 3. Check if ALREADY SCANNED TODAY
  -- We check pass_scans table for a 'valid' scan record for this pass_id created today
  SELECT EXISTS (
    SELECT 1 FROM public.pass_scans 
    WHERE pass_id = v_pass.id 
    AND scan_result = 'valid'
    AND scanned_at::date = v_today
  ) INTO v_already_scanned_today;

  IF v_already_scanned_today THEN
    v_scan_result := 'already_used';
    
    -- Log the attempt (optional, helps track re-entry attempts)
    INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
    VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
    
    RETURN json_build_object(
      'valid', false, 
      'result', v_scan_result, 
      'message', 'Already scanned today', 
      'name', COALESCE(v_pass.participant_name, 'Unknown')
    );
  END IF;

  -- 4. VALID ENTRY
  v_scan_result := 'valid';
  
  -- Mark as used (global flag, just to show it's not "fresh" unused pass)
  UPDATE public.entry_passes SET is_used = true WHERE id = v_pass.id;
  
  -- Insert Valid Scan Record
  INSERT INTO public.pass_scans (pass_id, scanned_by_username, scan_result, participant_name, pass_type)
  VALUES (v_pass.id, v_username, v_scan_result, v_pass.participant_name, v_pass.pass_type);
  
  RETURN json_build_object(
    'valid', true, 
    'result', v_scan_result, 
    'message', 'Valid entry', 
    'name', COALESCE(v_pass.participant_name, 'VIP Guest'), 
    'pass_type', v_pass.pass_type
  );
END; $$;


ALTER FUNCTION "public"."validate_entry_pass"("p_pass_token" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."about_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "hero_title" "text",
    "hero_heading" "text",
    "hero_paragraphs" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "tracks" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "zones" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "stats" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "zonesLabel" "text",
    "tracksLabel" "text",
    CONSTRAINT "single_row" CHECK (("id" = 1))
);


ALTER TABLE "public"."about_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_messages" (
    "id" bigint NOT NULL,
    "from_user_id" "uuid" NOT NULL,
    "to_user_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_messages" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."admin_messages_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."admin_messages_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."admin_messages_id_seq" OWNED BY "public"."admin_messages"."id";



CREATE TABLE IF NOT EXISTS "public"."admin_permissions" (
    "user_id" "text" NOT NULL,
    "can_events" boolean DEFAULT false NOT NULL,
    "can_schedule" boolean DEFAULT false NOT NULL,
    "can_gallery" boolean DEFAULT false NOT NULL,
    "can_sponsors" boolean DEFAULT false NOT NULL,
    "can_registrations" boolean DEFAULT false NOT NULL,
    "can_registration_photos" boolean DEFAULT false NOT NULL,
    "can_faculty" boolean DEFAULT false NOT NULL,
    "can_core_team" boolean DEFAULT false NOT NULL,
    "can_sports" boolean DEFAULT false NOT NULL,
    "can_guest_artists" boolean DEFAULT false NOT NULL,
    "can_chief_guests" boolean DEFAULT false NOT NULL,
    "can_homebound" boolean DEFAULT false NOT NULL,
    "can_security_passes" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text" DEFAULT ''::"text"
);


ALTER TABLE "public"."admin_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_presence" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text",
    "current_page" "text",
    "last_activity_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_presence" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."admin_presence_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."admin_presence_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."admin_presence_id_seq" OWNED BY "public"."admin_presence"."id";



CREATE TABLE IF NOT EXISTS "public"."admin_sessions" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "_diag_email" "text",
    "_diag_role" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "_updated_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" "text",
    "user_agent" "text"
);


ALTER TABLE "public"."admin_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "user_id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text",
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "display_name" "text",
    "requires_approval" boolean DEFAULT false,
    "approval_enabled_by" "uuid",
    "approval_enabled_at" timestamp with time zone
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_users" IS 'Restricted table for authorized administrative access.';



CREATE TABLE IF NOT EXISTS "public"."allowed_admins" (
    "id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text",
    "display_name" "text",
    "permissions" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."allowed_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "text" "text" NOT NULL,
    "urgent" boolean DEFAULT false NOT NULL,
    "target" "public"."announcement_target" DEFAULT 'all'::"public"."announcement_target" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "sender_role" "public"."sender_role_type" DEFAULT 'admin'::"public"."sender_role_type" NOT NULL,
    "event_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "category" "text" DEFAULT 'general'::"text"
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."annual_sports_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "description" "text",
    "image_url" "text",
    "rules_url" "text",
    "fee" numeric DEFAULT 0,
    "registration_open" boolean DEFAULT true,
    "min_participants" integer DEFAULT 1,
    "max_participants" integer DEFAULT 1,
    "registration_limit" integer,
    "registration_participant_types" "text"[] DEFAULT '{Student,Faculty}'::"text"[],
    "registration_participant_quotas" "jsonb" DEFAULT '{}'::"jsonb",
    "registration_default_mode" "text" DEFAULT 'individual'::"text",
    "registration_mode_locked" boolean DEFAULT false,
    "team_min_members" integer DEFAULT 1,
    "team_max_members" integer DEFAULT 11,
    "registration_timer_enabled" boolean DEFAULT false,
    "registration_opens_at" timestamp with time zone,
    "registration_closes_at" timestamp with time zone,
    "custom_fields" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "visible" boolean DEFAULT true,
    "auction_status" "text" DEFAULT 'draft'::"text",
    "display_teams" boolean DEFAULT true,
    "display_schedule" boolean DEFAULT true,
    "require_leader_photo" boolean DEFAULT false,
    "require_team_photo" boolean DEFAULT false,
    "require_player_photo" boolean DEFAULT false,
    "require_team_individual_photos" boolean DEFAULT false
);


ALTER TABLE "public"."annual_sports_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."annual_sports_matches" (
    "id" integer NOT NULL,
    "event_id" "uuid",
    "team_a_registration_id" "uuid",
    "team_b_registration_id" "uuid",
    "match_date" "date",
    "match_time" "text",
    "venue" "text" DEFAULT 'Main Ground'::"text",
    "round" "text" DEFAULT 'Stage 1'::"text",
    "score_a" "text" DEFAULT ''::"text",
    "score_b" "text" DEFAULT ''::"text",
    "winner_registration_id" "uuid",
    "highlights" "text" DEFAULT ''::"text",
    "status" "text" DEFAULT 'upcoming'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "annual_sports_matches_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."annual_sports_matches" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."annual_sports_matches_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."annual_sports_matches_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."annual_sports_matches_id_seq" OWNED BY "public"."annual_sports_matches"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."annual_sports_reg_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."annual_sports_reg_id_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."annual_sports_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "user_id" "uuid",
    "full_name" "text",
    "email" "text",
    "phone" "text",
    "college" "text",
    "department" "text",
    "year" "text",
    "roll_no" "text",
    "participant_type" "text" DEFAULT 'Student'::"text",
    "photo_url" "text",
    "is_team_registration" boolean DEFAULT false,
    "team_name" "text",
    "team_members" "jsonb" DEFAULT '[]'::"jsonb",
    "total_members" integer DEFAULT 1,
    "status" "text" DEFAULT 'pending'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "reg_id" "text" DEFAULT "public"."generate_annual_sports_reg_id"(),
    "team_id" "uuid"
);


ALTER TABLE "public"."annual_sports_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auditions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "instrument_role" "text" NOT NULL,
    "experience_motivation" "text" DEFAULT ''::"text",
    "portfolio_link" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "participant_type" "text" DEFAULT '1st Year'::"text" NOT NULL,
    CONSTRAINT "auditions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'contacted'::"text"])))
);


ALTER TABLE "public"."auditions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."band_members" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "image" "text" NOT NULL,
    "description" "text" NOT NULL,
    "specialty" "text" NOT NULL,
    "achievements" "text"[] DEFAULT '{}'::"text"[],
    "order_position" integer DEFAULT 1,
    "enabled" boolean DEFAULT true,
    "is_featured" boolean DEFAULT false,
    "social_links" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "category" "text" DEFAULT 'Vocals'::"text" NOT NULL
);


ALTER TABLE "public"."band_members" OWNER TO "postgres";


ALTER TABLE "public"."band_members" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."band_members_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."biometric_profiles" (
    "user_id" "uuid" NOT NULL,
    "face_enrolled" boolean DEFAULT false NOT NULL,
    "fingerprint_enrolled" boolean DEFAULT false NOT NULL,
    "biometric_enabled" boolean DEFAULT true NOT NULL,
    "enrolled_at" timestamp with time zone,
    "last_auth_at" timestamp with time zone,
    "failed_attempts" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "credential_id" "text",
    "public_key" "text"
);


ALTER TABLE "public"."biometric_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "sender_role" "public"."sender_role_type" NOT NULL,
    "text" "text" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '5 days'::interval) NOT NULL
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chief_guests" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "image" "text" DEFAULT ''::"text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "specialty" "text",
    "achievements" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "social_links" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "order_position" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."chief_guests" OWNER TO "postgres";


ALTER TABLE "public"."chief_guests" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."chief_guests_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."contact_sections" (
    "id" integer NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "icon" "text" DEFAULT 'Mail'::"text" NOT NULL,
    "enabled" boolean DEFAULT true,
    "order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sponsorship_settings_id" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "contact_sections_type_check" CHECK (("type" = ANY (ARRAY['email'::"text", 'phone'::"text", 'address'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."contact_sections" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."contact_sections_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."contact_sections_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."contact_sections_id_seq" OWNED BY "public"."contact_sections"."id";



CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "coordinator_id" "uuid",
    "event_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."core_committees" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "color" "text" DEFAULT '#3B82F6'::"text" NOT NULL,
    "is_core" boolean DEFAULT false NOT NULL,
    "order_position" integer DEFAULT 1 NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."core_committees" OWNER TO "postgres";


ALTER TABLE "public"."core_committees" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."core_committees_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."core_team_members" (
    "id" bigint NOT NULL,
    "committee_id" bigint,
    "name" "text",
    "role" "text",
    "image" "text",
    "description" "text",
    "specialty" "text",
    "achievements" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "order_position" integer DEFAULT 1 NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_head" boolean DEFAULT false,
    "social_links" "jsonb" DEFAULT '{}'::"jsonb",
    "phone" "text"
);


ALTER TABLE "public"."core_team_members" OWNER TO "postgres";


ALTER TABLE "public"."core_team_members" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."core_team_members_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "registration_id" "text",
    "email_type" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "subject" "text",
    "status" "text" DEFAULT 'sent'::"text",
    "sent_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "metadata" "jsonb"
);


ALTER TABLE "public"."email_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entry_passes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pass_token" "text" NOT NULL,
    "pass_type" "text" DEFAULT 'General Admission'::"text" NOT NULL,
    "event_registration_id" "text",
    "pass_registration_id" "uuid",
    "participant_name" "text",
    "notes" "text",
    "is_used" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "used_at" timestamp with time zone,
    "valid_date" "date",
    "is_hidden_from_council" boolean DEFAULT false,
    "registration_id" "text",
    "day_number" integer DEFAULT 1,
    "scanned_at" timestamp with time zone,
    "scanned_by" "text",
    "user_id" "uuid",
    "venue" "text",
    "pass_color" "text" DEFAULT '#dc2626,#ea580c'::"text",
    "pass_notes" "text",
    "barcode_type" "text" DEFAULT 'qr'::"text",
    "student_name" "text",
    "event_title" "text",
    "batch_id" "uuid"
);


ALTER TABLE "public"."entry_passes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_categories" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#6B7280'::"text" NOT NULL,
    "description" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "order_position" integer,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_categories" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."event_categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."event_categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."event_categories_id_seq" OWNED BY "public"."event_categories"."id";



CREATE TABLE IF NOT EXISTS "public"."event_coordinators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "text",
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "email" "text",
    "role" "text" DEFAULT 'Coordinator'::"text",
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "order_position" integer DEFAULT 1
);


ALTER TABLE "public"."event_coordinators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_winners" (
    "id" bigint NOT NULL,
    "event_id" "text",
    "registration_id" "text",
    "position" integer NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "year" "text",
    "photo_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "event_winners_position_check" CHECK (("position" > 0))
);


ALTER TABLE "public"."event_winners" OWNER TO "postgres";


ALTER TABLE "public"."event_winners" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."event_winners_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "title" "text" NOT NULL,
    "category" "text" NOT NULL,
    "description" "text" NOT NULL,
    "image" "text" NOT NULL,
    "date" "text",
    "time" "text",
    "venue" "text",
    "participants" "text" NOT NULL,
    "highlights" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "registration_open" boolean DEFAULT true,
    "max_participants" integer,
    "current_registrations" integer DEFAULT 0,
    "featured" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "visible" boolean DEFAULT true,
    "rules" "text"[] DEFAULT '{}'::"text"[],
    "payment_gateway_config" "jsonb" DEFAULT '{}'::"jsonb",
    "payment_amount" numeric DEFAULT 0,
    "display_order" integer,
    "motion_poster_url" "text",
    "motion_poster_autoplay" boolean DEFAULT false,
    "watch_live_url" "text",
    "prefer_video" boolean DEFAULT false,
    "rules_link" "text",
    "owner_hover_reveal" boolean DEFAULT false,
    "coordinator_name" "text",
    "coordinator_phone" "text",
    "coordinator_password" "text",
    "whatsapp_group_link" "text",
    "registration_timer_enabled" boolean DEFAULT false,
    "registration_opens_at" timestamp with time zone,
    "registration_closes_at" timestamp with time zone,
    "registration_photo_required" boolean DEFAULT false,
    "registration_photo_label" "text",
    "registration_form_fields" "jsonb" DEFAULT '[]'::"jsonb",
    "registration_participant_types" "text"[],
    "registration_participant_quotas" "jsonb" DEFAULT '{}'::"jsonb",
    "registration_default_mode" "text" DEFAULT 'individual'::"text",
    "registration_mode_locked" boolean DEFAULT false,
    "team_max_members" integer,
    "team_min_members" integer,
    "team_required_size" integer,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "events_registration_default_mode_check" CHECK (("registration_default_mode" = ANY (ARRAY['individual'::"text", 'team'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."events"."id" IS 'Event ID converted to TEXT to support dual-write (Firestore UUID strings).';



COMMENT ON COLUMN "public"."events"."motion_poster_url" IS 'Public URL to a short looping video used as motion poster on event card front.';



COMMENT ON COLUMN "public"."events"."watch_live_url" IS 'Optional live stream URL shown near start time (60m pre-live window, disabled until live).';



COMMENT ON COLUMN "public"."events"."coordinator_name" IS 'Primary event coordinator name shown on event details.';



COMMENT ON COLUMN "public"."events"."coordinator_phone" IS 'Primary event coordinator phone shown on event details.';



COMMENT ON COLUMN "public"."events"."registration_timer_enabled" IS 'If true, UI can show countdown until registration_opens_at and "LIVE NOW" after that time.';



COMMENT ON COLUMN "public"."events"."registration_opens_at" IS 'Timestamp when registration should be considered live for UX (optional).';



CREATE SEQUENCE IF NOT EXISTS "public"."events_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."events_id_seq" OWNED BY "public"."events"."id";



CREATE TABLE IF NOT EXISTS "public"."faculty_heads" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "title" "text" NOT NULL,
    "image" "text" NOT NULL,
    "description" "text" NOT NULL,
    "achievements" "text"[] DEFAULT '{}'::"text"[],
    "order_position" integer DEFAULT 0,
    "enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    "phone" "text",
    "social_links" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."faculty_heads" OWNER TO "postgres";


COMMENT ON COLUMN "public"."faculty_heads"."social_links" IS 'Arbitrary social links map, e.g. {"instagram": "https://instagram.com/handle", "youtube": "https://youtube.com/@channel"}';



ALTER TABLE "public"."faculty_heads" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."faculty_heads_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."gallery_faces" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "image_id" bigint,
    "embedding" "public"."vector"(128) NOT NULL,
    "bounds" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."gallery_faces" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gallery_images" (
    "id" integer NOT NULL,
    "src" "text" NOT NULL,
    "category" "text" NOT NULL,
    "title" "text" NOT NULL,
    "year" "text" NOT NULL,
    "featured" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "faces_indexed" boolean DEFAULT false,
    "subcategory" "text" DEFAULT ''::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."gallery_images" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."gallery_images_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."gallery_images_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."gallery_images_id_seq" OWNED BY "public"."gallery_images"."id";



CREATE TABLE IF NOT EXISTS "public"."gallery_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "scroll_per_item" numeric DEFAULT 150 NOT NULL,
    "distance" numeric DEFAULT 200 NOT NULL,
    "background_blur_px" numeric DEFAULT 10 NOT NULL,
    "card_blur_max" numeric DEFAULT 8 NOT NULL,
    "reveal_enabled" boolean DEFAULT false NOT NULL,
    "reveal_duration_ms" integer DEFAULT 3000 NOT NULL,
    "reveal_orientation" "text" DEFAULT 'horizontal'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "gallery_settings_reveal_orientation_check" CHECK (("reveal_orientation" = ANY (ARRAY['horizontal'::"text", 'vertical'::"text"]))),
    CONSTRAINT "gallery_settings_single_row" CHECK (("id" = 1))
);


ALTER TABLE "public"."gallery_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guest_artists" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "title" "text" NOT NULL,
    "image" "text" NOT NULL,
    "video" "text",
    "description" "text" NOT NULL,
    "specialty" "text" NOT NULL,
    "achievements" "text"[] DEFAULT '{}'::"text"[],
    "social_links" "jsonb" DEFAULT '{}'::"jsonb",
    "order_position" integer DEFAULT 1,
    "enabled" boolean DEFAULT true,
    "is_featured" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "video_url" "text",
    "youtube_url" "text",
    "performance_at" timestamp with time zone,
    "venue" "text",
    "countdown_enabled" boolean DEFAULT false,
    "live_now_enabled" boolean DEFAULT true NOT NULL,
    "watch_live_url" "text"
);


ALTER TABLE "public"."guest_artists" OWNER TO "postgres";


COMMENT ON COLUMN "public"."guest_artists"."performance_at" IS 'Scheduled performance datetime (UTC) for countdown display';



COMMENT ON COLUMN "public"."guest_artists"."venue" IS 'Venue/location of the performance';



COMMENT ON COLUMN "public"."guest_artists"."countdown_enabled" IS 'If true and performance_at present, show a countdown timer';



COMMENT ON COLUMN "public"."guest_artists"."live_now_enabled" IS 'Controls whether LIVE NOW badge is shown after performance start.';



COMMENT ON COLUMN "public"."guest_artists"."watch_live_url" IS 'External URL to watch live performance (YouTube, stream, etc.).';



ALTER TABLE "public"."guest_artists" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."guest_artists_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."health_heartbeats" (
    "id" integer NOT NULL,
    "last_run" timestamp with time zone,
    "updated_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."health_heartbeats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hero_media" (
    "id" bigint NOT NULL,
    "page_key" "text" NOT NULL,
    "background_type" "text" DEFAULT 'auto'::"text" NOT NULL,
    "image_url" "text",
    "video_url" "text",
    "poster_url" "text",
    "overlay_color" "text" DEFAULT '#000000'::"text",
    "overlay_opacity" numeric DEFAULT 0.35 NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "desktop_offset_y" numeric DEFAULT 0 NOT NULL,
    "mobile_offset_y" numeric DEFAULT 0 NOT NULL,
    "desktop_zoom" numeric DEFAULT 1 NOT NULL,
    "desktop_offset_x" numeric DEFAULT 0 NOT NULL,
    "mobile_zoom" numeric DEFAULT 1 NOT NULL,
    "mobile_offset_x" numeric DEFAULT 0 NOT NULL,
    "mobile_video_url" "text",
    "mobile_poster_url" "text",
    "mobile_image_url" "text",
    CONSTRAINT "hero_media_background_type_check" CHECK (("background_type" = ANY (ARRAY['image'::"text", 'video'::"text", 'auto'::"text"]))),
    CONSTRAINT "hero_media_desktop_offset_x_check" CHECK ((("desktop_offset_x" >= '-0.5'::numeric) AND ("desktop_offset_x" <= 0.5))),
    CONSTRAINT "hero_media_desktop_offset_y_check" CHECK ((("desktop_offset_y" >= '-0.5'::numeric) AND ("desktop_offset_y" <= 0.5))),
    CONSTRAINT "hero_media_desktop_zoom_check" CHECK ((("desktop_zoom" >= 0.25) AND ("desktop_zoom" <= (3)::numeric))),
    CONSTRAINT "hero_media_mobile_offset_x_check" CHECK ((("mobile_offset_x" >= '-0.5'::numeric) AND ("mobile_offset_x" <= 0.5))),
    CONSTRAINT "hero_media_mobile_offset_y_check" CHECK ((("mobile_offset_y" >= '-0.5'::numeric) AND ("mobile_offset_y" <= 0.5))),
    CONSTRAINT "hero_media_mobile_zoom_check" CHECK ((("mobile_zoom" >= 0.25) AND ("mobile_zoom" <= (3)::numeric))),
    CONSTRAINT "hero_media_overlay_opacity_check" CHECK ((("overlay_opacity" >= (0)::numeric) AND ("overlay_opacity" <= (1)::numeric))),
    CONSTRAINT "hero_media_page_key_check" CHECK (("page_key" = ANY (ARRAY['home'::"text", 'events'::"text", 'schedule'::"text", 'gallery'::"text", 'homebound'::"text", 'ricofamily'::"text", 'sponsors'::"text"])))
);


ALTER TABLE "public"."hero_media" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."hero_media_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."hero_media_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."hero_media_id_seq" OWNED BY "public"."hero_media"."id";



CREATE TABLE IF NOT EXISTS "public"."homebound_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "instagram_url" "text",
    "instagram_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "single_row" CHECK (("id" = 1))
);


ALTER TABLE "public"."homebound_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."homepage_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "hero_media_url" "text",
    "hero_media_type" "text" DEFAULT 'image'::"text",
    "hero_title" "text" DEFAULT 'RICORRENZA'::"text",
    "hero_subtitle" "text" DEFAULT 'Experience the Future'::"text",
    "hero_description" "text" DEFAULT 'Experience the future of Healthcare, Technology, and Creativity'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sponsor_logos" "jsonb" DEFAULT '[]'::"jsonb",
    "sponsor_section_enabled" boolean DEFAULT false,
    "sponsor_section_text" "text" DEFAULT 'Powered by'::"text",
    "sponsors_belt_speed_px_per_sec" integer DEFAULT 140,
    "committee_marquee_speed_px_per_sec" integer DEFAULT 75,
    "sponsors_belt_direction" "text" DEFAULT 'left'::"text",
    "committee_marquee_direction" "text" DEFAULT 'right'::"text",
    "brand_logo_url" "text",
    "brand_year" integer,
    "brand_logo_size_px" integer,
    "brand_logo_glow_strength" numeric,
    "brand_logo_glow_color" "text",
    "brand_logo_side" "text",
    "brand_logo_offset_x_px" integer,
    "brand_logo_offset_y_px" integer,
    "brand_logo_offset_x_sm_px" integer,
    "brand_logo_offset_y_sm_px" integer,
    "brand_logo_offset_x_md_px" integer,
    "brand_logo_offset_y_md_px" integer,
    "brand_logo_offset_x_lg_px" integer,
    "brand_logo_offset_y_lg_px" integer,
    "featured_partners_enabled" boolean DEFAULT true NOT NULL,
    "show_faculty_heads" boolean DEFAULT true NOT NULL,
    "show_committee_heads" boolean DEFAULT true NOT NULL,
    "leadership_carousel_speed_ms" integer DEFAULT 5000 NOT NULL,
    "instagram_trailer_url" "text",
    "instagram_trailer_enabled" boolean DEFAULT false NOT NULL,
    "instagram_trailer_title" "text",
    "instagram_trailer_subtitle" "text",
    "instagram_aftermovie_url" "text",
    "instagram_aftermovie_enabled" boolean DEFAULT false NOT NULL,
    "instagram_aftermovie_title" "text",
    "instagram_aftermovie_subtitle" "text",
    "sponsor_section_title" "text" DEFAULT 'OUR PARTNERS'::"text",
    "sponsor_section_subtitle" "text" DEFAULT 'Powered by industry leaders who believe in our vision'::"text",
    CONSTRAINT "homepage_settings_brand_logo_side_check" CHECK (("brand_logo_side" = ANY (ARRAY['left'::"text", 'right'::"text"]))),
    CONSTRAINT "homepage_settings_committee_marquee_direction_check" CHECK (("committee_marquee_direction" = ANY (ARRAY['left'::"text", 'right'::"text"]))),
    CONSTRAINT "homepage_settings_hero_media_type_check" CHECK (("hero_media_type" = ANY (ARRAY['image'::"text", 'video'::"text"]))),
    CONSTRAINT "homepage_settings_sponsors_belt_direction_check" CHECK (("sponsors_belt_direction" = ANY (ARRAY['left'::"text", 'right'::"text"])))
);


ALTER TABLE "public"."homepage_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."login_history" (
    "id" bigint NOT NULL,
    "role" "text" NOT NULL,
    "identifier" "text",
    "ip_address" "text",
    "user_agent" "text",
    "status" "text" DEFAULT 'success'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."login_history" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."login_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."login_history_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."login_history_id_seq" OWNED BY "public"."login_history"."id";



CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "college_department" "text" NOT NULL,
    "motivation" "text" DEFAULT ''::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "participant_type" "text" DEFAULT '1st Year'::"text" NOT NULL,
    CONSTRAINT "memberships_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'accepted'::"text"])))
);


ALTER TABLE "public"."memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" bigint NOT NULL,
    "title" "text",
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text" NOT NULL,
    "link_url" "text",
    "visible" boolean DEFAULT true NOT NULL,
    "starts_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ends_at" timestamp with time zone,
    "priority" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "admin_only" boolean DEFAULT false NOT NULL,
    "auto_dismiss_seconds" integer,
    "text_color" "text",
    "glow_color" "text"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Admin-pushed notifications for viewer panel';



COMMENT ON COLUMN "public"."notifications"."type" IS 'info | success | warning | error';



CREATE SEQUENCE IF NOT EXISTS "public"."notifications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."notifications_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."notifications_id_seq" OWNED BY "public"."notifications"."id";



CREATE TABLE IF NOT EXISTS "public"."pass_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    CONSTRAINT "pass_registrations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."pass_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pass_scans" (
    "id" bigint NOT NULL,
    "pass_id" "uuid",
    "scanned_by_username" "text" NOT NULL,
    "scanned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scan_result" "text" NOT NULL,
    "participant_name" "text",
    "pass_type" "text",
    "pass_token" "text",
    "guard_name" "text",
    CONSTRAINT "pass_scans_scan_result_check" CHECK (("scan_result" = ANY (ARRAY['valid'::"text", 'already_used'::"text", 'invalid'::"text", 'inactive'::"text", 'invalid_date'::"text"])))
);


ALTER TABLE "public"."pass_scans" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."pass_scans_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pass_scans_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pass_scans_id_seq" OWNED BY "public"."pass_scans"."id";



CREATE TABLE IF NOT EXISTS "public"."passkey_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "challenge" "text" NOT NULL,
    "user_id" "text",
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:05:00'::interval),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email" "text"
);


ALTER TABLE "public"."passkey_challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."passkeys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "credential_id" "text" NOT NULL,
    "public_key" "text" NOT NULL,
    "counter" bigint DEFAULT 0,
    "transports" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_used_at" timestamp with time zone,
    "failed_attempts" integer DEFAULT 0,
    "last_attempt_at" timestamp with time zone,
    "email" "text"
);


ALTER TABLE "public"."passkeys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "liker_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."profile_likes" REPLICA IDENTITY FULL;


ALTER TABLE "public"."profile_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "college" "text",
    "batch" "text",
    "avatar_url" "text",
    "is_approved" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "_synced_at" "text",
    "participant_type" "text",
    "aura_color" "text",
    "background_url" "text",
    "bio" "text",
    "likes_count" integer DEFAULT 0
);

ALTER TABLE ONLY "public"."profiles" REPLICA IDENTITY FULL;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."registration_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."registration_id_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registrations" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "event_id" "text",
    "event_title" "text" NOT NULL,
    "participant_type" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "college" "text" NOT NULL,
    "registration_date" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "is_team_registration" boolean DEFAULT false,
    "team_name" "text",
    "team_members" "jsonb",
    "total_members" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "photo_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "_synced_at" "text",
    "team_id" "uuid",
    CONSTRAINT "registrations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roadmap_milestones" (
    "id" bigint NOT NULL,
    "year" integer NOT NULL,
    "title" "text",
    "points" "text"[] DEFAULT '{}'::"text"[],
    "order_position" integer DEFAULT 0 NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "side" "text" DEFAULT 'auto'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "roadmap_milestones_side_check" CHECK (("side" = ANY (ARRAY['auto'::"text", 'left'::"text", 'right'::"text"])))
);


ALTER TABLE "public"."roadmap_milestones" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."roadmap_milestones_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."roadmap_milestones_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."roadmap_milestones_id_seq" OWNED BY "public"."roadmap_milestones"."id";



CREATE TABLE IF NOT EXISTS "public"."schedule_days" (
    "id" integer NOT NULL,
    "date" "text" NOT NULL,
    "day" "text" NOT NULL,
    "title" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."schedule_days" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."schedule_days_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."schedule_days_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."schedule_days_id_seq" OWNED BY "public"."schedule_days"."id";



CREATE TABLE IF NOT EXISTS "public"."schedule_events" (
    "id" integer NOT NULL,
    "schedule_day_id" integer,
    "time" "text" NOT NULL,
    "title" "text" NOT NULL,
    "venue" "text" NOT NULL,
    "type" "text" NOT NULL,
    "duration" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "event_id" "text",
    "guest_artist_id" integer,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."schedule_events" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."schedule_events_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."schedule_events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."schedule_events_id_seq" OWNED BY "public"."schedule_events"."id";



CREATE TABLE IF NOT EXISTS "public"."security_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "user_id" "text",
    "email" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "security_logs_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."security_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."security_logs" IS 'Audit log for security-sensitive operations and alerts.';



CREATE TABLE IF NOT EXISTS "public"."security_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "entry_pass_button_enabled" boolean DEFAULT true,
    "event_dates" "jsonb" DEFAULT '[]'::"jsonb",
    "councils_enabled" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "council_password_hash" "text",
    "pass_template_config" "jsonb" DEFAULT '{}'::"jsonb",
    "council_passcode" "text",
    "venue" "text" DEFAULT 'Main Arena'::"text",
    "sports_passcode" "text",
    CONSTRAINT "single_row" CHECK (("id" = 1))
);


ALTER TABLE "public"."security_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."security_settings"."pass_template_config" IS 'Stores pass design configuration (background, QR position) indexed by day key';



CREATE TABLE IF NOT EXISTS "public"."security_users" (
    "id" bigint NOT NULL,
    "username" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."security_users" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."security_users_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."security_users_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."security_users_id_seq" OWNED BY "public"."security_users"."id";



CREATE TABLE IF NOT EXISTS "public"."shoutouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "is_anonymous" boolean DEFAULT true,
    "is_approved" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "shoutouts_message_check" CHECK (("char_length"("message") <= 150))
);


ALTER TABLE "public"."shoutouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_settings" (
    "id" integer NOT NULL,
    "site_closed" boolean DEFAULT false NOT NULL,
    "coming_soon_enabled" boolean DEFAULT false NOT NULL,
    "coming_soon_until" timestamp with time zone,
    "coming_soon_title" "text",
    "coming_soon_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "coming_soon_ended_text" "text",
    "sports_registration_config" "jsonb" DEFAULT '{"form_fields": [{"name": "name", "type": "text", "label": "Full Name", "required": true}, {"name": "phone", "type": "tel", "label": "Phone Number", "required": true}, {"name": "email", "type": "email", "label": "Email", "required": false}, {"name": "year", "type": "text", "label": "Year / Class", "required": true}, {"name": "position", "type": "text", "label": "Role / Position", "required": true}, {"name": "experience", "type": "textarea", "label": "Past Experience / Achievements", "required": true}], "participant_types": ["Student", "Faculty"], "registration_open": true}'::"jsonb",
    "annual_sports_mode_enabled" boolean DEFAULT false NOT NULL,
    "student_google_auth_enabled" boolean DEFAULT false,
    "registration_institution_visible" boolean DEFAULT false,
    "_synced_at" "text",
    "registration_institution_optional" boolean DEFAULT false,
    "batch_options" "jsonb" DEFAULT '[]'::"jsonb",
    "registration_participant_types" "jsonb" DEFAULT '["1st Year", "2nd Year", "3rd Year", "4th Year"]'::"jsonb",
    "registration_participant_quotas" "jsonb" DEFAULT '{}'::"jsonb",
    "chat_locked" boolean DEFAULT false NOT NULL,
    "homepage_hero_title" "text",
    "shoutouts_enabled" boolean DEFAULT true NOT NULL,
    "shoutouts_daily_limit" integer DEFAULT 3 NOT NULL,
    "shoutouts_expiry_hours" integer DEFAULT 24 NOT NULL,
    "sports_instagram_url" "text",
    CONSTRAINT "site_settings_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."site_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."site_settings"."coming_soon_ended_text" IS 'Text shown after Coming Soon countdown finishes (while site remains closed)';



COMMENT ON COLUMN "public"."site_settings"."student_google_auth_enabled" IS 'Toggle for allowing students to sign in with Google';



COMMENT ON COLUMN "public"."site_settings"."registration_institution_visible" IS 'Toggle for showing the College/Institution field in student forms';



COMMENT ON COLUMN "public"."site_settings"."_synced_at" IS 'Safeguard for Firestore metadata synchronization leakage.';



COMMENT ON COLUMN "public"."site_settings"."shoutouts_daily_limit" IS 'Max shout-outs per user in a rolling 24h window. 0 means infinite.';



COMMENT ON COLUMN "public"."site_settings"."shoutouts_expiry_hours" IS 'Duration in hours for which a shout-out remains visible on the board.';



CREATE TABLE IF NOT EXISTS "public"."social_media_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "instagram_url" "text",
    "instagram_enabled" boolean DEFAULT true,
    "youtube_url" "text",
    "youtube_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."social_media_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sponsors" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "logo" "text" NOT NULL,
    "description" "text" NOT NULL,
    "website" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "featured" boolean DEFAULT false,
    "order_position" integer DEFAULT 1,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sponsors" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sponsors_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sponsors_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sponsors_id_seq" OWNED BY "public"."sponsors"."id";



CREATE TABLE IF NOT EXISTS "public"."sponsorship_packages" (
    "id" integer NOT NULL,
    "tier" "text" NOT NULL,
    "price" "text" NOT NULL,
    "color" "text" DEFAULT 'from-gray-500 to-gray-600'::"text" NOT NULL,
    "icon" "text" DEFAULT 'Award'::"text" NOT NULL,
    "benefits" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "order_position" integer DEFAULT 1 NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sponsorship_packages" OWNER TO "postgres";


ALTER TABLE "public"."sponsorship_packages" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."sponsorship_packages_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sponsorship_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "brochure_url" "text",
    "brochure_title" "text" DEFAULT 'Download Sponsorship Brochure'::"text" NOT NULL,
    "intro_text" "text" DEFAULT 'RICORRENZA 2025 is made possible by the generous support of our sponsors.'::"text" NOT NULL,
    "call_to_action_text" "text" DEFAULT 'Interested in Sponsoring?'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "page_title" "text" DEFAULT 'OUR SPONSORS'::"text"
);


ALTER TABLE "public"."sponsorship_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sports_committees" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "color" "text" DEFAULT '#22D3EE'::"text" NOT NULL,
    "order_position" integer DEFAULT 1 NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sports_committees" OWNER TO "postgres";


ALTER TABLE "public"."sports_committees" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."sports_committees_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sports_matches" (
    "id" "text" NOT NULL,
    "sport_id" "text" NOT NULL,
    "team1_id" "text",
    "team2_id" "text",
    "match_date" timestamp with time zone NOT NULL,
    "venue" "text",
    "status" "text" DEFAULT 'scheduled'::"text",
    "winner_id" "text",
    "score1" "text",
    "score2" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "annual_event_id" "uuid",
    "annual_team_a_id" "uuid",
    "annual_team_b_id" "uuid"
);


ALTER TABLE "public"."sports_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sports_players" (
    "id" "text" NOT NULL,
    "sport_id" "text" NOT NULL,
    "team_id" "text",
    "name" "text" NOT NULL,
    "image" "text",
    "role" "text" DEFAULT 'player'::"text",
    "position" "text",
    "category" "text" DEFAULT 'emerging'::"text",
    "base_price" numeric DEFAULT 10,
    "sold_price" numeric DEFAULT 0,
    "status" "text" DEFAULT 'available'::"text",
    "is_motm_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "sold_day" integer,
    "annual_event_id" "uuid"
);


ALTER TABLE "public"."sports_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sports_registrations" (
    "id" bigint NOT NULL,
    "sport_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "year_or_class" "text",
    "institution" "text",
    "position_preference" "text",
    "experience" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "photo_url" "text",
    "user_id" "uuid",
    "_synced_at" "text",
    CONSTRAINT "sports_registrations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."sports_registrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sports_registrations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sports_registrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sports_registrations_id_seq" OWNED BY "public"."sports_registrations"."id";



CREATE TABLE IF NOT EXISTS "public"."sports_seasons" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "season" "text" NOT NULL,
    "image" "text",
    "max_teams" integer DEFAULT 8,
    "registration_open" boolean DEFAULT false,
    "auction_status" "text" DEFAULT 'draft'::"text",
    "auction_starts_at" timestamp with time zone,
    "enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "owner_registration_open" boolean DEFAULT false,
    "player_registration_open" boolean DEFAULT false,
    "max_owners" integer DEFAULT 0,
    "max_players" integer DEFAULT 0,
    "owner_fee" integer DEFAULT 0,
    "player_fee" integer DEFAULT 0,
    "auction_days" integer DEFAULT 1 NOT NULL,
    "group_limits" "jsonb"
);


ALTER TABLE "public"."sports_seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sports_team_members" (
    "id" bigint NOT NULL,
    "committee_id" bigint,
    "name" "text" NOT NULL,
    "role" "text" DEFAULT ''::"text" NOT NULL,
    "image" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "achievements" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "order_position" integer DEFAULT 1 NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "is_head" boolean DEFAULT false NOT NULL,
    "phone" "text",
    "social_links" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sports_team_members" OWNER TO "postgres";


ALTER TABLE "public"."sports_team_members" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."sports_team_members_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sports_teams" (
    "id" "text" NOT NULL,
    "sport_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "short_name" "text" NOT NULL,
    "color" "text" DEFAULT '#10b981'::"text",
    "logo" "text",
    "owner_name" "text",
    "owner_image" "text",
    "points" numeric DEFAULT 0,
    "wins" integer DEFAULT 0,
    "losses" integer DEFAULT 0,
    "draws" integer DEFAULT 0,
    "nrr" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "annual_event_id" "uuid"
);


ALTER TABLE "public"."sports_teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."storage_setup_status" (
    "id" integer DEFAULT 1 NOT NULL,
    "buckets_created" boolean DEFAULT false,
    "policies_configured" boolean DEFAULT false,
    "setup_notes" "text" DEFAULT 'Storage buckets need to be created manually in Supabase dashboard'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."storage_setup_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "xp_earned" integer DEFAULT 0,
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."student_activity_log" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."student_upcoming_events" AS
 SELECT "e"."id" AS "item_id",
    "e"."title" AS "event_title",
    "e"."date" AS "start_time",
    "e"."time" AS "end_time",
    "e"."venue",
    "r"."user_id" AS "student_id",
    'event'::"text" AS "item_type",
    "r"."status"
   FROM ("public"."events" "e"
     JOIN "public"."registrations" "r" ON (("r"."event_id" = "e"."id")))
  WHERE ("r"."status" = 'approved'::"text")
UNION ALL
 SELECT ("se"."id")::"text" AS "item_id",
    "se"."name" AS "event_title",
    NULL::"text" AS "start_time",
    NULL::"text" AS "end_time",
    NULL::"text" AS "venue",
    "sr"."user_id" AS "student_id",
    'sport'::"text" AS "item_type",
    "sr"."status"
   FROM ("public"."annual_sports_events" "se"
     JOIN "public"."annual_sports_registrations" "sr" ON (("sr"."event_id" = "se"."id")))
  WHERE ("sr"."status" = 'approved'::"text");


ALTER VIEW "public"."student_upcoming_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_xp" (
    "id" "uuid" NOT NULL,
    "xp_total" integer DEFAULT 0,
    "tier" "text" DEFAULT 'bronze'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."student_xp" REPLICA IDENTITY FULL;


ALTER TABLE "public"."student_xp" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "code" "text" NOT NULL
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_presence" (
    "user_id" "uuid" NOT NULL,
    "last_seen" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_online" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."user_presence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."validation_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rule_name" "text" NOT NULL,
    "rule_type" "text" NOT NULL,
    "pass_type" "text",
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT false,
    "priority" integer DEFAULT 0,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."validation_rules" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_profile_admirers" AS
 SELECT ("l"."profile_id")::"text" AS "target_id",
    ("l"."liker_id")::"text" AS "liker_id",
    "p"."full_name" AS "liker_name",
    "p"."avatar_url" AS "liker_avatar",
    "s"."tier" AS "liker_tier",
    "l"."created_at"
   FROM (("public"."profile_likes" "l"
     JOIN "public"."profiles" "p" ON ((("l"."liker_id")::"text" = ("p"."id")::"text")))
     LEFT JOIN "public"."student_xp" "s" ON ((("l"."liker_id")::"text" = ("s"."id")::"text")));


ALTER VIEW "public"."view_profile_admirers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_messages" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."admin_messages_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."admin_presence" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."admin_presence_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."annual_sports_matches" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."annual_sports_matches_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."contact_sections" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."contact_sections_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."event_categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."event_categories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."gallery_images" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."gallery_images_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."hero_media" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."hero_media_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."login_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."login_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."notifications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."notifications_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pass_scans" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."pass_scans_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."roadmap_milestones" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."roadmap_milestones_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."schedule_days" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."schedule_days_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."schedule_events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."schedule_events_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."security_users" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."security_users_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sponsors" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sponsors_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sports_registrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sports_registrations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."about_settings"
    ADD CONSTRAINT "about_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_messages"
    ADD CONSTRAINT "admin_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_permissions"
    ADD CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."admin_presence"
    ADD CONSTRAINT "admin_presence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_presence"
    ADD CONSTRAINT "admin_presence_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."admin_sessions"
    ADD CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_email_unique" UNIQUE ("email");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."allowed_admins"
    ADD CONSTRAINT "allowed_admins_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."allowed_admins"
    ADD CONSTRAINT "allowed_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."annual_sports_events"
    ADD CONSTRAINT "annual_sports_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."annual_sports_matches"
    ADD CONSTRAINT "annual_sports_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."annual_sports_registrations"
    ADD CONSTRAINT "annual_sports_reg_unique_email" UNIQUE ("event_id", "email");



ALTER TABLE ONLY "public"."annual_sports_registrations"
    ADD CONSTRAINT "annual_sports_reg_unique_phone" UNIQUE ("event_id", "phone");



ALTER TABLE ONLY "public"."annual_sports_registrations"
    ADD CONSTRAINT "annual_sports_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."annual_sports_registrations"
    ADD CONSTRAINT "annual_sports_registrations_reg_id_key" UNIQUE ("reg_id");



ALTER TABLE ONLY "public"."auditions"
    ADD CONSTRAINT "auditions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."band_members"
    ADD CONSTRAINT "band_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."biometric_profiles"
    ADD CONSTRAINT "biometric_profiles_credential_id_key" UNIQUE ("credential_id");



ALTER TABLE ONLY "public"."biometric_profiles"
    ADD CONSTRAINT "biometric_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chief_guests"
    ADD CONSTRAINT "chief_guests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_sections"
    ADD CONSTRAINT "contact_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."core_committees"
    ADD CONSTRAINT "core_committees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."core_team_members"
    ADD CONSTRAINT "core_team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entry_passes"
    ADD CONSTRAINT "entry_passes_pass_token_key" UNIQUE ("pass_token");



ALTER TABLE ONLY "public"."entry_passes"
    ADD CONSTRAINT "entry_passes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entry_passes"
    ADD CONSTRAINT "entry_passes_user_day_unique" UNIQUE ("user_id", "day_number");



ALTER TABLE ONLY "public"."event_categories"
    ADD CONSTRAINT "event_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."event_categories"
    ADD CONSTRAINT "event_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_coordinators"
    ADD CONSTRAINT "event_coordinators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_winners"
    ADD CONSTRAINT "event_winners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faculty_heads"
    ADD CONSTRAINT "faculty_heads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_settings"
    ADD CONSTRAINT "form_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gallery_faces"
    ADD CONSTRAINT "gallery_faces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gallery_images"
    ADD CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gallery_images"
    ADD CONSTRAINT "gallery_images_src_key" UNIQUE ("src");



ALTER TABLE ONLY "public"."gallery_settings"
    ADD CONSTRAINT "gallery_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_artists"
    ADD CONSTRAINT "guest_artists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."health_heartbeats"
    ADD CONSTRAINT "health_heartbeats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hero_media"
    ADD CONSTRAINT "hero_media_page_key_key" UNIQUE ("page_key");



ALTER TABLE ONLY "public"."hero_media"
    ADD CONSTRAINT "hero_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."homebound_settings"
    ADD CONSTRAINT "homebound_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."homepage_settings"
    ADD CONSTRAINT "homepage_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."login_history"
    ADD CONSTRAINT "login_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pass_registrations"
    ADD CONSTRAINT "pass_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pass_scans"
    ADD CONSTRAINT "pass_scans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."passkey_challenges"
    ADD CONSTRAINT "passkey_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."passkeys"
    ADD CONSTRAINT "passkeys_credential_id_key" UNIQUE ("credential_id");



ALTER TABLE ONLY "public"."passkeys"
    ADD CONSTRAINT "passkeys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_likes"
    ADD CONSTRAINT "profile_likes_liker_id_profile_id_key" UNIQUE ("liker_id", "profile_id");



ALTER TABLE ONLY "public"."profile_likes"
    ADD CONSTRAINT "profile_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roadmap_milestones"
    ADD CONSTRAINT "roadmap_milestones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_days"
    ADD CONSTRAINT "schedule_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_events"
    ADD CONSTRAINT "schedule_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_logs"
    ADD CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_settings"
    ADD CONSTRAINT "security_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_users"
    ADD CONSTRAINT "security_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_users"
    ADD CONSTRAINT "security_users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."shoutouts"
    ADD CONSTRAINT "shoutouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_media_settings"
    ADD CONSTRAINT "social_media_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sponsors"
    ADD CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sponsorship_packages"
    ADD CONSTRAINT "sponsorship_packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sponsorship_settings"
    ADD CONSTRAINT "sponsorship_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_committees"
    ADD CONSTRAINT "sports_committees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_matches"
    ADD CONSTRAINT "sports_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_players"
    ADD CONSTRAINT "sports_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_registrations"
    ADD CONSTRAINT "sports_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_seasons"
    ADD CONSTRAINT "sports_seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_team_members"
    ADD CONSTRAINT "sports_team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_teams"
    ADD CONSTRAINT "sports_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storage_setup_status"
    ADD CONSTRAINT "storage_setup_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_activity_log"
    ADD CONSTRAINT "student_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_xp"
    ADD CONSTRAINT "student_xp_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entry_passes"
    ADD CONSTRAINT "unique_registration_day_v3" UNIQUE ("registration_id", "day_number");



ALTER TABLE ONLY "public"."user_presence"
    ADD CONSTRAINT "user_presence_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."validation_rules"
    ADD CONSTRAINT "validation_rules_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "admin_users_single_owner" ON "public"."admin_users" USING "btree" ("role") WHERE ("role" = 'owner'::"text");



CREATE UNIQUE INDEX "annual_sports_reg_unique_roll_no" ON "public"."annual_sports_registrations" USING "btree" ("event_id", "roll_no") WHERE ("roll_no" IS NOT NULL);



CREATE INDEX "band_members_enabled_order_idx" ON "public"."band_members" USING "btree" ("enabled", "order_position");



CREATE INDEX "events_display_order_idx" ON "public"."events" USING "btree" ("display_order", "id");



CREATE INDEX "idx_announcements_created" ON "public"."announcements" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_announcements_event" ON "public"."announcements" USING "btree" ("event_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_announcements_target" ON "public"."announcements" USING "btree" ("target") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_biometric_profiles_credential_id" ON "public"."biometric_profiles" USING "btree" ("credential_id") WHERE ("credential_id" IS NOT NULL);



CREATE INDEX "idx_chat_messages_convo" ON "public"."chat_messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_chat_messages_created" ON "public"."chat_messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_chat_messages_expires" ON "public"."chat_messages" USING "btree" ("expires_at");



CREATE INDEX "idx_conversations_coord" ON "public"."conversations" USING "btree" ("coordinator_id");



CREATE INDEX "idx_conversations_student" ON "public"."conversations" USING "btree" ("student_id");



CREATE INDEX "idx_entry_passes_batch" ON "public"."entry_passes" USING "btree" ("batch_id");



CREATE INDEX "idx_entry_passes_day_number" ON "public"."entry_passes" USING "btree" ("day_number");



CREATE INDEX "idx_entry_passes_day_v3" ON "public"."entry_passes" USING "btree" ("day_number");



CREATE INDEX "idx_entry_passes_event_reg" ON "public"."entry_passes" USING "btree" ("event_registration_id");



CREATE INDEX "idx_entry_passes_pass_reg" ON "public"."entry_passes" USING "btree" ("pass_registration_id");



CREATE INDEX "idx_entry_passes_registration_id_v3" ON "public"."entry_passes" USING "btree" ("registration_id");



CREATE INDEX "idx_entry_passes_token" ON "public"."entry_passes" USING "btree" ("pass_token");



CREATE INDEX "idx_entry_passes_user_id" ON "public"."entry_passes" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_active_window" ON "public"."notifications" USING "btree" ("visible", "starts_at", "ends_at");



CREATE INDEX "idx_pass_registrations_email" ON "public"."pass_registrations" USING "btree" ("email");



CREATE INDEX "idx_pass_registrations_status" ON "public"."pass_registrations" USING "btree" ("status");



CREATE INDEX "idx_pass_scans_pass_id" ON "public"."pass_scans" USING "btree" ("pass_id");



CREATE INDEX "idx_pass_scans_scanned_at" ON "public"."pass_scans" USING "btree" ("scanned_at" DESC);



CREATE INDEX "idx_pass_scans_token" ON "public"."pass_scans" USING "btree" ("pass_token");



CREATE INDEX "idx_schedule_events_event_id" ON "public"."schedule_events" USING "btree" ("event_id");



CREATE INDEX "idx_schedule_events_guest_artist_id" ON "public"."schedule_events" USING "btree" ("guest_artist_id");



CREATE INDEX "idx_security_logs_created_at" ON "public"."security_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_security_logs_event_type" ON "public"."security_logs" USING "btree" ("event_type");



CREATE UNIQUE INDEX "idx_sports_committees_name_unique" ON "public"."sports_committees" USING "btree" ("lower"(TRIM(BOTH FROM "name")));



CREATE INDEX "idx_validation_rules_active" ON "public"."validation_rules" USING "btree" ("is_active");



CREATE INDEX "idx_validation_rules_type" ON "public"."validation_rules" USING "btree" ("rule_type");



CREATE INDEX "registrations_photo_url_idx" ON "public"."registrations" USING "btree" ("photo_url");



CREATE INDEX "roadmap_milestones_order_idx" ON "public"."roadmap_milestones" USING "btree" ("order_position");



CREATE INDEX "roadmap_milestones_year_idx" ON "public"."roadmap_milestones" USING "btree" ("year");



CREATE UNIQUE INDEX "uq_conv_coordinator" ON "public"."conversations" USING "btree" ("student_id", "coordinator_id", "event_id") WHERE ("coordinator_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_conv_event_student" ON "public"."conversations" USING "btree" ("student_id", "event_id") WHERE (("coordinator_id" IS NULL) AND ("event_id" IS NOT NULL));



CREATE UNIQUE INDEX "uq_conv_support" ON "public"."conversations" USING "btree" ("student_id") WHERE (("coordinator_id" IS NULL) AND ("event_id" IS NULL));



CREATE OR REPLACE TRIGGER "biometric_profiles_updated_at" BEFORE UPDATE ON "public"."biometric_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_biometric_updated_at"();



CREATE OR REPLACE TRIGGER "health_heartbeats_set_updated_at" BEFORE UPDATE ON "public"."health_heartbeats" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "homebound_settings_set_timestamp" BEFORE UPDATE ON "public"."homebound_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamp"();



CREATE OR REPLACE TRIGGER "link_scan_pass_trigger" BEFORE INSERT ON "public"."pass_scans" FOR EACH ROW EXECUTE FUNCTION "public"."link_scan_to_pass"();



CREATE OR REPLACE TRIGGER "set_timestamp_chief_guests" BEFORE UPDATE ON "public"."chief_guests" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_chief_guests"();



CREATE OR REPLACE TRIGGER "set_updated_at_sports_committees" BEFORE UPDATE ON "public"."sports_committees" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_sports_team_members" BEFORE UPDATE ON "public"."sports_team_members" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "tr_resolve_pass_id" BEFORE INSERT ON "public"."pass_scans" FOR EACH ROW EXECUTE FUNCTION "public"."resolve_pass_id_from_token"();



CREATE OR REPLACE TRIGGER "trg_admin_permissions_set_updated_at" BEFORE UPDATE ON "public"."admin_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."trg_admin_permissions_updated_at"();



CREATE OR REPLACE TRIGGER "trg_announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_chat_messages_updated_at" BEFORE UPDATE ON "public"."chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_hero_media_updated_at" BEFORE UPDATE ON "public"."hero_media" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_profile_likes" AFTER INSERT OR DELETE ON "public"."profile_likes" FOR EACH ROW EXECUTE FUNCTION "public"."trg_update_profile_likes"();



CREATE OR REPLACE TRIGGER "trg_site_settings_set_updated_at" BEFORE UPDATE ON "public"."site_settings" FOR EACH ROW EXECUTE FUNCTION "public"."trg_site_settings_updated_at"();



CREATE OR REPLACE TRIGGER "trg_xp_multi_event" AFTER INSERT ON "public"."registrations" FOR EACH ROW EXECUTE FUNCTION "public"."trg_xp_multi_event"();



CREATE OR REPLACE TRIGGER "trg_xp_registration" AFTER UPDATE ON "public"."registrations" FOR EACH ROW EXECUTE FUNCTION "public"."trg_xp_on_reg_approve"();



ALTER TABLE ONLY "public"."admin_messages"
    ADD CONSTRAINT "admin_messages_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_messages"
    ADD CONSTRAINT "admin_messages_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_presence"
    ADD CONSTRAINT "admin_presence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_sessions"
    ADD CONSTRAINT "admin_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."annual_sports_matches"
    ADD CONSTRAINT "annual_sports_matches_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."annual_sports_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."annual_sports_matches"
    ADD CONSTRAINT "annual_sports_matches_team_a_registration_id_fkey" FOREIGN KEY ("team_a_registration_id") REFERENCES "public"."annual_sports_registrations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."annual_sports_matches"
    ADD CONSTRAINT "annual_sports_matches_team_b_registration_id_fkey" FOREIGN KEY ("team_b_registration_id") REFERENCES "public"."annual_sports_registrations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."annual_sports_matches"
    ADD CONSTRAINT "annual_sports_matches_winner_registration_id_fkey" FOREIGN KEY ("winner_registration_id") REFERENCES "public"."annual_sports_registrations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."annual_sports_registrations"
    ADD CONSTRAINT "annual_sports_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."annual_sports_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."annual_sports_registrations"
    ADD CONSTRAINT "annual_sports_registrations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."annual_sports_registrations"
    ADD CONSTRAINT "annual_sports_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."biometric_profiles"
    ADD CONSTRAINT "biometric_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_sections"
    ADD CONSTRAINT "contact_sections_sponsorship_settings_id_fkey" FOREIGN KEY ("sponsorship_settings_id") REFERENCES "public"."sponsorship_settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_coordinator_id_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."core_team_members"
    ADD CONSTRAINT "core_team_members_committee_id_fkey" FOREIGN KEY ("committee_id") REFERENCES "public"."core_committees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id");



ALTER TABLE ONLY "public"."entry_passes"
    ADD CONSTRAINT "entry_passes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."entry_passes"
    ADD CONSTRAINT "entry_passes_event_registration_id_fkey" FOREIGN KEY ("event_registration_id") REFERENCES "public"."registrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entry_passes"
    ADD CONSTRAINT "entry_passes_pass_registration_id_fkey" FOREIGN KEY ("pass_registration_id") REFERENCES "public"."pass_registrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entry_passes"
    ADD CONSTRAINT "entry_passes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_coordinators"
    ADD CONSTRAINT "event_coordinators_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_coordinators"
    ADD CONSTRAINT "event_coordinators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."event_winners"
    ADD CONSTRAINT "event_winners_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_winners"
    ADD CONSTRAINT "event_winners_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gallery_faces"
    ADD CONSTRAINT "gallery_faces_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "public"."gallery_images"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pass_registrations"
    ADD CONSTRAINT "pass_registrations_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pass_scans"
    ADD CONSTRAINT "pass_scans_pass_id_fkey" FOREIGN KEY ("pass_id") REFERENCES "public"."entry_passes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_likes"
    ADD CONSTRAINT "profile_likes_liker_id_fkey" FOREIGN KEY ("liker_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_likes"
    ADD CONSTRAINT "profile_likes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."schedule_events"
    ADD CONSTRAINT "schedule_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."schedule_events"
    ADD CONSTRAINT "schedule_events_guest_artist_id_fkey" FOREIGN KEY ("guest_artist_id") REFERENCES "public"."guest_artists"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."schedule_events"
    ADD CONSTRAINT "schedule_events_schedule_day_id_fkey" FOREIGN KEY ("schedule_day_id") REFERENCES "public"."schedule_days"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_users"
    ADD CONSTRAINT "security_users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."shoutouts"
    ADD CONSTRAINT "shoutouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_matches"
    ADD CONSTRAINT "sports_matches_annual_team_a_id_fkey" FOREIGN KEY ("annual_team_a_id") REFERENCES "public"."annual_sports_registrations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sports_matches"
    ADD CONSTRAINT "sports_matches_annual_team_b_id_fkey" FOREIGN KEY ("annual_team_b_id") REFERENCES "public"."annual_sports_registrations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sports_matches"
    ADD CONSTRAINT "sports_matches_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_matches"
    ADD CONSTRAINT "sports_matches_team1_id_fkey" FOREIGN KEY ("team1_id") REFERENCES "public"."sports_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_matches"
    ADD CONSTRAINT "sports_matches_team2_id_fkey" FOREIGN KEY ("team2_id") REFERENCES "public"."sports_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_matches"
    ADD CONSTRAINT "sports_matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."sports_teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sports_players"
    ADD CONSTRAINT "sports_players_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_players"
    ADD CONSTRAINT "sports_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."sports_teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sports_registrations"
    ADD CONSTRAINT "sports_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sports_team_members"
    ADD CONSTRAINT "sports_team_members_committee_id_fkey" FOREIGN KEY ("committee_id") REFERENCES "public"."sports_committees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_teams"
    ADD CONSTRAINT "sports_teams_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_activity_log"
    ADD CONSTRAINT "student_activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_xp"
    ADD CONSTRAINT "student_xp_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_presence"
    ADD CONSTRAINT "user_presence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin Full Access" ON "public"."annual_sports_matches" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admin Manage Events" ON "public"."annual_sports_events" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admins Manage Registrations" ON "public"."annual_sports_registrations" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow admins to read email logs" ON "public"."email_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow anon to update event status" ON "public"."events" FOR UPDATE TO "anon", "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow anon to update registration status" ON "public"."registrations" FOR UPDATE TO "anon", "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated read sports registration" ON "public"."sports_registrations" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to delete auditions" ON "public"."auditions" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete contact_sections" ON "public"."contact_sections" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete core_committees" ON "public"."core_committees" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete core_team_members" ON "public"."core_team_members" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete event_categories" ON "public"."event_categories" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete events" ON "public"."events" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete faculty_heads" ON "public"."faculty_heads" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete gallery_images" ON "public"."gallery_images" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete memberships" ON "public"."memberships" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete schedule_days" ON "public"."schedule_days" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete schedule_events" ON "public"."schedule_events" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete social_media_settings" ON "public"."social_media_settings" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete sponsors" ON "public"."sponsors" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete sponsorship_packages" ON "public"."sponsorship_packages" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete sponsorship_settings" ON "public"."sponsorship_settings" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to insert contact_sections" ON "public"."contact_sections" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert core_committees" ON "public"."core_committees" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert core_team_members" ON "public"."core_team_members" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert event_categories" ON "public"."event_categories" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert events" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert faculty_heads" ON "public"."faculty_heads" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert gallery_images" ON "public"."gallery_images" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert homepage_settings" ON "public"."homepage_settings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert schedule_days" ON "public"."schedule_days" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert schedule_events" ON "public"."schedule_events" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert social_media_settings" ON "public"."social_media_settings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert sponsors" ON "public"."sponsors" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert sponsorship_packages" ON "public"."sponsorship_packages" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert sponsorship_settings" ON "public"."sponsorship_settings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to manage event_coordinators" ON "public"."event_coordinators" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update auditions" ON "public"."auditions" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update contact_sections" ON "public"."contact_sections" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update core_committees" ON "public"."core_committees" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update core_team_members" ON "public"."core_team_members" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update event_categories" ON "public"."event_categories" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update events" ON "public"."events" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update faculty_heads" ON "public"."faculty_heads" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update form_settings" ON "public"."form_settings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update gallery_images" ON "public"."gallery_images" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update homepage_settings" ON "public"."homepage_settings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update memberships" ON "public"."memberships" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update registrations" ON "public"."registrations" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update schedule_days" ON "public"."schedule_days" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update schedule_events" ON "public"."schedule_events" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update social_media_settings" ON "public"."social_media_settings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update sponsors" ON "public"."sponsors" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update sponsorship_packages" ON "public"."sponsorship_packages" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update sponsorship_settings" ON "public"."sponsorship_settings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update storage_setup_status" ON "public"."storage_setup_status" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public all sports_matches" ON "public"."sports_matches" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public all sports_players" ON "public"."sports_players" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public all sports_seasons" ON "public"."sports_seasons" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public all sports_teams" ON "public"."sports_teams" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public insert to sports_registrations" ON "public"."sports_registrations" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public read access to contact_sections" ON "public"."contact_sections" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "Allow public read access to core_committees" ON "public"."core_committees" FOR SELECT TO "anon", "authenticated" USING (("enabled" = true));



CREATE POLICY "Allow public read access to core_team_members" ON "public"."core_team_members" FOR SELECT TO "anon", "authenticated" USING (("enabled" = true));



CREATE POLICY "Allow public read access to event_categories" ON "public"."event_categories" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "Allow public read access to event_coordinators" ON "public"."event_coordinators" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "Allow public read access to events" ON "public"."events" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "Allow public read access to faculty_heads" ON "public"."faculty_heads" FOR SELECT TO "anon", "authenticated" USING (("enabled" = true));



CREATE POLICY "Allow public read access to form_settings" ON "public"."form_settings" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "Allow public read access to gallery_images" ON "public"."gallery_images" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "Allow public read access to homepage_settings" ON "public"."homepage_settings" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "Allow public read access to schedule_days" ON "public"."schedule_days" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "Allow public read access to schedule_events" ON "public"."schedule_events" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "Allow public read access to social_media_settings" ON "public"."social_media_settings" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "Allow public read access to sponsors" ON "public"."sponsors" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "Allow public read access to sponsorship_packages" ON "public"."sponsorship_packages" FOR SELECT TO "anon", "authenticated" USING (("enabled" = true));



CREATE POLICY "Allow public read access to sponsorship_settings" ON "public"."sponsorship_settings" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "Allow public read access to storage_setup_status" ON "public"."storage_setup_status" FOR SELECT USING (true);



CREATE POLICY "Allow public sports registration" ON "public"."sports_registrations" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public to create auditions" ON "public"."auditions" FOR INSERT TO "anon", "authenticated" WITH CHECK ((( SELECT "form_settings"."audition_form_enabled"
   FROM "public"."form_settings"
  WHERE ("form_settings"."id" = 1)) = true));



CREATE POLICY "Allow public to create memberships" ON "public"."memberships" FOR INSERT TO "anon", "authenticated" WITH CHECK ((( SELECT "form_settings"."membership_form_enabled"
   FROM "public"."form_settings"
  WHERE ("form_settings"."id" = 1)) = true));



CREATE POLICY "Allow public to create registrations" ON "public"."registrations" FOR INSERT TO "anon", "authenticated" WITH CHECK (true);



CREATE POLICY "Allow public to read auditions" ON "public"."auditions" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "Allow public to read memberships" ON "public"."memberships" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "Allow public to read registrations" ON "public"."registrations" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "Anyone can read site_settings" ON "public"."site_settings" FOR SELECT USING (true);



CREATE POLICY "Anyone can see likes count" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Anyone can view profile likes" ON "public"."profile_likes" FOR SELECT USING (true);



CREATE POLICY "Auth users can like" ON "public"."profile_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "liker_id"));



CREATE POLICY "Authenticated can read notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Current winners are viewable by everyone" ON "public"."event_winners" FOR SELECT USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."band_members" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."core_committees" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."core_team_members" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."faculty_heads" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."guest_artists" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."band_members" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."core_committees" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."core_team_members" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."faculty_heads" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."guest_artists" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."band_members" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."core_committees" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."core_team_members" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."faculty_heads" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."guest_artists" FOR SELECT USING (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."band_members" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."core_committees" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."core_team_members" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."faculty_heads" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."guest_artists" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Owners can unlike" ON "public"."profile_likes" FOR DELETE USING (("auth"."uid"() = "liker_id"));



CREATE POLICY "Public Insert Registrations" ON "public"."annual_sports_registrations" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public Read" ON "public"."annual_sports_matches" FOR SELECT USING (true);



CREATE POLICY "Public Read" ON "public"."sports_matches" FOR SELECT USING (true);



CREATE POLICY "Public Read Admin Permissions" ON "public"."admin_permissions" FOR SELECT USING (true);



CREATE POLICY "Public Read Admin Users" ON "public"."admin_users" FOR SELECT USING (true);



CREATE POLICY "Public Read Allowed Admins" ON "public"."allowed_admins" FOR SELECT USING (true);



CREATE POLICY "Public Read Events" ON "public"."annual_sports_events" FOR SELECT USING (true);



CREATE POLICY "Public can read active notifications" ON "public"."notifications" FOR SELECT TO "anon" USING ((("visible" = true) AND ("starts_at" <= "now"()) AND (("ends_at" IS NULL) OR ("ends_at" >= "now"())) AND ("admin_only" = false)));



CREATE POLICY "Public can read security settings" ON "public"."security_settings" FOR SELECT USING (true);



CREATE POLICY "Public insert scans" ON "public"."pass_scans" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public profiles read" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public read active rules" ON "public"."validation_rules" FOR SELECT USING (true);



CREATE POLICY "Public read enabled band_members" ON "public"."band_members" FOR SELECT USING (("enabled" = true));



CREATE POLICY "Public read entry passes" ON "public"."entry_passes" FOR SELECT USING (true);



CREATE POLICY "Public read security settings" ON "public"."security_settings" FOR SELECT USING (true);



CREATE POLICY "Public read validation rules" ON "public"."validation_rules" FOR SELECT USING (true);



CREATE POLICY "Public sports matches" ON "public"."sports_matches" USING (true) WITH CHECK (true);



CREATE POLICY "Public sports players" ON "public"."sports_players" USING (true) WITH CHECK (true);



CREATE POLICY "Public sports seasons" ON "public"."sports_seasons" USING (true) WITH CHECK (true);



CREATE POLICY "Public sports teams" ON "public"."sports_teams" USING (true) WITH CHECK (true);



CREATE POLICY "Public teams are readable by everyone" ON "public"."teams" FOR SELECT USING (true);



CREATE POLICY "Scanners can insert scans" ON "public"."pass_scans" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Scanners can read entry passes" ON "public"."entry_passes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Shoutouts open read" ON "public"."shoutouts" FOR SELECT USING (true);



CREATE POLICY "Users can create teams" ON "public"."teams" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own profile" ON "public"."admin_users" FOR UPDATE USING ((("auth"."uid"())::"text" = "user_id"));
CREATE POLICY "Users can insert their own admin profile" ON "public"."admin_users" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" = "user_id"));



CREATE POLICY "XP read access" ON "public"."student_xp" FOR SELECT USING (true);



ALTER TABLE "public"."about_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "about_settings_insert" ON "public"."about_settings" FOR INSERT TO "authenticated" WITH CHECK (("id" = 1));



CREATE POLICY "about_settings_read" ON "public"."about_settings" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "about_settings_select" ON "public"."about_settings" FOR SELECT USING (true);



CREATE POLICY "about_settings_update" ON "public"."about_settings" FOR UPDATE TO "authenticated" USING (("id" = 1)) WITH CHECK (("id" = 1));



ALTER TABLE "public"."admin_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_presence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."allowed_admins" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage allowed admins" 
ON "public"."allowed_admins" 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE admin_users.user_id = (auth.uid())::text 
        AND admin_users.role IN ('owner', 'admin')
    )
);


ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "announcements_select" ON "public"."announcements" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



ALTER TABLE "public"."annual_sports_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."annual_sports_matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."annual_sports_registrations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anon_select_homebound_settings" ON "public"."homebound_settings" FOR SELECT TO "anon" USING (true);



ALTER TABLE "public"."auditions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auth_manage_homebound_settings" ON "public"."homebound_settings" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."band_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."biometric_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_messages_insert" ON "public"."chat_messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "chat_messages"."conversation_id") AND (("c"."student_id" = "auth"."uid"()) OR ("c"."coordinator_id" = "auth"."uid"())))))));



CREATE POLICY "chat_messages_update" ON "public"."chat_messages" FOR UPDATE TO "authenticated" USING (("sender_id" = "auth"."uid"()));



ALTER TABLE "public"."chief_guests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chief_guests_all_auth" ON "public"."chief_guests" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "chief_guests_delete" ON "public"."chief_guests" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "chief_guests_insert" ON "public"."chief_guests" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "chief_guests_select" ON "public"."chief_guests" FOR SELECT USING (true);



CREATE POLICY "chief_guests_select_enabled" ON "public"."chief_guests" FOR SELECT USING ("enabled");



CREATE POLICY "chief_guests_update" ON "public"."chief_guests" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."contact_sections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversations_insert" ON "public"."conversations" FOR INSERT WITH CHECK (("auth"."uid"() = "student_id"));



ALTER TABLE "public"."core_committees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."core_team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entry_passes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entry_passes_public_select_own" ON "public"."entry_passes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."pass_registrations" "pr"
  WHERE (("pr"."id" = "entry_passes"."pass_registration_id") AND ("pr"."email" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text"))))));



ALTER TABLE "public"."event_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_coordinators" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_coordinators_public_select" ON "public"."event_coordinators" FOR SELECT USING (true);



ALTER TABLE "public"."event_winners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_select_all" ON "public"."events" FOR SELECT USING (true);



ALTER TABLE "public"."faculty_heads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."form_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gallery_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gallery_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gallery_settings_read" ON "public"."gallery_settings" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "gallery_settings_select" ON "public"."gallery_settings" FOR SELECT USING (true);



CREATE POLICY "gallery_settings_update" ON "public"."gallery_settings" FOR UPDATE TO "authenticated" USING (("id" = 1)) WITH CHECK (("id" = 1));



CREATE POLICY "gallery_settings_update_auth" ON "public"."gallery_settings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."guest_artists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "guest_artists_modify" ON "public"."guest_artists" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "guest_artists_select" ON "public"."guest_artists" FOR SELECT USING (true);



ALTER TABLE "public"."health_heartbeats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "health_heartbeats_select_auth" ON "public"."health_heartbeats" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."hero_media" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hero_media_modify_auth" ON "public"."hero_media" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "hero_media_read_all" ON "public"."hero_media" FOR SELECT USING (true);



ALTER TABLE "public"."homebound_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."homepage_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "homepage_settings_modify" ON "public"."homepage_settings" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "homepage_settings_select" ON "public"."homepage_settings" FOR SELECT USING (true);



ALTER TABLE "public"."login_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "owner_or_liker_can_view_likes" ON "public"."profile_likes" FOR SELECT TO "authenticated" USING (((("auth"."uid"())::"text" = ("liker_id")::"text") OR (("auth"."uid"())::"text" = ("profile_id")::"text")));



ALTER TABLE "public"."pass_registrations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pass_registrations_public_insert" ON "public"."pass_registrations" FOR INSERT WITH CHECK (true);



CREATE POLICY "pass_registrations_select_own" ON "public"."pass_registrations" FOR SELECT USING ((("email" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")) OR ("auth"."uid"() IS NOT NULL)));



ALTER TABLE "public"."pass_scans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pass_scans_security_insert" ON "public"."pass_scans" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."security_users"
  WHERE (("security_users"."username" = CURRENT_USER) AND ("security_users"."is_active" = true)))));



ALTER TABLE "public"."passkey_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."passkeys" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "presence_select" ON "public"."user_presence" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."profile_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read_health_heartbeats" ON "public"."health_heartbeats" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") OR (( SELECT "current_setting"('request.jwt.claims'::"text", true) AS "current_setting") IS NULL)));



ALTER TABLE "public"."registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roadmap_milestones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "roadmap_milestones_modify" ON "public"."roadmap_milestones" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "roadmap_milestones_select" ON "public"."roadmap_milestones" FOR SELECT USING (true);



ALTER TABLE "public"."schedule_days" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedule_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "security_users_select_own" ON "public"."security_users" FOR SELECT USING (("username" = CURRENT_USER));



CREATE POLICY "sel_chief_guests" ON "public"."chief_guests" FOR SELECT USING (true);



CREATE POLICY "sel_core_committees" ON "public"."core_committees" FOR SELECT USING (true);



CREATE POLICY "sel_core_team_members" ON "public"."core_team_members" FOR SELECT USING (true);



CREATE POLICY "sel_faculty_heads" ON "public"."faculty_heads" FOR SELECT USING (true);



CREATE POLICY "sel_gallery" ON "public"."gallery_images" FOR SELECT USING (true);



CREATE POLICY "sel_guest_artists" ON "public"."guest_artists" FOR SELECT USING (true);



CREATE POLICY "sel_homebound_settings" ON "public"."homebound_settings" FOR SELECT USING (true);



CREATE POLICY "sel_registrations" ON "public"."registrations" FOR SELECT USING (true);



CREATE POLICY "sel_schedule_days" ON "public"."schedule_days" FOR SELECT USING (true);



CREATE POLICY "sel_schedule_events" ON "public"."schedule_events" FOR SELECT USING (true);



CREATE POLICY "sel_sponsors" ON "public"."sponsors" FOR SELECT USING (true);



CREATE POLICY "sel_sponsorship_packages" ON "public"."sponsorship_packages" FOR SELECT USING (true);



CREATE POLICY "sel_sponsorship_settings" ON "public"."sponsorship_settings" FOR SELECT USING (true);



CREATE POLICY "service_all_challenges" ON "public"."passkey_challenges" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_all_passkeys" ON "public"."passkeys" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."shoutouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "site_settings_insert" ON "public"."site_settings" FOR INSERT WITH CHECK ("public"."can_edit_site_settings"());



CREATE POLICY "site_settings_select" ON "public"."site_settings" FOR SELECT USING (true);



CREATE POLICY "site_settings_update" ON "public"."site_settings" FOR UPDATE USING ("public"."can_edit_site_settings"());



ALTER TABLE "public"."social_media_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "social_media_settings_public_select" ON "public"."social_media_settings" FOR SELECT USING (true);



ALTER TABLE "public"."sponsors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sponsorship_packages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sponsorship_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sports_committees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sports_committees_auth_rw" ON "public"."sports_committees" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "sports_committees_select_enabled" ON "public"."sports_committees" FOR SELECT USING ("enabled");



ALTER TABLE "public"."sports_matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sports_players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sports_registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sports_seasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sports_team_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sports_team_members_auth_rw" ON "public"."sports_team_members" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "sports_team_members_select_enabled" ON "public"."sports_team_members" FOR SELECT USING (("enabled" AND (EXISTS ( SELECT 1
   FROM "public"."sports_committees" "c"
  WHERE (("c"."id" = "sports_team_members"."committee_id") AND "c"."enabled")))));



ALTER TABLE "public"."sports_teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."storage_setup_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_xp" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_presence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."validation_rules" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."announcements";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."homepage_settings";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profile_likes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."shoutouts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."site_settings";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."student_xp";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."teams";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_presence";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";































































































































































REVOKE ALL ON FUNCTION "public"."add_admin_by_email"("p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_admin_by_email"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_admin_by_email"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_admin_by_email"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_pass_registration"("p_pass_reg_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_pass_registration"("p_pass_reg_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_pass_registration"("p_pass_reg_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."authenticate_security_user"("p_username" "text", "p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."authenticate_security_user"("p_username" "text", "p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."authenticate_security_user"("p_username" "text", "p_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."award_xp"("p_user_id" "uuid", "p_action" "text", "p_xp" integer, "p_meta" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."award_xp"("p_user_id" "uuid", "p_action" "text", "p_xp" integer, "p_meta" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_xp"("p_user_id" "uuid", "p_action" "text", "p_xp" integer, "p_meta" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_edit_site_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."can_edit_site_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_edit_site_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_auth_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_auth_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_auth_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_messages"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_messages"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_messages"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_scans"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_scans"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_scans"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_security_user"("p_username" "text", "p_password" "text", "p_full_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_security_user"("p_username" "text", "p_password" "text", "p_full_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_security_user"("p_username" "text", "p_password" "text", "p_full_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_vip_pass"("p_name" "text", "p_notes" "text", "p_council_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_vip_pass"("p_name" "text", "p_notes" "text", "p_council_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_vip_pass"("p_name" "text", "p_notes" "text", "p_council_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_vip_pass_v2"("p_council_password" "text", "p_name" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_vip_pass_v2"("p_council_password" "text", "p_name" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_vip_pass_v2"("p_council_password" "text", "p_name" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_vip_pass_v3"("p_council_password" "text", "p_name" "text", "p_notes" "text", "p_valid_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."create_vip_pass_v3"("p_council_password" "text", "p_name" "text", "p_notes" "text", "p_valid_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_vip_pass_v3"("p_council_password" "text", "p_name" "text", "p_notes" "text", "p_valid_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_entry_pass"("p_pass_id" "uuid", "p_council_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_entry_pass"("p_pass_id" "uuid", "p_council_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_entry_pass"("p_pass_id" "uuid", "p_council_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_entry_pass_v2"("p_council_password" "text", "p_pass_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_entry_pass_v2"("p_council_password" "text", "p_pass_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_entry_pass_v2"("p_council_password" "text", "p_pass_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_entry_pass_v3"("p_council_password" "text", "p_pass_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_entry_pass_v3"("p_council_password" "text", "p_pass_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_entry_pass_v3"("p_council_password" "text", "p_pass_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_event_category"("p_category_id" integer, "p_fallback_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_event_category"("p_category_id" integer, "p_fallback_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_event_category"("p_category_id" integer, "p_fallback_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_event_category"("p_category_id" integer, "p_fallback_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_pass_registration"("p_reg_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_pass_registration"("p_reg_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_pass_registration"("p_reg_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_pass_scan_for_date"("p_pass_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_pass_scan_for_date"("p_pass_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_pass_scan_for_date"("p_pass_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_security_user"("p_user_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."delete_security_user"("p_user_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_security_user"("p_user_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_annual_sports_reg_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_annual_sports_reg_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_annual_sports_reg_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_pass_for_event_registration"("p_registration_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_pass_for_event_registration"("p_registration_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_pass_for_event_registration"("p_registration_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_council_dashboard_stats"("p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_council_dashboard_stats"("p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_council_dashboard_stats"("p_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_council_dashboard_stats_v2"("p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_council_dashboard_stats_v2"("p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_council_dashboard_stats_v2"("p_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_council_dashboard_stats_v3"("p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_council_dashboard_stats_v3"("p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_council_dashboard_stats_v3"("p_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_council_vip_passes"("p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_council_vip_passes"("p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_council_vip_passes"("p_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_council_vip_passes_v2"("p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_council_vip_passes_v2"("p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_council_vip_passes_v2"("p_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_council_vip_passes_v3"("p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_council_vip_passes_v3"("p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_council_vip_passes_v3"("p_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_event_winners"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_event_winners"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_event_winners"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_security_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_security_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_security_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_security_dashboard_stats"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_security_dashboard_stats"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_security_dashboard_stats"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_pass_scan_sync"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_pass_scan_sync"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_pass_scan_sync"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("p_section" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission"("p_section" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("p_section" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_or_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_or_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_or_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_or_owner"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_or_owner"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_or_owner"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_coordinator"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_coordinator"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_coordinator"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."link_scan_to_pass"() TO "anon";
GRANT ALL ON FUNCTION "public"."link_scan_to_pass"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_scan_to_pass"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_login_attempt"("p_role" "text", "p_identifier" "text", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_login_attempt"("p_role" "text", "p_identifier" "text", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_login_attempt"("p_role" "text", "p_identifier" "text", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."login_coordinator"("event_id_param" bigint, "password_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."login_coordinator"("event_id_param" bigint, "password_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."login_coordinator"("event_id_param" bigint, "password_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."next_registration_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."next_registration_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."next_registration_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_pass_scan_v3"("p_pass_token" "text", "p_guard_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_pass_scan_v3"("p_pass_token" "text", "p_guard_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_pass_scan_v3"("p_pass_token" "text", "p_guard_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."purge_all_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."purge_all_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."purge_all_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."register_for_event"("p_id" "text", "p_event_id" integer, "p_event_title" "text", "p_participant_type" "text", "p_full_name" "text", "p_email" "text", "p_phone" "text", "p_college" "text", "p_registration_date" timestamp with time zone, "p_is_team_registration" boolean, "p_team_name" "text", "p_team_members" "jsonb", "p_total_members" integer, "p_photo_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."register_for_event"("p_id" "text", "p_event_id" integer, "p_event_title" "text", "p_participant_type" "text", "p_full_name" "text", "p_email" "text", "p_phone" "text", "p_college" "text", "p_registration_date" timestamp with time zone, "p_is_team_registration" boolean, "p_team_name" "text", "p_team_members" "jsonb", "p_total_members" integer, "p_photo_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_for_event"("p_id" "text", "p_event_id" integer, "p_event_title" "text", "p_participant_type" "text", "p_full_name" "text", "p_email" "text", "p_phone" "text", "p_college" "text", "p_registration_date" timestamp with time zone, "p_is_team_registration" boolean, "p_team_name" "text", "p_team_members" "jsonb", "p_total_members" integer, "p_photo_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reorder_event_categories"("p_ids" integer[]) TO "anon";
GRANT ALL ON FUNCTION "public"."reorder_event_categories"("p_ids" integer[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reorder_event_categories"("p_ids" integer[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_pass_usage"("p_pass_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_pass_usage"("p_pass_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_pass_usage"("p_pass_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_pass_id_from_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_pass_id_from_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_pass_id_from_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."search_gallery_faces"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_gallery_faces"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_gallery_faces"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_council_password"("p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_council_password"("p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_council_password"("p_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_current_timestamp_chief_guests"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_current_timestamp_chief_guests"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_current_timestamp_chief_guests"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_pass_council_visibility"("p_pass_id" "uuid", "p_hidden" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_pass_council_visibility"("p_pass_id" "uuid", "p_hidden" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_pass_council_visibility"("p_pass_id" "uuid", "p_hidden" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_admin_permissions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_admin_permissions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_admin_permissions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_site_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_site_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_site_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_update_profile_likes"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_update_profile_likes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_update_profile_likes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_xp_multi_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_xp_multi_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_xp_multi_event"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_xp_on_reg_approve"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_xp_on_reg_approve"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_xp_on_reg_approve"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_biometric_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_biometric_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_biometric_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_coordinator_registration_status"("p_reg_id" "text", "p_event_id" bigint, "p_token" "text", "p_new_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_coordinator_registration_status"("p_reg_id" "text", "p_event_id" bigint, "p_token" "text", "p_new_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_coordinator_registration_status"("p_reg_id" "text", "p_event_id" bigint, "p_token" "text", "p_new_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_event_payment_gateway"("p_event_id" bigint, "p_token" "text", "p_new_config" "jsonb", "p_new_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_event_payment_gateway"("p_event_id" bigint, "p_token" "text", "p_new_config" "jsonb", "p_new_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_event_payment_gateway"("p_event_id" bigint, "p_token" "text", "p_new_config" "jsonb", "p_new_amount" numeric) TO "service_role";



GRANT ALL ON TABLE "public"."form_settings" TO "anon";
GRANT ALL ON TABLE "public"."form_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."form_settings" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_form_settings"("p_audition_form_enabled" boolean, "p_audition_form_message" "text", "p_membership_form_enabled" boolean, "p_membership_form_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_form_settings"("p_audition_form_enabled" boolean, "p_audition_form_message" "text", "p_membership_form_enabled" boolean, "p_membership_form_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_form_settings"("p_audition_form_enabled" boolean, "p_audition_form_message" "text", "p_membership_form_enabled" boolean, "p_membership_form_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pass_date"("p_pass_id" "uuid", "p_new_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."update_pass_date"("p_pass_id" "uuid", "p_new_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pass_date"("p_pass_id" "uuid", "p_new_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_entry_pass"("p_pass_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_entry_pass"("p_pass_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_entry_pass"("p_pass_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "public"."about_settings" TO "anon";
GRANT ALL ON TABLE "public"."about_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."about_settings" TO "service_role";



GRANT ALL ON TABLE "public"."admin_messages" TO "anon";
GRANT ALL ON TABLE "public"."admin_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_messages" TO "service_role";



GRANT ALL ON SEQUENCE "public"."admin_messages_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."admin_messages_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."admin_messages_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."admin_permissions" TO "anon";
GRANT ALL ON TABLE "public"."admin_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_presence" TO "anon";
GRANT ALL ON TABLE "public"."admin_presence" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_presence" TO "service_role";



GRANT ALL ON SEQUENCE "public"."admin_presence_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."admin_presence_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."admin_presence_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."admin_sessions" TO "anon";
GRANT ALL ON TABLE "public"."admin_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."allowed_admins" TO "anon";
GRANT ALL ON TABLE "public"."allowed_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."allowed_admins" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."annual_sports_events" TO "anon";
GRANT ALL ON TABLE "public"."annual_sports_events" TO "authenticated";
GRANT ALL ON TABLE "public"."annual_sports_events" TO "service_role";



GRANT ALL ON TABLE "public"."annual_sports_matches" TO "anon";
GRANT ALL ON TABLE "public"."annual_sports_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."annual_sports_matches" TO "service_role";



GRANT ALL ON SEQUENCE "public"."annual_sports_matches_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."annual_sports_matches_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."annual_sports_matches_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."annual_sports_reg_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."annual_sports_reg_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."annual_sports_reg_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."annual_sports_registrations" TO "anon";
GRANT ALL ON TABLE "public"."annual_sports_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."annual_sports_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."auditions" TO "anon";
GRANT ALL ON TABLE "public"."auditions" TO "authenticated";
GRANT ALL ON TABLE "public"."auditions" TO "service_role";



GRANT ALL ON TABLE "public"."band_members" TO "anon";
GRANT ALL ON TABLE "public"."band_members" TO "authenticated";
GRANT ALL ON TABLE "public"."band_members" TO "service_role";



GRANT ALL ON SEQUENCE "public"."band_members_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."band_members_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."band_members_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."biometric_profiles" TO "anon";
GRANT ALL ON TABLE "public"."biometric_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."biometric_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."chief_guests" TO "anon";
GRANT ALL ON TABLE "public"."chief_guests" TO "authenticated";
GRANT ALL ON TABLE "public"."chief_guests" TO "service_role";



GRANT ALL ON SEQUENCE "public"."chief_guests_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."chief_guests_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."chief_guests_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."contact_sections" TO "anon";
GRANT ALL ON TABLE "public"."contact_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_sections" TO "service_role";



GRANT ALL ON SEQUENCE "public"."contact_sections_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."contact_sections_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."contact_sections_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."core_committees" TO "anon";
GRANT ALL ON TABLE "public"."core_committees" TO "authenticated";
GRANT ALL ON TABLE "public"."core_committees" TO "service_role";



GRANT ALL ON SEQUENCE "public"."core_committees_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."core_committees_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."core_committees_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."core_team_members" TO "anon";
GRANT ALL ON TABLE "public"."core_team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."core_team_members" TO "service_role";



GRANT ALL ON SEQUENCE "public"."core_team_members_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."core_team_members_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."core_team_members_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."email_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_logs" TO "service_role";



GRANT ALL ON TABLE "public"."entry_passes" TO "anon";
GRANT ALL ON TABLE "public"."entry_passes" TO "authenticated";
GRANT ALL ON TABLE "public"."entry_passes" TO "service_role";



GRANT ALL ON TABLE "public"."event_categories" TO "anon";
GRANT ALL ON TABLE "public"."event_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."event_categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."event_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."event_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."event_categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."event_coordinators" TO "anon";
GRANT ALL ON TABLE "public"."event_coordinators" TO "authenticated";
GRANT ALL ON TABLE "public"."event_coordinators" TO "service_role";



GRANT ALL ON TABLE "public"."event_winners" TO "anon";
GRANT ALL ON TABLE "public"."event_winners" TO "authenticated";
GRANT ALL ON TABLE "public"."event_winners" TO "service_role";



GRANT ALL ON SEQUENCE "public"."event_winners_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."event_winners_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."event_winners_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."faculty_heads" TO "anon";
GRANT ALL ON TABLE "public"."faculty_heads" TO "authenticated";
GRANT ALL ON TABLE "public"."faculty_heads" TO "service_role";



GRANT ALL ON SEQUENCE "public"."faculty_heads_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."faculty_heads_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."faculty_heads_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."gallery_faces" TO "anon";
GRANT ALL ON TABLE "public"."gallery_faces" TO "authenticated";
GRANT ALL ON TABLE "public"."gallery_faces" TO "service_role";



GRANT ALL ON TABLE "public"."gallery_images" TO "anon";
GRANT ALL ON TABLE "public"."gallery_images" TO "authenticated";
GRANT ALL ON TABLE "public"."gallery_images" TO "service_role";



GRANT ALL ON SEQUENCE "public"."gallery_images_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."gallery_images_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."gallery_images_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."gallery_settings" TO "anon";
GRANT ALL ON TABLE "public"."gallery_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."gallery_settings" TO "service_role";



GRANT ALL ON TABLE "public"."guest_artists" TO "anon";
GRANT ALL ON TABLE "public"."guest_artists" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_artists" TO "service_role";



GRANT ALL ON SEQUENCE "public"."guest_artists_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."guest_artists_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."guest_artists_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."health_heartbeats" TO "anon";
GRANT ALL ON TABLE "public"."health_heartbeats" TO "authenticated";
GRANT ALL ON TABLE "public"."health_heartbeats" TO "service_role";



GRANT ALL ON TABLE "public"."hero_media" TO "anon";
GRANT ALL ON TABLE "public"."hero_media" TO "authenticated";
GRANT ALL ON TABLE "public"."hero_media" TO "service_role";



GRANT ALL ON SEQUENCE "public"."hero_media_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."hero_media_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."hero_media_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."homebound_settings" TO "anon";
GRANT ALL ON TABLE "public"."homebound_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."homebound_settings" TO "service_role";



GRANT ALL ON TABLE "public"."homepage_settings" TO "anon";
GRANT ALL ON TABLE "public"."homepage_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."homepage_settings" TO "service_role";



GRANT ALL ON TABLE "public"."login_history" TO "anon";
GRANT ALL ON TABLE "public"."login_history" TO "authenticated";
GRANT ALL ON TABLE "public"."login_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."login_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."login_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."login_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."memberships" TO "anon";
GRANT ALL ON TABLE "public"."memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."memberships" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pass_registrations" TO "anon";
GRANT ALL ON TABLE "public"."pass_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."pass_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."pass_scans" TO "anon";
GRANT ALL ON TABLE "public"."pass_scans" TO "authenticated";
GRANT ALL ON TABLE "public"."pass_scans" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pass_scans_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pass_scans_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pass_scans_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."passkey_challenges" TO "anon";
GRANT ALL ON TABLE "public"."passkey_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."passkey_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."passkeys" TO "anon";
GRANT ALL ON TABLE "public"."passkeys" TO "authenticated";
GRANT ALL ON TABLE "public"."passkeys" TO "service_role";



GRANT ALL ON TABLE "public"."profile_likes" TO "anon";
GRANT ALL ON TABLE "public"."profile_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_likes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."registration_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."registration_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."registration_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."registrations" TO "anon";
GRANT ALL ON TABLE "public"."registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."registrations" TO "service_role";



GRANT ALL ON TABLE "public"."roadmap_milestones" TO "anon";
GRANT ALL ON TABLE "public"."roadmap_milestones" TO "authenticated";
GRANT ALL ON TABLE "public"."roadmap_milestones" TO "service_role";



GRANT ALL ON SEQUENCE "public"."roadmap_milestones_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."roadmap_milestones_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."roadmap_milestones_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_days" TO "anon";
GRANT ALL ON TABLE "public"."schedule_days" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_days" TO "service_role";



GRANT ALL ON SEQUENCE "public"."schedule_days_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."schedule_days_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."schedule_days_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_events" TO "anon";
GRANT ALL ON TABLE "public"."schedule_events" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."schedule_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."schedule_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."schedule_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."security_logs" TO "anon";
GRANT ALL ON TABLE "public"."security_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."security_logs" TO "service_role";



GRANT ALL ON TABLE "public"."security_settings" TO "anon";
GRANT ALL ON TABLE "public"."security_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."security_settings" TO "service_role";



GRANT ALL ON TABLE "public"."security_users" TO "anon";
GRANT ALL ON TABLE "public"."security_users" TO "authenticated";
GRANT ALL ON TABLE "public"."security_users" TO "service_role";



GRANT ALL ON SEQUENCE "public"."security_users_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."security_users_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."security_users_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."shoutouts" TO "anon";
GRANT ALL ON TABLE "public"."shoutouts" TO "authenticated";
GRANT ALL ON TABLE "public"."shoutouts" TO "service_role";



GRANT ALL ON TABLE "public"."site_settings" TO "anon";
GRANT ALL ON TABLE "public"."site_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."site_settings" TO "service_role";



GRANT ALL ON TABLE "public"."social_media_settings" TO "anon";
GRANT ALL ON TABLE "public"."social_media_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."social_media_settings" TO "service_role";



GRANT ALL ON TABLE "public"."sponsors" TO "anon";
GRANT ALL ON TABLE "public"."sponsors" TO "authenticated";
GRANT ALL ON TABLE "public"."sponsors" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sponsors_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sponsors_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sponsors_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sponsorship_packages" TO "anon";
GRANT ALL ON TABLE "public"."sponsorship_packages" TO "authenticated";
GRANT ALL ON TABLE "public"."sponsorship_packages" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sponsorship_packages_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sponsorship_packages_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sponsorship_packages_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sponsorship_settings" TO "anon";
GRANT ALL ON TABLE "public"."sponsorship_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."sponsorship_settings" TO "service_role";



GRANT ALL ON TABLE "public"."sports_committees" TO "anon";
GRANT ALL ON TABLE "public"."sports_committees" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_committees" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_committees_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_committees_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_committees_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports_matches" TO "anon";
GRANT ALL ON TABLE "public"."sports_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_matches" TO "service_role";



GRANT ALL ON TABLE "public"."sports_players" TO "anon";
GRANT ALL ON TABLE "public"."sports_players" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_players" TO "service_role";



GRANT ALL ON TABLE "public"."sports_registrations" TO "anon";
GRANT ALL ON TABLE "public"."sports_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_registrations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_registrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_registrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_registrations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports_seasons" TO "anon";
GRANT ALL ON TABLE "public"."sports_seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_seasons" TO "service_role";



GRANT ALL ON TABLE "public"."sports_team_members" TO "anon";
GRANT ALL ON TABLE "public"."sports_team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_team_members" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_team_members_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_team_members_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_team_members_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports_teams" TO "anon";
GRANT ALL ON TABLE "public"."sports_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_teams" TO "service_role";



GRANT ALL ON TABLE "public"."storage_setup_status" TO "anon";
GRANT ALL ON TABLE "public"."storage_setup_status" TO "authenticated";
GRANT ALL ON TABLE "public"."storage_setup_status" TO "service_role";



GRANT ALL ON TABLE "public"."student_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."student_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."student_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."student_upcoming_events" TO "anon";
GRANT ALL ON TABLE "public"."student_upcoming_events" TO "authenticated";
GRANT ALL ON TABLE "public"."student_upcoming_events" TO "service_role";



GRANT ALL ON TABLE "public"."student_xp" TO "anon";
GRANT ALL ON TABLE "public"."student_xp" TO "authenticated";
GRANT ALL ON TABLE "public"."student_xp" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."user_presence" TO "anon";
GRANT ALL ON TABLE "public"."user_presence" TO "authenticated";
GRANT ALL ON TABLE "public"."user_presence" TO "service_role";



GRANT ALL ON TABLE "public"."validation_rules" TO "anon";
GRANT ALL ON TABLE "public"."validation_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."validation_rules" TO "service_role";



GRANT ALL ON TABLE "public"."view_profile_admirers" TO "anon";
GRANT ALL ON TABLE "public"."view_profile_admirers" TO "authenticated";
GRANT ALL ON TABLE "public"."view_profile_admirers" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































