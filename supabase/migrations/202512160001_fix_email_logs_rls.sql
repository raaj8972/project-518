-- Ensure email_logs table exists (idempotent)
create table if not exists public.email_logs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    registration_id uuid references public.registrations(id),
    email_type text not null,
    recipient_email text not null,
    subject text,
    status text default 'sent',
    sent_at timestamp with time zone default timezone('utc'::text, now()),
    metadata jsonb
);

-- Enable RLS
alter table public.email_logs enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Allow admins to read email logs" on public.email_logs;

-- Policy: Authenticated users (Admins/Coords) can read logs
create policy "Allow admins to read email logs"
on public.email_logs for select
to authenticated
using (true);

-- Policy: Service role can insert (for Netlify functions)
-- Note: Service role bypasses RLS by default, but explicit policy is good practice
-- No create policy needed for service_role usually if bypassing RLS
