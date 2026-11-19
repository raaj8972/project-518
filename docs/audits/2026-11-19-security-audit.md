# Website security audit — 19 November 2026

**Status: database restrictions verified live; local security checks pass.** The owner-applied SQL now denies anonymous reads on all 22 checked private tables and seven private-column selections, rejects the introspection RPC and accepts the four safe public views. The public-key control request succeeds, so the denials are not caused by a revoked or invalid API key. Deployment of the local application changes and rotation/retirement of historical credentials remain unverified.

The audit covered the React application, public/build files, Vite environment handling, Vercel and Netlify routing, 65 shared API modules, authentication and permission checks, uploads and image fetches, database migrations, reachable Git history and dependency advisories. Evidence contains statuses and metadata only; credentials and personal record values are omitted.

## Confirmed findings and changes

| Severity | Finding | Source remediation / current state |
|---|---|---|
| Critical | Anonymous Supabase requests returned rows from `profiles`, `registrations`, `entry_passes`, `payment_submissions`, `conversations`, `batch_crs` and `security_settings`. Zero-row column-permission checks also accepted registration email/phone/team data, pass tokens, payment references, batch passwords and the council password hash. | New migration revokes anonymous table and column grants, adds restrictive ownership/role policies (including accepted-group access needed by checkout), and exposes explicit public ranking/profile/winner views. **The original anonymous exposure is now confirmed closed on the checked tables/columns.** |
| Critical | Passkey enrollment accepted a supplied account ID and email without authenticating their owner. The service-role backend could enroll an attacker credential against another account. | Registration challenge and verification require a current authenticated identity; account ID and email come from Auth. Login resolves the canonical account by credential owner, uses a configured origin, requires user verification, validates expiry, atomically consumes a challenge and keeps OTP verification off the shared privileged client. New tests check enrollment rejection before credential work. Previously enrolled credentials are retained but marked unverified; users must enroll again after the release. |
| Critical | Privileged Supabase JWTs and private-key material exist in reachable Git history. The scan found 29 matching blob versions across 15 paths. Current code also had an unused Redis credential fallback, a council-password fallback and tracked deployment credential configuration. | Removed the client Redis module, moved its configuration to a server-only helper, removed the password fallback and sanitized `.env.netlify`. Added environment ignore rules, an explicit public-variable allowlist, privileged-key rejection, and a build secret scanner. **Removal cannot revoke historical credentials; rotate/revoke them through the providers.** |
| High | API admin verification granted privileges from hardcoded owner email strings or email aliases, beyond current registry membership. Old admin-management routes also accepted a shared master header. | Server access now requires a verified, unrevoked Auth identity and a matching `admin_users.user_id` with an allowed role. Removed the email-based browser bootstrap and old header bypass; the shared-master login endpoint now returns 410 and directs users to email recovery. |
| High | Bulk event email accepted any signed-in account. Face indexing and heartbeat mutations had no effective login gate. Several service-role operations checked only generic admin membership. | Native function export guards cover Netlify and Vercel alike. Mutations check current identity, owner status or assigned management pages before side effects. Authenticated frontend callers were updated. Coordinator registration changes now check signed event scope. |
| High | Image proxy fetched arbitrary URLs, followed unchecked redirects and accepted arbitrary response types/sizes. Vision indexing could load arbitrary URLs or local paths. | Added trusted-host HTTPS allowlists, redirect revalidation, credential/port restrictions, timeouts, byte limits and raster-image types. Drive and vision image loading use the same bounded fetcher. Custom approved image hosts can be configured with `IMAGE_PROXY_ALLOWED_HOSTS`. |
| High | 2FA was checked in browser code, exposed its stored shared secret to the browser and could be skipped through the hidden master route. | Replaced it with Supabase native TOTP enrollment/challenge APIs. Verified factors require `aal2` in API token verification and database session checks. Login retains credentials only in component memory, supports session step-up, and discards legacy stored fast-track passwords. **Users of the old custom TOTP flow need to enroll in native MFA; old browser enrollment is not migrated automatically.** |
| High | Dependency audit reported 107 findings: 4 critical, 45 high, 45 moderate, 13 low. | Updated compatible dependencies, mail/image/spreadsheet packages and the Netlify CLI; removed an unused Vercel runtime dependency used only for TypeScript types. Final audit: **0 critical, 0 high, 30 moderate, 6 low**. Advisory counts describe packages, not proof of reachable application exploits. Full results are saved separately. |
| Medium | Vercel set wildcard CORS globally and lacked the browser security headers already present in Netlify configuration. | Added CSP, frame denial, MIME sniffing protection, referrer/permission policies and HSTS; removed global wildcard API CORS. Restricted production script evaluation to WebAssembly needs. Inline script/style allowances remain for current application compatibility. |
| Medium | Some API errors and logs exposed internal details; the health endpoint advertised configuration state. Sensitive responses lacked consistent cache controls. | Guarded handlers suppress server-error details and add no-store response headers. Removed configuration fingerprints and passkey/token debug logs. Moved diagnostic scripts out of deployable functions. |
| Medium | Upload signing trusted unbounded file metadata and generated weak random names. | Enforced metadata types, matching MIME/extension, a positive signed size of at most 100 MB, a random UUID under the authenticated user prefix and no active SVG uploads. Restricted spreadsheet imports to 5 MB / 5,000 rows. Pass generation now uses cryptographic UUIDs. Content scanning after upload remains outside these checks. |
| Medium | Instagram embed settings could inject an HTML attribute; startup errors were interpolated into HTML. | Strict Instagram URL parsing and canonical reconstruction; startup messages use `textContent`. |

