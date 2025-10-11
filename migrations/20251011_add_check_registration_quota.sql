-- Create a server-side quota check not affected by RLS
-- Date: 2025-10-11

-- Function: check_registration_quota(e_id bigint, p_type text)
-- Returns one row with is_full (boolean), approved_count, pending_count, and max slots.
-- Behavior:
--  - Uses per-event quotas when present, else site-level quotas
--  - Interprets 0 as closed, NULL as unlimited
--  - Considers both pending and approved submissions when comparing to max

create or replace function public.check_registration_quota(e_id bigint, p_type text)
returns table(
  is_full boolean,
  approved_count integer,
  pending_count integer,
  max integer
)
language sql
security definer
set search_path = public
as $$
with q as (
  select coalesce(
    (select (registration_participant_quotas ->> p_type)::int from public.events where id = e_id),
    (select (registration_participant_quotas ->> p_type)::int from public.site_settings limit 1)
  ) as max_slots
),
counts as (
  select
    (select count(*) from public.registrations r where r.event_id = e_id and r.participant_type = p_type and r.status = 'approved') as approved,
    (select count(*) from public.registrations r where r.event_id = e_id and r.participant_type = p_type and r.status in ('pending','approved')) as total
)
select
  case
    when q.max_slots is null then false
    when q.max_slots <= 0 then true
    when counts.total >= q.max_slots then true
    else false
  end as is_full,
  counts.approved as approved_count,
  (counts.total - counts.approved) as pending_count,
  q.max_slots as max
from q, counts;
$$;

grant execute on function public.check_registration_quota(bigint, text) to anon, authenticated;
