# Two student support channels

Students open **Help & support** in the dashboard:

1. **Event help:** select a published event, then message its coordinator. Registration is not required to ask a question. Existing conversations remain readable if the event is later hidden.
2. **Technical help:** opens the student's technical-support conversation, answered from **Admin dashboard → Technical Support**.

The owner can grant **Technical support inbox** in Admin Accounts to the chosen technical-team admins. This uses the existing `support-chat` page permission. No new people are granted access automatically. Coordinators only receive conversations for the event in their verified login session.

## Connections

- The shared chat component uses an explicit student/coordinator/admin role. Styling no longer selects the destination inbox.
- Both staff dashboards have unread badges that update without needing to keep the chat panel open.
- New conversations, replies, edits, deletions, and read receipts refresh through Realtime, with polling as a fallback.
- Coordinator and technical-team replies create entries in the student's notification inbox and link back to the correct support channel.
- Failed sends keep the draft and show a retryable error. The existing global chat lock is enforced on the server as well as in the interface.
- Messages use the existing five-day retention. Earlier messages within that window can be loaded in pages.

## Database

Migration: `supabase/migrations/20261122180000_student_support_channels.sql`.

It adds scoped conversation/message RPCs, locks sender identity and conversation destinations, restricts technical support to assigned admins, and connects staff replies to `student_inbox`. Existing conversations and messages are preserved. Existing clients retain scoped send access while the new client uses RPCs for sending, editing, deletion, and read receipts.

The migration was installed in the configured Supabase database and recorded in its migration ledger. Verification did not send messages to real users.

## Validation

Database integration tests cover event/technical routing, cross-student and cross-event isolation, administrator permissions, spoofed sender roles, read receipts, reply notifications, editing, and the chat lock. Component tests cover both student help choices, explicit coordinator routing despite an indigo theme, failed-send draft recovery, and locked chat behaviour.