## Rollout order

1. Rotate/revoke historical privileged Supabase keys, Firebase private credentials, Redis tokens and exposed passwords that remain active. Update provider/hosting secret stores; do not put private credentials in browser variables or commit them. Coordinate legacy Supabase JWT rotation with the replacement public key if required by the provider.
2. In the intended Supabase project's SQL Editor, review and run `supabase/migrations/20261119000000_security_boundaries.sql`. It is transactional and now defines its own session, admin, coordinator and security authorization helpers, including prerequisites missing from the live schema. Stop on an error and inspect it; do not remove failing security statements to force a partial application. No application records are deleted. The migration connection attempted by this audit failed password authentication, so it was not used to alter production.
3. Deploy the matching frontend and API source together. The new request limiter deliberately returns 503 if its database function is missing. Set server-side `APP_URL=https://ricorrenza.fun` (or the actual canonical origin); configure additional hosting/preview origins through the documented environment settings. Keep the existing `CRON_SECRET` and provider credentials server-side.
4. Re-enroll existing passkeys, since old enrollment did not establish ownership. Enroll old custom-TOTP users in Supabase native MFA. Confirm Supabase Auth MFA is enabled and test password and Google sign-in followed by a genuine second-factor challenge. Confirm account recovery and owner access with a disposable account before general release.
5. Repeat anonymous table/column checks: private reads must return permission-denied or zero permitted rows, while safe public views and public settings still work. Test two separate student accounts, scoped coordinators, unassigned admins, owners and revoked/AAL1 sessions. Verify winners/rankings, checkout, pass generation/scanning and authorized upload/email operations against disposable data.

No production deployment, credential rotation, email send, payment, registration, destructive database operation or authenticated production mutation was performed by this audit.

## Verification and limits

- Application TypeScript, server/Vite TypeScript and focused strict server TypeScript checks pass.
- All 65 shared API modules and the Vercel adapter compile. Local HTTP checks return 401 for anonymous email/upload/face-indexing calls, 410 for retired master login, and 403 for environment/Git/SQL/server-source files. The image proxy rejects local/private and file URL targets with 400; unauthorized scheduled calls return 401.
- Production build passes; the build artifact scanner reports no matching local private values, privileged Supabase JWTs, private keys or sensitive deployment artifacts.
- 26 security tests pass, including real isolated PostgreSQL/PGlite policy tests against deliberately permissive legacy policies and column grants. The targeted security/login/performance/deployment checks also pass.
- Latest full local suite: 672 pass, 2 fail in `tests/spider-video.test.tsx`. Those two hero presentation expectations also failed in the first audit test run, before the authentication/MFA changes. The pre-existing uncommitted hero and atmosphere work was preserved and excluded from the security commit. The same two hero fallback-image expectations also fail in the isolated staged snapshot.
- Direct public website HTTP checks failed DNS resolution for `ricorrenza.fun`. The browser-search service returned an old indexed page, which is not current header/TLS verification. Live Supabase HTTPS checks did succeed.
- No authenticated production test accounts were exercised. RLS fixtures verify the migration's behavior, not a byte-for-byte copy of the currently deployed schema. The production schema/role inventory could not be read through the rejected migration connection.
- Lower-severity dependency advisories remain. Council's legacy analytics flow still retains its passcode in session storage and requires a separate signed-session migration. This audit does not certify every existing database SECURITY DEFINER RPC or public storage object as safe; review those against the production schema and intended audience after access is restored.

