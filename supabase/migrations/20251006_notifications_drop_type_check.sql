-- Make notification type free-form by dropping strict check constraint if present
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'notifications'
      and constraint_name = 'notifications_type_check'
  ) then
    alter table public.notifications drop constraint notifications_type_check;
  end if;
exception when others then
  -- ignore if table doesn't exist yet or lacks the constraint
  null;
end$$;
