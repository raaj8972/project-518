# Local performance repairs — 2 November 2026

The loading gate, startup request explosion, public admin-bundle download, repeated Storage scans and stale realtime refreshes have been repaired. The development server remains available at http://localhost:8081/.

## Measured before and after

| Local cold visit | Loading overlay before → after | Requests before → after | Transfer before → after |
|---|---:|---:|---:|
| Development homepage | 11.69 s → **0.61 s** | 1,722 → **269** | 25.46 MB → **8.80 MB** |
| Production-build homepage preview | 10.81 s → **1.16 s** | 184 → **157** | 6.43 MB → **1.99 MB** |
| Production-build Events preview, final check | 7.14 s → **1.94 s** | 146 → **90** | 2.21 MB → **1.04 MB** |

These are individual desktop lab captures with an initially empty normal browser cache, no throttling, service workers blocked and a 25-second observation window. They measure loading-overlay removal, not complete page load or field Core Web Vitals. Backend/network variation affects timings; an earlier Events sample was 0.68 s before its final winners-query repair. No JavaScript errors or failed HTTP responses appeared in the final recorded Home/Events captures.

The configured first landing page is `/gallery`. Its redirect now uses internal navigation and keeps one document instead of reloading the app. To compare the actual Home route, the after-home captures set only the once-per-session `rico_landed` flag; authentication and application data caches started empty. The earlier broken settings fetch had prevented this configured redirect from being applied.

Browser REST reads fell from 63 to 30 on the development homepage, 50 to 30 on the production homepage and 45 to 15 on Events. A separate same-origin request now reads public security settings on the server. Individual Lucide module requests fell from **1,439 to zero**; the icons are bundled. The anonymous production homepage no longer downloads the admin dashboard chunk.

## Implemented changes

- **Startup:** providers load according to the route and verified admin state. Private management registrations, applications and administrator records are excluded from public startup. Sports administration data waits for the actual admin route. Public content waits only for essential site/branding settings; the staged domain gate and delayed fullscreen animation were removed.
- **Settings:** independent settings commit separately, so one failure no longer discards successful settings. A server endpoint returns an explicit allowlist of public security fields without requiring the missing public view. Passwords, hashes and future private columns stay server-side. Hero media now uses `page_key` rather than comparing the numeric ID with `home`; saves retain an existing row ID.
- **Bundles:** automatic route splitting replaces the chunk rules that pulled shared dependencies into the public admin download. Lucide dependency optimization is enabled. TOTP/crypto code loads when 2FA is used. Unused global DotLottie loading was removed.
- **Client environment:** automatic export of all `VITE_*` values is disabled. Explicit filtered public definitions work for both direct and whole-environment reads. Final client assets contain zero matches for the five checked long private environment values, including the legacy council secret found during verification. Server credentials remain available to server handlers.
- **Database reads:** equivalent in-flight reads share a request. Cached counts/nulls are preserved; invalidation generations stop older responses from repopulating stale caches. Cache namespaces separate authenticated sessions/role metadata. A stalled read aborts after 12 seconds rather than allowing a 94.5-second retry path.
- **Realtime:** enabled domains invalidate affected table caches and coalesce bursts before refreshing. Events reads run concurrently and independent failures no longer discard the whole domain. Sports and annual sports have enabled-aware subscriptions.
- **Storage:** page, usage, breakdown and top-file views share one sorted inventory per bucket, with in-flight sharing and a short cache. Recursive listing has a six-request concurrency limit and requests larger pages while advancing by actual response size. Deletion and manual refresh invalidate the inventory. Top-file selection no longer repeatedly re-enumerates the bucket.
- **Student dashboard:** Dashboard, Active Events, Top Stars and winner-profile ranking inputs share four parallel datasets with caching and a shared realtime subscription. Initial student profile reads are deduplicated, token refreshes avoid loading churn, and a late profile result cannot restore a signed-out user. Admin initialization coalesces overlapping auth work while retaining access checks.
- **Coordinator:** the artificial 2.5-second splash is removed. A 30-second polling fallback runs only while realtime is disconnected and the page is visible.
- **Rendering:** event cards own their countdown updates through one shared clock; the whole Events page no longer ticks every second. Hover listeners have cleanup, cards are memoized, offscreen motion posters defer loading/pause, hidden live buttons wait until their display window, and navbar scroll bookkeeping uses a ref. Hero walking updates are capped at approximately 30 fps. Overlapping background rendering was reduced.
- **Media:** the fallback background video is approximately 0.74 MB instead of 3.78 MB, with a poster; the original asset is retained. Login uses the optimized version too. Hover/click audio is loaded on interaction.
- **Gallery/CR:** gallery metadata batches have bounded concurrency and no callback-driven duplicate full fetch. CR bulk approval sends bounded batches of eight requests.
- **Winners:** the final Events network check uncovered a missing database relationship. Winning round records now join only their registration IDs through separate bounded requests under the client's existing RLS permissions. Hidden registrations remain hidden, and an empty winners list causes no registration download.

## Verification

- **39 tests passed** across five files, including new regressions for read sharing, timeout aborts, role/session cache boundaries, invalidation races, Storage sharing/deletion, ranking sharing, public settings projection, winners without a database FK, student auth races and the shared clock.
- Application and Vite/server TypeScript checks passed; production build passed.
- **14 anonymous public/login routes** rendered without JavaScript startup errors. The student dashboard correctly redirected an anonymous visitor to student login.
- Events → Gallery navigation and the configured initial landing both remained within one document.
- The existing complete repair migration passed the isolated PGlite regression covering checkout, payments, CR scoping, scans, revocation and private-field protection. This did not modify the configured Supabase database.

## Practical limits and deployment

This work is local. No deployment, live migration, external approval action or credential rotation was performed. Authenticated student/admin/coordinator journeys were not timed with real accounts. The previously prepared functionality migration is still required for its protected staff/RPC flows; the public-settings fallback does not replace that migration.

The first full Storage usage calculation still enumerates the bucket once. Later views reuse it; a server-maintained aggregate/index would be needed to avoid all enumeration for very large inventories. Rankings still use client-side scoring of shared datasets within current backend row limits; moving scoring into a backend aggregate is a further scaling change. Previously exposed credentials should be rotated as part of the earlier deployment/credential remediation.

## Evidence

- [Before/after metrics](2026-11-02-performance-comparison.json)
- [Development homepage capture](2026-11-02-performance-after-browser-dev-home-normal-cache.json)
- [Production homepage capture](2026-11-02-performance-after-browser-production-home-normal-cache.json)
- [Final Events capture](2026-11-02-performance-after-browser-production-events-normal-cache.json)
- [Route and navigation smoke checks](2026-11-02-performance-route-smoke.json)
- [Build dependency/size inventory](2026-11-02-performance-after-bundles.json)
- [Client environment verification](2026-11-02-performance-client-env-check.json)

Temporary build/browser/encoder tools were kept outside the repository. Existing user changes, including the sitemap modification, were preserved.
