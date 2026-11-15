# Coordinator password display

The owner’s **Passwords & Access → Coordinator access** section shows a separate current-password column. Passwords are fetched only after an owner clicks **Show**, hidden after 30 seconds, and cleared when the section or browser tab is hidden.

Older credentials stored only as hashes cannot be recovered. The page labels those as unavailable; it never substitutes a default. Saving a new password creates an encrypted recoverable copy while retaining the existing bcrypt login hash. Account passwords for owners and admins remain hash-only.

The `coordinator-passwords` server endpoint checks fresh owner authorization for status, reveal, and save. Browser roles cannot read the private vault or call its save RPC. The database rejects legacy password writes and defers consistency checks until transaction commit. A new hash cannot be saved without a matching encrypted copy, and an existing copy cannot be deleted independently. Grouping-only edits preserve the current copy.

Encryption uses AES-256-GCM with an event-specific authenticated context. `COORDINATOR_PASSWORD_VAULT_KEY` may be set to a persistent random server-only secret. Without it, the server derives a separate encryption key from the existing Supabase service-role secret. Keep the same vault secret across deployments. Before rotating a fallback service-role secret, configure `COORDINATOR_PASSWORD_VAULT_KEY` to the **old** service-role value so existing copies remain readable. Never use a `VITE_` variable for this key.

Apply `20261107000004_coordinator_password_reveal.sql` together with the server endpoint. It creates private storage but does not rotate existing passwords or fabricate recovery copies.

Apply `20261107000005_require_recoverable_coordinator_password.sql` to enforce recoverable storage on every future password write. Existing hash-only entries cannot be reconstructed by this migration.
