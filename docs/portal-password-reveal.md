# Council, CR and Security password display

Passwords & Access now has owner-only Show/Hide controls for Council, each CR batch, and each Security staff account. Password entry forms also have a visibility toggle. Revealed values clear after 30 seconds, when the section closes, or when the browser loses focus.

Apply `supabase/migrations/20261107000006_portal_password_reveal.sql` before using the new save/reveal endpoint. Saves commit a bcrypt login hash and encrypted recovery copy together. Only the service role can read copies or call the save function; the endpoint verifies current owner membership. Legacy updates invalidate copies, and reveal rejects stale hashes.

Existing hash-only passwords cannot be reconstructed: set a new password once to enable Show. This migration does not rotate existing passwords.

AES-256-GCM uses the portal and account as authenticated context. Set a persistent server-only `PORTAL_PASSWORD_VAULT_KEY`, or keep the existing service-role secret stable (used as the fallback encryption key). Never expose this key in frontend environment variables.

Local verification: API, reveal component and database tests pass; application TypeScript checks pass. Applying the migration to the configured database was attempted but failed authentication (`28P01`). The database migration remains required for the feature to work.

## Named staff and batch CR login

Apply `20261107000007_named_staff_batch_cr_access.sql` after the portal password migration. Security staff select their name and enter a PIN/password; owners create staff with just a name and code. An internal generated identity maintains session attribution without requiring the staff to enter an email or username. Council uses only the shared code, and CR uses a configured academic batch plus code. Numeric PINs may contain 4–8 digits; other passwords require at least 8 characters.

The exact academic batch label (for example `2021-2022`) must match student profiles. CR reads are restricted to that batch even when public profile read policies exist. Single approvals and atomic bulk approvals verify the current CR session and batch in the database. The dashboard loads all pages of its assigned batch.

Both new migrations still require application to the configured database; its saved connection credentials failed authentication.

Student registration, profile completion, owner CR setup, and CR login now use `registrationBatches` from the same site settings. CR login does not depend on a separate `cr_batches` directory. Listing a registration batch does not grant access: the owner must still set its CR PIN/password before it can sign in.
