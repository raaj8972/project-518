# Pre-launch security remediation — 24 November 2026

**Status: application/database fixes applied; launch sign-off is still blocked by external credential rotation, historical secrets and backup/deployment verification.**

The user's approval authorized fixes after the initial audit. Existing student/dashboard work was preserved. No Git history rewrite, force-push, production hosting deployment or paid plan change was performed.

## Applied and verified

| Finding | Resolution | Evidence |
|---|---|---|
| Duplicate IQMG accounts | Existing normalized database unique constraint retained. A second email cannot claim an already-reserved number. Initial Google/Auth sign-in remains possible before IQMG collection. | IQMG/team database and onboarding tests pass; live two-account private-row checks pass in both directions. |
| Anonymous privileged RPCs | Revoked public/anonymous execution on security-definer functions except explicit presentation/RLS helpers. Legacy registration, scan, cleanup, password-only council and coordinator-token endpoints are server-only. | Live grants confirm browser registration/cleanup bypasses are closed. |
| Admin RPC authorization | Current admin RPCs check a current session and assigned management page. VIP creation/deletion requires authorized pass-management access or the trusted council server; council cannot delete ordinary student passes. | Unit/database tests; authorized admin create/update/delete round trip in a rolled-back live transaction. |
| Exposed default council passcode | Removed the seeding/reset from the older migration. Rotated the live council password to a strong random value and stored a matching encrypted owner-readable copy. Restored the existing missing portal-password-vault migration, enabling the current Access Center backend. | Old seed no longer matches live hash; rotated credential verification passes. No password value is included in this document. |
| Council authentication bypass | `council-manage` accepts issued sealed sessions, never a raw password. Updated all council tabs to send `councilToken`. Login fails closed if rate-limit data is missing. Every request rechecks the current password and enabled flag. | Cookie, bearer, body-token, rotation/disabled-portal and raw-password rejection tests pass. |
| Anonymous storage writes | Added restrictive insert/update/delete policies over all legacy permissive grants. Staff writes respect bucket/page scope; students can upload only their own avatar/registration paths or owned team-branding paths. Retired obsolete scripts that restored anonymous writes/public private photos. | Anonymous insert/update/delete and cross-student overwrite tests pass. |
| Private registration photos | Made registration photos and chat attachments private. Existing photo associations were frozen into a server-only RLS table. New associations require the real uploader or trusted staff; changing a registration URL alone cannot grant access. | Anonymous listing changed from 21 objects to 0; forged-photo-URL tests pass. |
| Photo previews/downloads | Added authenticated short-lived signing for private media in registration, annual/sports and storage/photo panels. Stored stable object references remain intact. Signing cache clears when accounts change; mounted private links refresh. | Private-media tests, TypeScript and production build pass. |
| Contact-data reads | Audition/membership contact reads require the assigned staff page. Intended public submission access was retained. | Anonymous/ordinary-student negative tests; assigned staff positive tests. |
| Cancellation ownership | Cancellation is restricted to the signed-in student’s own inactive entry. A captain/team-name match cannot delete another student or a same-name team. | Cross-account, same-name-team, revoked-session, active-entry and own-entry tests pass. |
| Sports/annual writes | Added missing restrictive write guards: students can submit their own pending entry, but cannot forge another user, approve themselves, or edit/delete entries. Staff retains assigned-page access. | Own submission, forged identity, self-approval, update/delete and authorized staff tests pass. |
| Upload restrictions | All 29 live buckets now have MIME and size restrictions. Active HTML/SVG uploads are excluded; staff SVG watermark/stamp inputs are sanitized and rasterized into PNG before storage. R2 upload signing requires administrator access. | Live unbounded-bucket count: 0. Browser MIME declarations do not replace a malware scan; no full malware-scanning pipeline is claimed. |
| XSS | Escaped participant names/pass types in printed HTML. Replaced raw event-rule HTML preview with escaped React text. | Hostile names remain text and create no injected script/event-handler elements. |
| Secret-file tracking and checks | Untracked `.env.netlify` while retaining the ignored local file. Removed the obsolete public council-secret environment variable locally. Scanner now includes new untracked source files and can scan reachable Git history. Added CI checks and gated the deployment build on the history scan. | Current source/build scan: zero detected findings. Historical scan still fails, correctly. |
| Unknown wrapped API policies | Unclassified endpoints fail closed; legitimate public reads and native WebAuthn handlers remain explicitly classified. | Existing API security tests pass; modified server functions bundle successfully. |

