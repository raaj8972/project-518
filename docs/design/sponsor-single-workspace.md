# One sponsor workspace

All partner publication controls live in `/admin/sponsors`. Home no longer has a separate logo editor, copy/import controls, edition lists or publication switch. Its Partners tab contains only appearance settings and one link to Sponsors. The page-workspace navigation no longer routes Sponsors users into Home to edit logos.

1. Add or edit a sponsor once: name, logo, category, website and display order.
2. Choose Previous or Current. Existing records default to Previous; new records let the admin choose an edition, initially Current.
3. Turn on Show on homepage for the sponsors to feature. The overall homepage partner section switch also lives in Sponsors.

A complete visible Current partner activates the current edition on both public pages. Until one is ready, Previous partners stay visible. Sponsors displays all visible records in the live edition; Home displays that edition's featured subset. If the live edition has no featured records, Home shows no logos until some are selected. The workspace displays both counts and the active edition.

The Supabase sponsors table owns sponsor details and its existing featured flag. The existing homepage JSON column stores only placement metadata for linked catalog records; copied names or logos cannot override catalog edits. Saved standalone logos from the earlier setup are preserved and editable in Sponsors. Linked records whose sponsor has been deleted do not become ghost logos. No schema migration is required.

Publication changes save independently and show errors on the same page. If creating a sponsor succeeds but saving its edition fails, the sponsor remains saved and edition can be retried on its card without creating it again. Existing approval requirements for sponsor changes are retained; edition/section changes are restricted when an owner review is required. Home appearance saves omit both sponsor placements and the overall publication switch, preventing stale Home drafts from overwriting these controls.

Regression tests cover edition fallback, featured filtering, updated catalog fields, deleted links, disabled records, old saved logos, failed writes, partial creation, approval handling, section visibility and the removal of duplicate Home controls. Automated tests use mocked mutations; no live sponsor content was written during implementation.