Evidence: `2026-11-19-security-results.json` and `2026-11-19-dependency-audit.json`.

Reproduce local checks:

```sh
npm run check:types
npx tsc -p tsconfig.node.json --noEmit
npm test -- --run
npm run build
npm run check:security
npm audit
```

Public Supabase anonymous/publishable keys and API URLs will remain visible to browsers by design. The security boundary is permissions and RLS, while secret/service-role keys must remain backend-only. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Supabase data security](https://supabase.com/docs/guides/database/secure-data), [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa) and [OWASP API Security](https://owasp.org/projects/api-security-project).

## SQL prerequisite correction

The first manual attempt reported PostgreSQL error 42883 because `public.coordinates_event(text)` was absent. The migration file was subsequently found to contain the error message rather than SQL. Restored the full migration and added self-contained session tables, admin permission columns and authorization functions before policy creation. The database fixture no longer preinstalls those helpers; it now tests installation without them, signed event isolation, configured and legacy admin permissions, anonymous denial and safe reruns without deleting records. The updated migration still requires application and a live access recheck; local success is not a production success claim.

## XP schema correction

The next manual attempt reported error 42703 because `student_xp` identifies profiles through its `id` column, not `user_id`. Corrected the public profile view to join `student_xp.id = profiles.id`. The database regression fixture now loads the actual saved `student_xp` CREATE TABLE statement and checks that two profiles receive their own XP totals and tiers. The focused API/database suite passes 22 tests. Production application is still unconfirmed.

## Completed migration and local recheck

Confirmed with the intended Supabase anonymous key: 22 private tables, seven private-column selections and the schema-introspection function all return permission denied (SQLSTATE 42501); four explicit public views return 200. A deliberately invalid signed-user JWT is rejected with 401/PGRST301. No private record values were displayed.

At the owner's request, continued app verification locally. All 63 core HTTP/proxy/scheduler checks passed: 41 protected POST routes, the private account-directory GET, legacy-header rejection, cross-origin rejection, private-file blocking, disabled master login, unknown routes and the 6 MB request limit. The local backend credential passed a zero-row admin-table read. Source/build secret scanning found no matching private values or privileged JWTs; production build, application/server type checks and all 66 API compilation checks pass. The dependency audit still reports zero critical/high findings and 36 moderate/low findings.

The follow-up source review found residual shared-master authorization in `list-admin-users` and `force-logout`. Replaced both with current owner-session checks, added method/cache/error guards, and verified the old headers no longer grant access. Coordinator AI requests now use the common revocation/MFA verifier and rate limiter; passkey list/delete responses use the common private-response guard. Three additional regression tests cover these cases. The focused security suite passes 26 tests; the full suite passes 671 with the same two pre-existing hero/UI failures.

No production application deployment was performed. Credential rotation/retirement and authenticated acceptance tests remain necessary before giving a production security assurance. Hosted-domain DNS failure prevented HTTP/TLS/header verification; the user selected local testing instead.

Manual bulk-mail scheduling also now requires owner or assigned registration-page access, with a separate configured cron secret for automated GET requests. A regression test verifies that a gallery-only admin cannot invoke it. The final focused security/deployment set passes 27 tests, and all 63 local HTTP/proxy/scheduler checks pass.

## Push preflight

Verified the isolated staged security snapshot without the four unrelated hero/atmosphere files: production build, application/server type checks and secret scan pass; full tests report 672 passing and the same two known hero/UI failures. Validated workflow YAML and moved optional Netlify credential conditions to the supported step/environment form. No private local environment files are staged.
