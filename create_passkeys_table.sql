-- Create a table to store WebAuthn passkeys
create table if not exists public.passkeys (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null,
  public_key text not null,
  counter bigint not null default 0,
  transports jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  
  primary key (id),
  unique (credential_id)
);

-- Enable RLS
alter table public.passkeys enable row level security;

-- Policies
-- Users can view their own passkeys
create policy "Users can view own passkeys" on public.passkeys
  for select using (auth.uid() = user_id);

-- Users can delete their own passkeys
create policy "Users can delete own passkeys" on public.passkeys
  for delete using (auth.uid() = user_id);

-- Service role can do everything (needed for registration/login functions)
create policy "Service role full access" on public.passkeys
  for all using (true) with check (true);

-- Create a table to store temporary challenges (for serverless auth)
create table if not exists public.passkey_challenges (
  id uuid not null default gen_random_uuid(),
  challenge text not null,
  user_id uuid references auth.users(id) on delete cascade, -- Optional, null for login
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  
  primary key (id)
);

-- Enable RLS
alter table public.passkey_challenges enable row level security;

-- Service role full access (only server functions should access this)
create policy "Service role full access challenges" on public.passkey_challenges
  for all using (true) with check (true);
