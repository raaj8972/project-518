-- Migration: Create biometric_profiles table
-- Each admin user has one row tracking their own Face ID and Touch ID enrollment

create table if not exists biometric_profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  face_enrolled         boolean not null default false,
  fingerprint_enrolled  boolean not null default false,
  biometric_enabled     boolean not null default true,
  enrolled_at           timestamptz,
  last_auth_at          timestamptz,
  failed_attempts       integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- RLS: each admin can only read/write their own row
alter table biometric_profiles enable row level security;

create policy "admin_own_biometric_select"
  on biometric_profiles for select
  using (auth.uid() = user_id);

create policy "admin_own_biometric_insert"
  on biometric_profiles for insert
  with check (auth.uid() = user_id);

create policy "admin_own_biometric_update"
  on biometric_profiles for update
  using (auth.uid() = user_id);

create policy "admin_own_biometric_delete"
  on biometric_profiles for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_biometric_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger biometric_profiles_updated_at
  before update on biometric_profiles
  for each row execute function update_biometric_updated_at();
