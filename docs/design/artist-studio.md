# Artist lineup workspace

The Artists page and Add/Edit Artist dialog use the workspace's Geist typography, neutral surfaces and teal controls. The empty lineup is an illustrated setup guide, replacing the large dashed blank area. Populated lineups use portrait-led cards, real visibility/featured counts, search and filters. Nested Home page context is compact so it does not compete with the lineup heading.

The editor is a centered native dialog with four sections: Artist details, Photos & media, Performance and Social links. A desktop preview reflects portrait/card media, name, role, specialty, venue and publication state. Its checklist distinguishes required artist details/portrait from optional schedule/social information. AI biography generation is an optional collapsed helper; its output must be reviewed. Header/tabs/footer are separate from the scrollable form, so Save and Cancel remain visible. On small screens the preview is hidden, fields stack and tabs can scroll horizontally.

Fields have associated labels and inline validation. Failed validation opens the appropriate section and focuses its first invalid field without moving focus on every keystroke. Date and time must be supplied together. Save errors retain the editor's data for retry. The form excludes local `card_media_mode` and date/time fields from the database payload, deriving `card_media_is_video` and `performance_at` instead.

Media uploads/cropping and AI generation lock publication and dialog dismissal until finished. Published assets are preserved when a draft replaces or removes them; artist management no longer deletes live files before a save or pending approval succeeds. Existing approval requirements remain in place, and a rejected submission keeps the form open. File/crop dialogs portal into their native parent dialog, avoiding inert overlays behind the browser's top layer.

The page and centered editor were visually inspected in the user's running Safari session through native computer use. No artist was created, updated, uploaded or published during this inspection. Automated tests cover preview/form state, section validation, payload shape, failed-save retry, upload/AI locking, approval failures, filters, focus restoration and nested file dialogs. Mobile styles are implemented; a physical mobile browser was not inspected.

## Automatic Home publication and live save verification — 9 November 2026

Featured selection is automatic. The artist form and roster have no Featured switch or star action. New/edited artists save with `is_featured: true`; Home selects complete visible profiles regardless of old false/null featured flags. The existing public visibility control still allows an artist to be hidden. Null achievements/social JSON are normalized before rendering, and missing upload URL objects produce a descriptive upload error.

A live schema check found `card_media_url`, `card_media_is_video` and `detail_music_url` missing from the configured Supabase project. Migration `20261109000000_guest_artist_media_and_auto_home.sql` was applied through the authenticated project SQL editor. It adds those fields and sets the default/backfill for automatic featuring. Existing optional media and performance fields may remain null; required UI collections are safe to use.

Verification completed on the configured project:

- Authenticated owner role inserted an artist with the new schema, received the automatic featured default, read it back and updated it. The transaction was rolled back; the final query reported zero leftover dummy rows.
- A UUID-scoped hidden test artist was inserted and read back through the real Supabase REST API with portrait, performance video, motion poster, audio, achievements and social fields. Its media URLs and flags round-tripped correctly. The test row was removed afterward.
- Image, MP4 video and WAV fixtures were uploaded to `guest-artist-images`, `guest-artist-videos` and `guest-artist-audio`. Authenticated download and public URL bytes matched the fixtures. Only the test's UUID-scoped files were removed afterward; pre-existing files were retained.
- Post-cleanup storage usage: images 81,048 bytes (1 existing file), videos 13,691,600 bytes (1), audio 4,006,933 bytes (4). Per-file bucket limits were 80 MiB, 500 MiB and 25 MiB respectively. These are file limits/observed usage, not a claim about remaining project-wide plan quota.
- All 49 test files / 286 tests, type-check and production build passed. Added regression coverage uses the actual baseline guest artist table plus the additive migration in isolated PostgreSQL, and covers null collections, old featured flags, automatic UI saves and absent media URL objects.

The reproducible live smoke command is `node scripts/diagnostics/guest-artist-save-smoke.mjs --smoke-test`. It requires configured service credentials, creates one hidden artist and only its own fixture objects, then verifies cleanup. The SQL owner test additionally verified actual owner RLS behavior; the storage/REST smoke command uses service credentials.
