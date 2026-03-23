-- Add safeguard column for Firestore metadata leakage
-- This prevents "column not found" errors if PostgREST cache persistently expects these fields
alter table public.site_settings add column if not exists _synced_at text;

-- Also add to other common tables that might be dual-synced in the future
alter table public.profiles add column if not exists _synced_at text;
alter table public.registrations add column if not exists _synced_at text;
alter table public.sports_registrations add column if not exists _synced_at text;

comment on column public.site_settings._synced_at is 'Safeguard for Firestore metadata synchronization leakage.';
