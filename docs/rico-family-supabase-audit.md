# Rico Family — Supabase verification

Checked: 2026-11-15T14:16:28.054Z
Result: PASS

## Live resources

| Resource | Result |
| --- | --- |
| `core_committees` | Required columns accessible; 12 rows |
| `faculty_heads` | Required columns accessible; 2 rows |
| `core_team_members` | Required columns accessible; 14 rows |
| `team-images` | Public photo delivery; upload/download probe passed |
| `faculty-images` | Public photo delivery; upload/download probe passed |
| Existing profile images | 16/16 URLs healthy |
| Realtime | All three personnel tables present in the realtime publication |

## Applied repairs

- Changed the department foreign key from cascading deletion to `ON DELETE SET NULL`. Removing a department keeps its heads and members available for reassignment.
- Added restrictive read policies to the three Rico Family tables. Visitors cannot fetch hidden profiles or team members belonging to a hidden department; authorized page admins can manage them.
- Added restrictive upload/update/delete guards for `team-images` and `faculty-images`. Existing broad legacy policies no longer allow anonymous users or users without Rico Family page access to modify these photos.
- All required tables, columns and both buckets already existed. The migration includes bucket creation only for a future deployment where either bucket is missing.

Migration: `supabase/migrations/20261115000000_rico_family_integrity.sql` (applied to the configured live project).

## Verification

- Live owner create/update/reload/delete passed for faculty, departments, heads, members and council fixtures.
- Phone, Instagram/Facebook JSON, batch and council color values saved and reloaded.
- Anonymous and non-admin database writes were denied; hidden rows stayed inaccessible.
- Deleting a test department preserved all three associated profiles.
- Database fixtures ran inside a rolled-back subtransaction. No existing profiles were edited or deleted by the checks.
- Temporary PNGs uploaded to both buckets, downloaded publicly and were removed afterward.
- Anonymous upload, replacement and deletion attempts against the temporary images were denied.

## Repeat the checks

```sh
npm run test:rico-family-db
npm run audit:rico-family
# Optional live probes: rolled-back fixture writes and temporary storage objects
npm run audit:rico-family -- --verify-writes --probe-storage
```

The audit reads the existing local environment configuration and never prints credentials or profile contact data. Default mode is read-only. Detailed latest results are written to `tmp/rico-family-supabase-audit.json`.
