# Student event tools

Implemented in the student dashboard:

- **Saved events:** bookmark events in Discover and open the Saved view. Bookmarks sync with the signed-in account.
- **Notifications:** the bell opens `/dashboard/notifications`. Registration changes, team invitations, invitation responses, venue changes, schedule changes, and reminders share one inbox. It supports unread/category filters, read state, and older history.
- **Reminders:** approved cultural-event registrations receive an inbox reminder 30 minutes before a confirmed start by default. Students can choose 15, 30, or 60 minutes, or turn reminders off. Times use Asia/Kolkata. A database Cron job checks every minute, so inbox delivery continues while the app is closed. This implementation delivers in-app notifications; it does not send email, SMS, or Web Push.
- **Clash warnings:** registration forms (including instant registration) and cart checkout fetch the current student's existing entries before writing. Confirmed overlapping ranges produce a warning. Same-day entries with unconfirmed end times produce a caution instead of inventing an event duration. Students can review and acknowledge a warning, then continue; the schedule is checked again. Cart entries are also checked against one another. Teammates' private schedules are not queried.

## Database installation

`supabase/migrations/20261122160000_student_event_tools.sql` adds the account-scoped tables, RLS, event triggers, and reminder functions. It was applied to the configured Supabase project and recorded in the migration ledger. The `student-event-reminders` Cron job was verified active with a successful run. The reminder key is stable across database session timezones.

Only the owner of a row can access favourites, preferences, or inbox records. Students can update inbox read state but cannot create notifications or edit their content. Trigger functions and the scheduled reminder function are not exposed to anonymous callers. Trigger-created notifications are transactional with their source changes; reminder keys prevent duplicate deliveries.

On databases without `pg_cron`, the migration still installs the features and the open dashboard checks reminders every minute. Enable Supabase Cron to retain delivery while the app is closed.

## Checks

- PGlite database integration tests cover RLS, forged-notification rejection, registration/invitation/event-change triggers, opt-out, rescheduling, and reminder deduplication across timezones.
- Component tests cover bookmarks, inbox filters/read actions/preferences, and acknowledged registration warnings.
- Schedule tests cover adjacent slots, overlaps, overnight events, cart conflicts, and incomplete or invalid times.
