# Events admin workspace

Implemented on 26 November 2026. Entry: `/admin/events`.

## Catalog and operations

The light admin workspace uses compact event rows with poster thumbnails, category, schedule, registration totals and publication status. Search, category, publication and registration filters work together. Each row exposes editing, homepage featuring, visibility, registration opening/closing, participant notifications, winners and public-event links. Event deletion requires an explicit dialog action. Reordering supports drag and arrow buttons and keeps the arrangement after a failed save.

Email branding is a secondary utility rather than a large configuration panel above the catalog. Storage reads run only when it is opened. AI poster import and the existing winners editor remain available on demand. The expensive public-page preview is not mounted in this workspace.

## Shared Add / Edit dialog

One dialog serves both creation and editing, with a persistent save footer and seven sections:

1. Event details: title, category, participant description, description AI and highlights.
2. Schedule and venue: date, free-form time/range, venue and livestream URL.
3. Registration: availability, opening/closing windows in IST, total capacity, individual/team mode, mode locking, exact or ranged team sizes, configured/custom participant types and per-type quotas, required photograph and photo label.
4. Rules: simple lists, structured sections and blocks, numbered/bullet lists and supporting document URL.
5. Media: 1600 × 1000 poster upload/crop, URL input, optional video and autoplay setting.
6. Coordinators: ordered contact drafts and protected participant WhatsApp group link.
7. Publishing: visibility, homepage featuring and an explicit opt-in to participant update emails after a schedule/rule change.

Validation moves to the relevant section even if it is not currently displayed. Zero participant quotas remain zero (closed); blank quotas remain unlimited. Existing structured rule data is retained when no rule edits were made. Registration times use `Asia/Kolkata` on display and convert to UTC on save.

Drafts use separate local storage keys per event and for new events. Closing keeps the draft; discarding restores the published baseline. Email-send consent is not restored from storage. Protected group lookup failure prevents opening an editor that could overwrite an unread group link. Fields managed elsewhere, including payment configuration and registration form schema, are excluded from this editor's writes.

Coordinator typing has no immediate database side effects. The save process records each completed event/contact write, so retrying an unfinished contact save does not create a second event or duplicate a completed contact. Incomplete creation checkpoints can be resumed from Add event. Owner approval payloads handle event and coordinator records separately. Poster/video replacement and removal retain the published files while the draft is being edited.

## Email layout and sending

Event update emails use an ordinary table layout with the website's festival logo and edition in the masthead. The optional email stamp is an ordinary image beside the signature, after the message and coordinator contacts. There are no negative margins, background-image stamps or transparent overlay images. The email-specific stamp takes precedence over the shared PDF stamp; a failed replacement upload leaves the previous file intact.

Schedule, rules and combined update messages share the template. Recipient names, teams, event content and rules are escaped. Selected rules are visibly marked as updated. The notification dialog provides a review and a separate Send action. It reports successful/failed counts honestly and identifies the existing 100-recipient send limit. An email failure after saving the event does not make the event save fail or replay the database writes.

## Verification

Automated coverage includes Add/Edit, validation across tabs, draft restoration, protected group loading, quota preservation, deferred contact edits, partial-save retry, contact ordering, upload locks, catalog filtering/actions, reordering failures, winners, branding upload failure, notification consent, combined email content, approval application and safe video draft removal. Existing participant registration, protected WhatsApp access and ranking/cache regressions are also checked. Production build, TypeScript and server notification bundling are checked separately.

The computer-use browser host was unavailable, so an authenticated visual browser review remains unverified. Storage writes, event mutations and email sends in tests use mocks; no production participant emails were sent during implementation.
