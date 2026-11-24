# Artist Supabase verification · 24 November 2026

The configured Supabase project was checked through its Management API, Postgres roles and the actual Storage API. The migration `20261124200000_artist_access_and_buckets.sql` was applied live. Existing artist content and uploaded files were preserved.

## Findings and fixes

- Public SELECT policies previously exposed hidden artist profiles. A restrictive policy now returns published artists to visitors and allows assigned artist staff/owners to read drafts.
- Artist writes and all three upload buckets now require the artist page permission. Restrictive policies close broad legacy grants. Ordinary users, staff assigned to other pages and revoked admin sessions were denied.
- Stage display settings previously used a broad homepage upsert. The scoped `save_artist_stage_settings` RPC changes only `artist_stage_settings` and its update timestamp. Artist staff can save years, date/place and lights without general homepage write access. The client invalidates its cache and refreshes after saving.
- Bucket limits and admin controls now match the project's actual 50 MiB global limit. Video files are excluded from the image bucket; HTML and SVG uploads are excluded.
- Artist media reference checks now include uploaded audio, posters and every phone/desktop gallery and clip URL. The audio bucket is recognized by the storage deletion helper.
- Publish/hide changes touch the existing public settings timestamp. Public clients listen for that signal, invalidate artist data and fetch their filtered lineup. Hidden profiles are never included in the signal. This addresses Supabase's documented [Realtime delivery behavior when an updated row no longer passes SELECT RLS](https://supabase.com/kb/troubleshooting/realtime-postgres-changes-troubleshooting).

## Buckets

| Bucket | File limit | Accepted media | Read mode |
| --- | --- | --- | --- |
| `guest-artist-images` | 50 MiB | JPEG, PNG, WebP, GIF, AVIF, HEIC/HEIF | Public media |
| `guest-artist-videos` | 50 MiB | MP4, WebM, QuickTime/MOV | Public media |
| `guest-artist-audio` | 25 MiB | MP3, OGG, WAV, WebM audio, MP4 audio | Public media |

The project-wide limit was read from the [Storage configuration endpoint](https://supabase.com/docs/reference/api/v1-get-storage-config). Supabase's [global and bucket limits](https://supabase.com/docs/guides/storage/uploads/file-limits) were considered together. Profile visibility is controlled separately by table RLS; these buckets serve public festival media.

## Verification performed

Database role probes exercised anonymous readers, ordinary authenticated users, unrelated admins, assigned artist staff, legacy permission-flag staff, the existing owner and revoked sessions. Profile create/update/delete, draft reads, bucket insert/update scope and the narrow settings RPC passed. All probe identity/permission/artist/storage metadata changes were rolled back. No new login account was provisioned.

Real UUID-scoped PNG, MP4 and WAV fixtures were uploaded to their respective buckets, downloaded and hash-checked. Public reads, CORS and HTTP 206 range streaming passed. Anonymous upload/overwrite/delete attempts and HTML upload attempts were blocked. A hidden artist with every new media/profile field was saved and read back; public REST could not read it. The test artist and all fixture objects were removed, with cleanup checked through storage metadata rather than cached downloads.

Storage deletion used the Storage API. Supabase's direct-SQL storage-delete protection was retained. Assigned staff policy behavior was checked with real database roles; the media byte round-trip used the configured server credential. An interactive owner login was not used for these checks.

The final focused suite passed 72 tests across 10 files, covering RLS/bucket constraints, scoped settings saves, media references, every admin upload limit, draft preview/save payloads and public publish/hide refresh. Type checking, production build and post-build security scanning passed.

## Repeatable commands

```sh
node scripts/audit-artist-stage.mjs --verify
node scripts/audit-artist-access.mjs --verify-roles
node scripts/diagnostics/guest-artist-save-smoke.mjs --smoke-test
```

The first two commands use rolled-back write probes. The last creates temporary fixtures and removes only its own UUID-scoped files and hidden artist. Credentials are loaded from local environment configuration and never included in reports. `--apply-access` on the access audit explicitly reapplies the idempotent migration.
