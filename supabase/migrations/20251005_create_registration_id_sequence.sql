-- Create a global sequence for registration IDs and an RPC to fetch the next value
-- Generates IDs like: RICO-1, RICO-2, RICO-3, ...

-- 1) Create sequence if it doesn't exist
create sequence if not exists registration_id_seq
    as bigint
    start with 1
    increment by 1
    no minvalue
    no maxvalue
    cache 1;

-- 2) Create or replace function to return the next serial ID with prefix
create or replace function public.next_registration_id()
returns text
language plpgsql
security definer
as $$
declare
  n bigint;
begin
  select nextval('registration_id_seq') into n;
  return 'RICO-' || n::text;
end;
$$;

-- 3) Grant execute to anon and authenticated roles used by Supabase
grant execute on function public.next_registration_id() to anon, authenticated;

-- 4) Notify PostgREST to reload schema cache (optional but helpful in some setups)
-- Note: Only works if postgres NOTIFY is wired; harmless otherwise
do $$ begin perform pg_notify('pgrst', 'reload schema'); exception when others then null; end $$;
