# Sponsors admin workspace — 26 November 2026

The admin Sponsors page now uses a searchable brand directory with a separate website display preview. Sponsor rows show edition, tier, order, website, live placement and a homepage star. Display settings expand only when needed. Add/edit uses a labelled, keyboard-accessible dialog with logo preview, upload/save locks and retryable inline errors.

Packages use compact ordered rows, expandable benefits and visibility controls. Page settings show public copy beside the brochure state. The PDF uploader, manual office contacts, shared Rico Family team contacts, legacy archives and approval handling remain connected to their existing data sources.

## Persistence and live fixes

- `sponsors` stores brand details, logo, tier, order and homepage selection. `homepage_settings.sponsor_logos` stores publication metadata; Current/Previous fallback continues to use the shared resolver.
- Applied the existing `20261119000000_sponsor_page_connections.sql` migration: Sponsors-scoped contacts, safe placement-only homepage updates, and the missing public PDF bucket with a 10 MB/PDF-only restriction.
- Applied `20261126140000_sponsor_workspace_storage.sql`: connected the brochure bucket to the global storage permission mapping; restricted legacy logo upload policies to authorized Sponsors admins and owners.
- Applied `20261126141000_sponsor_delete_placements.sql`: deletion removes linked or matching legacy placements in the same database transaction. Frozen historical archive copies and uploaded media are retained.
- Failed reads retain the latest available sponsor/contact data and show a retry action. Failed writes keep edits and avoid reporting success.

## Verification

`node scripts/audit-sponsors-workspace.mjs --verify` checks public reads and existing logo responses, performs rolled-back CRUD under actual owner/Sponsors-admin/unrelated-admin/student/anonymous roles, checks placement-only homepage permissions, and uploads/loads/removes unique test PNG/PDF objects. The saved report is `docs/audits/2026-11-26-sponsors-workspace.json`.

Browser checks covered the live sponsor editor/save, directory, package rows, settings overview and a 393 × 852 phone viewport. Existing sponsor content was retained. The audit's database fixtures were rolled back and test media was removed. Type checking, the production build/security scan and the targeted sponsor/public-page regression suite passed.
