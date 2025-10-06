-- Create notifications table for admin/owner pushed messages shown to viewers
create table if not exists public.notifications (
  id bigserial primary key,
  title text null,
  message text not null,
  type text not null default 'info', -- info | success | warning | error
  link_url text null,
  visible boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz null,
  priority int not null default 0,
  created_by uuid null,
  created_at timestamptz not null default now()
);

comment on table public.notifications is 'Admin-pushed notifications for viewer panel';
comment on column public.notifications.type is 'info | success | warning | error';
