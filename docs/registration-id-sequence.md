# Registration ID Sequence (RICO-<n>)

We issue sequential registration IDs like `RICO-1`, `RICO-2`, ... using a Postgres sequence and an RPC function.

## Migration

File: `supabase/migrations/20251005_create_registration_id_sequence.sql`

- Creates `registration_id_seq` (BIGINT)
- Creates `public.next_registration_id()` SECURITY DEFINER function that returns `RICO-<n>`
- Grants EXECUTE to `anon` and `authenticated` roles

Run this migration in your Supabase SQL editor or via CLI before enabling the feature.

## Client Usage

On submit, the web app calls `select next_registration_id()` via Supabase RPC and uses it as the `registrations.id`.
If the RPC is not yet available (e.g., migration not deployed), the client falls back to a unique timestamp-based ID to avoid blocking users.

Once the migration is live, newly created registrations will use the sequential IDs, and exports will display them under “Registration ID”.