## Live migrations

- `20261107000006_portal_password_reveal` — restored the previously missing existing vault schema/function.
- `20261124010000_prelaunch_security_remediation`.
- `20261124011000_private_registration_photo_readers`.
- `20261124012000_council_enabled_session_guard`.
- `20261124013000_sports_registration_write_guards`.
- `20261124014000_registration_cancellation_ownership`.

New migrations were validated against the live schema in rolled-back transactions before committing. The council rotation was committed with the primary migration. Validation did not leave fixture registrations or passes behind. Existing live registrations, passes and uploaded objects were not deleted.

## Validation

- **18 focused suites / 148 tests passed.** This covers authorization boundaries, council sessions, IQMG/team requests, checkout, onboarding, WhatsApp access and support routing.
- Application TypeScript check passed.
- Production frontend build passed; modified backend functions bundled successfully.
- Current source and production artifacts passed the secret scan.
- Live read-only A/B student checks: each can read its own profile and cannot read the other's private profile, registrations, passes or IQMG identity.
- Live metadata confirms **118/118 app/storage tables have RLS enabled**.
- The rotated council hash matches; a rolled-back check confirms the credential works when enabled. The live council portal is currently **OFF**; that existing setting was preserved and now correctly blocks login. The owner can reveal the new password from the existing Access Center.
- Anonymous live reads return zero audition contacts, membership contacts and registration-photo objects.
- No full deployed browser penetration test or backup restore drill is claimed.

## Still required before launch

### 1. Rotate remaining provider credentials and update every deployment

The historical Supabase service-role credential remains valid until revoked. R2 and Redis credentials also require provider-side rotation; replacing source text does not revoke them. Council rotation is complete.

Before disabling the legacy Supabase key pair, update every browser/server deployment to the appropriate replacement keys. Supabase's legacy anonymous and service-role keys are coupled; changing this without updating the hosting project can stop existing deployments. Use the [official leaked-key rotation procedure](https://supabase.com/docs/guides/security/rotate-leaked-api-keys).

The current vault derives encryption from `PORTAL_PASSWORD_VAULT_KEY`, falling back to the service key. When rotating that fallback, first re-encrypt **both portal and coordinator vault copies** under a dedicated independent vault key and update all server deployments together. Do not silently change the fallback key and lose owner-readable passwords.

Available access was checked: saved Netlify authentication returned no matching RICORRENZA site/repository; saved Vercel access returned HTTP 403. The locally saved Vercel project has a different project name and was not modified. Local configuration has R2/Redis data credentials, not the management access needed to rotate them.

**Needed:** correct hosting project/account and Cloudflare R2 / Upstash management access, plus confirmation of any additional deployments consuming these credentials.

### 2. Purge historical secrets after rotation

Reachable Git history still contains secrets. The new history check reports them and will block the deployment build until resolved. No history rewrite or force-push was attempted against the shared repository while provider rotation/deployment scope remains unresolved.

After rotation, prepare a sanitized mirror, remove credential files and exact exposed values across all relevant refs, validate the cleaned mirror, then coordinate the history replacement with repository users. Remove old deployment assets/caches where relevant. Cleaning only the current branch or working tree is insufficient; old clones and remote refs may retain the original history.

### 3. Establish backups and verify restoration

Supabase reported no listed backups and PITR disabled. No direct PostgreSQL backup connection/password or independent off-site backup/restore evidence was available. The variable named `SUPABASE_DATABASE_URL` currently contains an HTTPS API URL, not a PostgreSQL dump connection.

Configure provider backups/PITR where appropriate, or encrypted scheduled PostgreSQL exports to a separate off-site destination; include uploaded objects separately. Use a dedicated encryption key. Perform a restore drill into an isolated environment. No paid add-on was enabled. See [Supabase's backup guidance](https://supabase.com/docs/guides/platform/backups).

### 4. Verify actual production deployment

HSTS/CSP/nosniff configuration is present, but the canonical domain failed DNS resolution from the audit environment. Once the correct deployment is available, verify HTTPS redirection/certificates, effective response headers, browser-served assets, and every relevant role's actual UI flow.

**Do not treat the completed code/database checks as final launch approval while these items remain open.**
