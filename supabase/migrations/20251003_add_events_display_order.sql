-- Add display_order column to events for manual admin ordering
-- Lower display_order renders earlier (top). Existing events get sequential order based on created_at (oldest first)

alter table public.events
  add column if not exists display_order integer;

-- Backfill any NULLs deterministically using created_at then id
update public.events e
set display_order = sub.rn
from (
  select id, row_number() over (order by coalesce(created_at, now()), id) as rn
  from public.events
) sub
where e.id = sub.id and e.display_order is null;

-- Optional index to accelerate ordering
create index if not exists events_display_order_idx on public.events (display_order asc, id asc);

notify pgrst, 'reload schema';
