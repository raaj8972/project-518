# Event WhatsApp group access

The invite link unlocks **after coordinator approval**, for the signed-in student's own active, non-deleted registration. Registration submission, payment pending, rejected/cancelled entries, and deactivated entries do not qualify.

Students can find **Join event WhatsApp group** under Dashboard → Events → My registrations, Results & rounds, or their registered event's details. The join action sits directly below the event heading in a highlighted green card, before date/venue information or secondary actions. It includes the WhatsApp mark and a large Join WhatsApp group button that spans the card on mobile. The interface does not trust invite links embedded in legacy/public event objects. Approval changes and group-link changes refresh the protected read; failures do not reveal a URL.

`20261123043000_protect_event_whatsapp_groups.sql` was applied to the configured Supabase project and recorded in its migration ledger. It moves existing links into `event_whatsapp_groups`, with row security and no anonymous SELECT access or direct student writes. Assigned coordinators and staff with event/registration access can read the links they manage. Public `events.whatsapp_group_link` stays NULL, enforced by a constraint. Existing staff event forms still work: a guarded trigger redirects incoming values into protected storage atomically; an empty string removes a link and omitted/null values preserve it.

Admin event editing loads the protected value before opening the form. Coordinator settings load it for the assigned event and disable saving until the read succeeds. Admin and coordinator invitation messages include group links only for approved, active entries. Individual/bulk admin approval now activates the registration consistently, and rejection deactivates it.

Application access controls cannot revoke copies of a previously public invitation. Replace an already exposed WhatsApp invite link with a new one in the event's settings.

Database tests cover migration reapplication, public SELECT-* redaction, anonymous denial, other-account isolation, pending/payment-pending states, approval, rejection/cancellation/deactivation/deletion, invalid sessions, scoped staff updates, link removal, and event creation. UI tests cover locked/unlocked states, immediate revocation, failed reads, stale account responses, legacy public values, and registration activation.

Live API verification confirmed that public event invite fields are NULL, no WhatsApp invite references remain in public event rows, and anonymous reads of the protected group table are denied. The targeted regression run passed 73 tests across 11 files; TypeScript and the production build passed.
