# Schedule programme workspace — 26 November 2026

The admin Schedule page now uses a light programme planner with a date rail and one selected day's agenda. Prelims and Mains remain separate. The first relevant upcoming day opens automatically, with search across all days and category filtering. Mobile layouts use a horizontal date selector and stacked event rows.

## Editing and publishing

- Add or edit a day with an ISO date, label and optional title. New duplicate dates within an edition are rejected.
- Add, edit, move, duplicate or remove a programme entry. Day deletion explicitly includes its entry count and asks for confirmation.
- Link an event by its full text ID to fill its title, time, venue and category. Standalone entries support ceremonies and activities outside the registration catalog. Schedule edits update the programme entry; catalog details remain editable in Events.
- Time ranges calculate their duration, including overnight events. Venue overlap checks use IST and allow parallel activities in different halls. Missing years and venues are flagged.
- Each successful write appears on the public schedule. A failed save keeps its form open. Partial schedule reads preserve the last complete programme and show a retry action.
- The visitor's initial edition is saved to Supabase, with no local-only success fallback.

## Import, PDF and participant email

The scanner can return flat event slots or nested days. Both formats are normalized and validated before a review dialog. Dates are required; the importer never substitutes today's date. Saving uses the returned day row ID, matches dates only within the chosen edition, and skips matching title/time/venue entries. Partial failures report completed writes so the remaining import can be retried.

The PDF includes the full selected edition and uses the saved festival year. Email recipients load only when the email dialog is opened. The server requires schedule management permission and provides a read-only audience preview before an explicit send action. Only approved, valid email addresses are included, deduplicated without case sensitivity. Successful deliveries in the last 24 hours are skipped, matching the audience preview. Reads paginate past 1,000 records; sending uses batches of up to 100 and reports remaining/failed counts. A delivery-log failure stops further chunks and reports possible duplicates before retry. Sending was tested with a mocked provider; no participant broadcast was sent during this task.

## Live database audit and repairs

`node scripts/audit-schedule-workspace.mjs --verify`

- Added missing `schedule_days.schedule_type` and `site_settings.default_schedule_type` columns. Legacy Mains title tags were preserved and backfilled to the explicit edition column.
- Confirmed text event foreign keys, parent-day cascade deletion, event deletion unlinking, RLS and Realtime publication for both schedule tables, events and website settings.
- Verified public PostgREST reads, no orphan schedule entries and no broken event foreign keys.
- Verified owner, assigned Schedule admin and assigned Events admin CRUD using temporary SQL role fixtures inside a rolled-back transaction. Student/unrelated admin writes and cross-page mutations are denied.
- Restricted email-log reads to active admins. The previous policy's name said admins, but its expression allowed every visitor to read delivery addresses.
- Preserved 11 days, 35 raw schedule entries and 3 catalog events. The website excludes sports content according to its existing feature setting.
- The owner confirmed the current festival is **2026**. Corrected the saved 2027 brand year to 2026 and converted the five legacy December 19–23 dates to `2026-12-19` through `2026-12-23`. Other historical dates were retained.

Migrations: `20261126090000_schedule_workspace.sql` and `20261126100000_correct_festival_2026.sql`.

## Validation

TypeScript, production build and bundle secret scanning passed. The final focused regression run passed 74 tests across 18 files. Automated tests cover the planner, CRUD errors/retry, linking text IDs, date editing, import preview, audience preview, server permissions/pagination, chronological public display, accurate registration links, duration interpretation, PDF generation, existing event workflows and security middleware. The authenticated desktop planner and legacy-date edit dialog were inspected in Chrome. Responsive layouts are implemented; a separate mobile visual review was not completed.

ESLint could not start because the repository's existing AJV override is incompatible with its installed ESLint dependency. No dependency versions were changed as part of this work.
