# Registrations and auditions workspace

The admin sidebar groups event registrations and Home Bound auditions under **Registrations & auditions**. Both existing URLs remain available. Application permissions still determine which tabs and form controls are shown, including audition-only accounts.

The shared header provides event and audition navigation plus a compact Form setup menu. Each queue has its own status counts, search, batch filter, application list and workflow. Counts come from registration totals or the complete audition collection, rather than the currently rendered page.

Event registrations retain participant details, owner editing, team rosters, private photos, review and rejection, confirmation and custom emails, WhatsApp contact links, trash and restore, PDF and Excel reports, PDF branding and column configuration. Bulk controls appear only after selecting rows; selection clears when changing page, filter or queue. Exports explicitly describe their current-page scope. Participation verification sits below the application list.

Auditions retain the pending → reviewed → contacted process, applicant contact and portfolio links, experience and motivation, owner batch editing, deletion, reports and PDF branding. Local filters combine instrument, batch, status and search, with 20 applications per page. Status updates expose inline failures and disable repeated submission.

Menus render outside scrolling tables and support keyboard dismissal. Review, email and report dialogs share the existing focus-managed dialog component. Mobile uses a two-column metrics strip, stacked controls and horizontal scrolling inside the application list. Loading, empty and unavailable states are distinct.

## Backend verification

The participant backend was audited and repaired on 26 November 2026. The applied migration reconciles email-log fields, limits public audition submission to pending applications, scopes branding writes, and synchronizes linked passes in the registration transaction. The frontend now combines registration filters, refreshes live totals, preserves failed email selections, and distinguishes unavailable audition data from an empty queue.

Both application screens use the same signed-access branding loader and safe replacement flow. PDF generation preserves artwork proportions, compresses embedded images, reserves space for stamps and respects selected report columns. Email recipients and event information come from Supabase, with escaped templates and server-side provider validation.

See [backend audit](../audits/2026-11-26-participant-backend.json) and [email setup](../operations/participant-email-setup.md) for verification and the remaining SMTP/DNS configuration requirements.
