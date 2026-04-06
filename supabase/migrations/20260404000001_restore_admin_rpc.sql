-- Migration: Restore add_admin_by_email RPC
-- Description: Re-creates the missing admin RPC function and grants necessary permissions.

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
  -- Note: public.is_owner() might also be missing, so we use a direct check if needed, 
  -- but let's assume is_owner exists or provide a fallback.
  
  if v_has_owner and not (
    exists(select 1 from public.admin_users where user_id = auth.uid()::text and role = 'owner')
  ) then
    -- If is_owner() function is missing, we use this direct check
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
  
  select exists(select 1 from public.admin_users a where a.user_id = v_uid::text) into v_exists;
  if v_exists then
    return true; -- already admin, treat as success
  end if;
  
  insert into public.admin_users(user_id, email, role, is_primary)
  values (v_uid::text, p_email, v_role, (v_role = 'owner'))
  on conflict (user_id) do nothing;
  
  return true;
end;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION "public"."add_admin_by_email"("p_email" "text") TO "anon";
GRANT EXECUTE ON FUNCTION "public"."add_admin_by_email"("p_email" "text") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."add_admin_by_email"("p_email" "text") TO "service_role";
