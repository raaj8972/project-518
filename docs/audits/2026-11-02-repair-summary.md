# Website repairs — 2 November 2026

Implemented the findings in the [initial audit](2026-11-02-website-audit.md). These are local code and migration changes. The live Supabase database was not altered, and no real emails, payments, registrations, approvals, or deletions were submitted during verification.

## What changed

| Area | Repairs |
|---|---|
| Student dashboard | Correct registration statuses; working calendar download and share links; event deep links open the selected card; PDF save/share, directions and current gate-status checks; ranking counter fixed; invented participants removed. |
| Checkout and teams | Current prices, payment recipients and limits are fetched before checkout, including persisted carts. Group owners and accepted members are deduplicated correctly. One database transaction creates registrations and payment references, rolling back on failure. Partial checkout success removes only completed items. |
| Admin | Roadmap provider fixed; event-form JSX corrected; team image-upload props corrected; security controls implemented; real password reauthentication replaces the nonempty-PIN check; notifications, support, logs, student-pass details and archive controls connected. Storage listing, totals and deletion now use real storage operations. |
| Coordinator | Password verification runs on the server and issues a real event-scoped session. Public event records no longer retain coordinator passwords after the migration. Chat and rounds use the signed-in identity. The warning popup import is fixed, round numbering handles deleted rounds, refresh failures are reported, and payment approval updates payment/registration state atomically. |
| CR | Server verification issues a batch-scoped session. Passwords are hashed and not stored in sessionStorage or publicly readable rows. The approval RPC checks the signed identity and target student's actual batch. |
| Council and sports | Council login and dashboard RPCs use the same passcode hash. VIP queries return text pass types and validity dates. Sports login uses current Supabase settings and a one-time login token instead of returning the account password. |
| Security / gate | Security login establishes a real session. Online and offline scan synchronization use one authorized, atomic, idempotent RPC. Invalid dates and duplicate entries are checked in the database; local restrictions run before consumption. Search filters run on the server and full pass sync paginates. |
| Public media | Home Bound play controls open configured music links; unavailable music is disabled instead of appearing interactive. The missing noise asset is replaced by a local SVG. |
| Backend and deployment | Vite serves real local API responses for both legacy Netlify handlers and Request/Response functions. Vercel has a generated adapter for the same handlers, including legacy URL rewrites. Scheduled cleanup requires `CRON_SECRET` through this adapter. Obsolete Firebase reset references were removed. |
| Access control | Hardcoded privileged client JWTs removed; private VITE-named secrets excluded from the client build; client master-key headers and virtual rescue state removed; whitelist timeouts deny access; old undefined-secret authorization checks fixed; public staff-password and pass-token reads removed by the migration. |

The old “Add to Wallet” control is now **Save Pass**, which downloads a usable QR-code PDF. Native Apple/Google Wallet signing is not claimed. The Protection Center now shows recorded activity and real availability controls instead of announcing a simulated integrity scan. The old Documentation placeholder now opens section search.

## Verification

- Application TypeScript check passed with strict/unused checks retained.
- Vite/server configuration TypeScript check passed.
- Full test suite: **25 tests passed**, including **20 repair regression tests**.
- Isolated PostgreSQL/PGlite test: the complete migration executed, and checkout, payment rollback/approval, group membership, CR batch boundaries, credential visibility, coordinator isolation, scan consumption, retry idempotency, wrong-day rejection, VIP dates and session revocation checks passed.
- **379 source modules** returned HTTP 200 from the development server.
- **59 backend functions plus the Vercel adapter** compiled successfully.
- Production Vite build passed. It retains nonblocking warnings about modules that have both static and dynamic imports.
- Built JavaScript was scanned for JWT payloads: public anonymous keys only; **zero service-role keys**.
- Local HTTP checks: website/health 200; login/email handlers reject GET with JSON 405; unauthenticated scheduled handler returns JSON 401; missing API returns JSON 404.
- `git diff --check` passed.

The results are also recorded in [repair-checks.json](repair-checks.json) and [post-repair-module-http.tsv](post-repair-module-http.tsv).

Browser automation remains unavailable because the browser connection fails before initialization. Real authenticated acceptance tests on desktop/mobile, camera hardware, email delivery, AI providers and cloud storage still need the configured deployment and authorized test accounts. Passing compilation and regression tests does not establish that every live workflow has passed.

## Required rollout work

1. **Rotate/revoke the previously exposed Supabase service-role key.** Removing it from source does not revoke copies in old builds or history. Update the server's service-role credential; if your rotation also changes the anonymous key, update the public client key too.
2. Apply [20261102000000_functionality_repairs.sql](../../supabase/migrations/20261102000000_functionality_repairs.sql) to the intended Supabase project through the normal migration workflow **before deploying this frontend/backend version**. It replaces credential access and staff-session policies and introduces the transactional checkout and scan RPCs. Back up the database and review the migration against the actual deployed schema first.
3. Configure backend-only `SUPABASE_SERVICE_ROLE_KEY`, Supabase URL and anonymous key, plus the existing email/storage/AI provider settings for the features in use. `GOOGLE_API_KEY` is server-only. Set `CRON_SECRET` for Vercel scheduled endpoints. Optional recovery uses server-only `MASTER_PASSWORD`; retire the old client-exposed bypass value. Do not put privileged credentials in VITE-prefixed variables.
4. Existing coordinator, CR and security browser sessions must sign in again. Sports access requires the existing `sports.council@rico.family` administrator registry/account; create it using owner controls if absent.
5. Deploy and run role-by-role acceptance tests with disposable data. New staff login and transactional operations deliberately fail closed if the migration or required server credentials are missing.

No production deployment or key rotation was performed. The pre-existing change to `public/sitemap.xml` was preserved.

## Reproduce locally

```sh
npm run check:types
npm test -- --run
npm run test:database-repairs
npm run prepare:vercel
```

The application is running at `http://localhost:8081/`. On this machine the default Node path points to an incompatible Intel executable; the server was launched with the compatible Node executable using `PATH=/usr/local/bin:$PATH npm run dev`.
