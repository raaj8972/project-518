# Chronicles Supabase audit — 25 November 2026

Checked the configured live Supabase project using its management SQL API and Storage API. No credentials or account identifiers are included here.

## Findings and applied fixes

- `roadmap_milestones` existed with six editions and RLS enabled, but its `images` column and the `roadmap-images` bucket were missing. Applied the existing additive photo migration; existing history was preserved.
- Added explicit restrictive table write policies requiring `admin_can_manage_pages(['roadmap'], [])`, including session revocation checks through that helper. Old permissive policies cannot override these guards.
- Added the bucket to the global restrictive storage write helper. It previously had no mapping for Chronicles, which would block assigned staff even after creating the bucket.
- Storage writes require the same Chronicles page permission. Public reads are available for published website images. Anonymous callers cannot upload, overwrite or delete them.
- Bucket limit is 30 MiB, matching the editor’s source-image limit. Allowed raster types: JPEG, PNG, WebP, GIF, AVIF, HEIC, HEIF; SVG is rejected.
- Confirmed table and Storage RLS, ordered image-array persistence, and `roadmap_milestones` membership in the Realtime publication.

Applied SQL: `20261115000001_roadmap_photos.sql` and `20261125100000_chronicles_access.sql`. Both are repeatable and retain unrelated bucket permissions.

## Verification

`node scripts/audit-roadmap-photos.mjs --verify --verify-roles`

- Rolled-back role fixtures exercised table insert/update/delete and storage insert/update: owner and assigned Chronicles admin allowed; anonymous, student and unrelated admin writes denied. Revoked assigned admin writes also denied.
- Rolled-back table probes checked multi-photo persistence, replacement and removal.
- Disposable Storage API probe checked upload, public download, SVG rejection and anonymous upload/update/delete denial; files were cleaned up afterward.
- UI tests cover preserving the selected year through reordering, upload locking, correct bucket/year path, copying default history, and removing a new draft edition.
- The light editor was inspected in Chrome alongside the actual public Chronicles preview. Existing history was not edited or republished during that review.

The probe uses SQL role/claim simulation in a rolled-back transaction for staff permission tests; it does not sign into or modify a real staff account. Storage API smoke tests use a disposable image. Public history read policies remain public; the website filters disabled milestones before rendering.
