-- Safe, atomic deletion of an event category
-- Reassigns dependent events to a fallback category and then deletes the row
-- SECURITY DEFINER bypasses RLS for the internal steps while limiting who can execute

create or replace function public.delete_event_category(
  p_category_id int,
  p_fallback_name text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
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

-- Lock down function privileges: only authenticated can execute
revoke all on function public.delete_event_category(int, text) from public;
grant execute on function public.delete_event_category(int, text) to authenticated;
