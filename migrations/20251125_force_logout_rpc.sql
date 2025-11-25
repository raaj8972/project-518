-- Create a function to clear all sessions
create or replace function force_logout_all_users()
returns void
language plpgsql
security definer
as $$
begin
  truncate table auth.sessions cascade;
end;
$$;
