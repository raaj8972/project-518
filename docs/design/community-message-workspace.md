# Community messages

The participant shout-out board is managed under Workspace → Community messages, not inside the Home page editor. The existing `/admin/shoutouts` URL and `shoutouts` permission ID are retained. Home navigation and its connected-tool search entries no longer treat it as page content.

Messages auto-approve. The participant insert explicitly sets `is_approved: true`; a database BEFORE INSERT trigger enforces true even if an older client sends false or null. Existing queued flags are backfilled to true. The migration does not alter RLS, participant identity rules, length checks or site settings. It was applied in the configured live Supabase project; the final verification query returned `messages_needing_approval = 0` and `auto_approval_active = true`.

The admin screen contains All / Recent / Expired views, instead of Pending / Approved filters, review totals or manual approve/hide buttons. Unwanted messages can still be deleted through the existing explicit confirmation. Recent/expired status follows the configured lifetime. Realtime updates refresh the message list. Board availability, daily limit and expiry controls remain independent of approval.

API errors on the participant board no longer substitute invented dummy messages. Regression tests exercise the real baseline shoutouts schema with the auto-approval migration, false/null approval inputs, existing message preservation, maximum length, settings preservation, navigation placement and the absence of manual approval UI. No live participant test message was posted.
