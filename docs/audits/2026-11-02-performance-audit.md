# Local website performance audit — 2 November 2026

Follow-up: [performance repairs and measured results](2026-11-02-performance-fixes.md). The findings and measurements below describe the pre-repair snapshot.

The largest confirmed delays are the global startup data gate, a loading overlay that remains for several seconds after the app starts, and excessive JavaScript loading. Local development adds a separate problem: 1,439 individual Lucide icon module requests. There are also confirmed backend/schema errors and expensive refresh patterns in the panels.

## Measurements

These are local measurements, not deployed-site measurements. The user confirmed that local inspection is sufficient. “Production preview” below means a fresh production build served locally on port 8082; the development server remains on port 8081.

| Cold visit | Total requests | Recorded transfer | Database GETs / preflights | Loading overlay removed |
|---|---:|---:|---:|---:|
| Development homepage, localhost:8081 | 1,722 | 25.46 MB | 63 / 63 | 11.69 seconds |
| Production preview homepage | 184 | 6.43 MB | 50 / 50 | 10.81 seconds |
| Production preview Events | 146 | 2.21 MB | 45 / 45 | 7.14 seconds |

MB uses decimal bytes. Request counts include aborted requests and preflights; preflights are **not** additional database reads. Recorded transfer sums completed CDP network transfer values, so aborted transfers may be undercounted.

HTML response times were approximately 16.5 ms, 1.6 ms and 2.8 ms respectively. First contentful paint was 2.08 s, 0.78 s and 0.94 s, but that early paint includes loading UI. It does not mean the page was available for interaction. The difference between fast HTML and a persistent overlay demonstrates a client startup/loading problem in these local runs.

Method: isolated desktop headless Chromium, 1365×900 viewport, fresh anonymous context, initially empty normal browser cache, service workers blocked, no CPU/network throttling, 25 seconds of observation after DOMContentLoaded. The app contacted its configured Supabase backend. These are individual lab samples, not field Core Web Vitals, INP measurements, or production database execution profiles. The Vite development module cache had already been warmed. Backend response timing includes network latency and contention.

The initial cache-disabled diagnostic amplified repeated video transfers. It is excluded from this baseline. Normal-cache instrumentation observed one video mount, no video removals and one completed full fallback-video download; a video remount/download loop is **not** confirmed.

## Prioritized findings

### 1. High — Every fresh route boot loads unrelated data domains

`src/App.tsx:359–363` and `src/context/CombinedDataProvider.tsx:98` mount the core, events, personnel, management, sports, annual sports and gallery-settings providers globally. Even a login or student route starts these domains.

The normal cold-start source path contains **43 logical read calls before route-specific queries**: core 7, events 8, personnel 8, management 9, sports 8, annual sports 2, gallery settings 1. This is a source count; caches, authentication and failures change the actual network count. The production homepage observation recorded 50 database GETs. SPA navigation does not necessarily repeat the entire cold-start sequence, because these providers remain mounted.

Sources: `CoreDataContext.tsx:232`, `EventsContext.tsx:94`, `PersonnelContext.tsx:112`, `ManagementContext.tsx:110`, `SportsContext.tsx:90`, `AnnualSportsContext.tsx:55`, `GalleryContext.tsx:64`.

**Fix direction:** keep essential public settings global; load domain data when its route/role needs it. In particular, public startup should not request management/admin data. Deduplicate the annual-sports and admin-user reads. Gallery image metadata is initially deferred; this finding does not mean all gallery images download globally.

### 2. High — Public access waits behind staging and an animated loader

`CombinedDataProvider.tsx:33–72` stages domain loading with 50 + 200 + 200 ms of deliberate delays and a 2.5-second fallback for each of three stages. Public routes wait on stage 3 (`App.tsx:304–329`), including unrelated management and sports domains. Portals bypass this overlay, but still run those providers.

`src/components/ui/Preloader.tsx:50–97` then catches progress up per animation frame and waits another **300 + 250 + 500 = 1,050 ms** before calling completion. Animation and exit handling can add further time. The 15-second “failsafe” at line 82 only logs a warning; it does not dismiss the loader.

**Observed effect:** the overlay remained until 10.81 s on the production-preview homepage and 7.14 s on Events. Those are overlay-removal times, not a claim of measured time-to-interactive.

**Fix direction:** render the page shell immediately, use local section skeletons and gate only on data required for the current view. Completion animation should not block interaction after essential data is ready.

### 3. High — Admin code is eagerly downloaded on public pages

The fresh production manifest makes both the HTML entry and `vendor-core` statically import `assets/admin-BXkY4hgz.js`. The observed anonymous homepage request confirms this is an actual download, despite the route using `React.lazy`.

| Artifact | Raw bytes | Local gzip estimate |
|---|---:|---:|
| Admin chunk | 2,320,881 | 610,917 |
| Vendor core | 941,841 | 256,690 |
| Main CSS | 403,070 | 49,662 |
| Entry + App static dependency closure, including CSS | 3,884,840 | 989,998 |

The homepage run transferred approximately 1.58 MB of scripts in total, including later imports and external scripts. The closure figures above exclude those later requests and media.

`vite.config.ts:84–106` manually groups dependencies. Its broad `id.includes('react')` condition also catches `lucide-react`, making the following `vendor-ui` branch unreachable for that package. The emitted dependency graph, rather than the intended chunk names, proves that public/admin separation currently fails.

**Fix direction:** revise chunk grouping and shared-module ownership. Acceptance check: an anonymous public page must not import the admin route chunk; PDF/export and management tools should download only when needed.

### 4. High for localhost — Lucide is excluded from dependency optimization

`vite.config.ts:41` explicitly excludes `lucide-react`. The development homepage loaded **1,439 icon module scripts**, contributing to 1,722 total requests. The normal-cache development run transferred approximately 25.46 MB overall. Production bundles the icons, so this particular request explosion explains the extra localhost cost; it does not describe production network behavior.

**Fix direction:** let the dependency optimizer bundle the icon package, then verify the development network waterfall. Optimize the complete shared icon import path rather than loading the library as thousands of browser modules.

### 5. High — Two real backend mismatches break startup configuration

The anonymous browser and separate minimal read-only requests confirmed:

| Request | Response | Exact error |
|---|---|---|
| `security_settings_public` | 404, `PGRST205` | Public view/table is absent from the REST schema cache |
| `hero_media` filtered with `id=home` | 400, `22P02` | `invalid input syntax for type bigint: "home"` |

`CoreDataContext.tsx:232–269` puts all seven settings reads in one `Promise.all` and commits the results only after all succeed. The missing security view therefore prevents the six successful settings reads from being applied by this function. It also leaves the startup flow working through error/fallback paths.

The security view is a dependency introduced by the previous functionality repair. The configured backend does not currently expose it. Verify the prepared migration/schema-cache state before evaluating the repaired frontend as a complete deployment. No live migration was applied during this audit.

`src/services/heroMediaService.ts:51–65` compares the bigint `id` column with the page key `home`, then silently falls back to default hero settings on failure. The intended hero configuration cannot load through this query.

**Fix direction:** align the frontend with the backend schema and isolate optional settings failures so one failed request cannot discard all configuration.

### 6. High for perceived responsiveness — Cache invalidation and refresh fan-out

`src/lib/dualDb.ts:53` caches completed reads for five minutes. Realtime handlers in `EventsContext.tsx:170`, `PersonnelContext.tsx:151` and `ManagementContext.tsx:155` call their complete fetch functions without invalidating the remote table's cache. Consequently, a remote edit can trigger a refresh that immediately returns old data. Local write helpers do invalidate caches, so remote changes are the key affected case.

One domain change also repeats the whole domain's logical fetch sequence: events 8 reads, personnel 8, management 9. Events has three query stages after its initial parallel group (`EventsContext.tsx:108–140`). Local mutation refreshes and realtime refreshes can overlap. `dualRead` has no shared in-flight request deduplication.

`CoreDataContext.tsx:225` additionally triggers refreshes across all enabled providers. `DataContext.tsx:33` combines all their state, broadening unrelated component updates.

**Fix direction:** invalidate affected query keys, share in-flight requests, coalesce realtime updates and refresh only the changed data. Split context subscriptions by domain.

### 7. High for admin Storage — Repeated complete bucket scans

`src/services/storageService.ts:11–29` recursively lists every file in 100-item requests, sorts the entire inventory, then slices the requested page. Page 1 therefore costs a full inventory traversal.

`StorageOverview.tsx:112–136` independently loads usage, page data, total usage and breakdown. On an ordinary mount with the default bucket present, its call structure produces **seven complete scans of the selected bucket and two of every other bucket**. Actual HTTP counts depend on file/folder counts and permissions. `loadTop` at line 232 repeats a complete scan for each logical 500-item page, causing quadratic growth as inventory increases.

**This is a regression in the storage service implemented during the previous functionality repair.** It makes the controls functional but is unsuitable for large buckets. No authenticated bucket scan was executed during this audit.

**Fix direction:** paginate listings genuinely, share one inventory result where needed, and calculate usage once with caching or a backend summary.

### 8. Medium–high — Student dashboard repeatedly calculates global rankings

`DashboardLayout.tsx:143–166` fetches four own-user datasets, then all approved profiles and three global registration/round datasets. Registration, annual-sports and profile-like changes rerun the whole eight-query function (`:206–233`). `ActiveEvents.tsx:79–90` and `useTopStars.ts:34–60` independently repeat the global ranking inputs. These queries are unpaginated at the client level; actual returned rows remain subject to backend limits and RLS.

**Fix direction:** compute a compact ranking result server-side, share it between views, and fetch the user's own records separately. Paginate peers and large lists.

### 9. Medium — Coordinator polling and deliberate splash delay

`CoordinatorDashboard.tsx:347–401` adds a **2.5-second splash after initial data loading**, then performs two event-wide reads every 12 seconds while visible: approximately ten reads per minute, alongside realtime subscriptions. SLA loading at `:410–442` fetches conversations, student messages and coordinator replies in successive stages.

**Fix direction:** remove the artificial wait, use realtime with a fallback refresh interval, and fetch/aggregate message summaries rather than all message history.

### 10. Medium — Recurring rendering and event-listener work

- `src/pages/Events.tsx:611–615` updates page state every second; the full card list rerenders. `src/components/Events/EventCard.tsx:47` is not memoized. Each motion poster uses autoplay and `preload="auto"` (`:178–190`), including offscreen cards when present.
- `Events.tsx:569–589` adds anonymous mousemove/mouseleave listeners after filter/flip changes without removing them. Each handler reads card geometry and writes CSS variables.
- `WatchLiveButton.tsx:51–55` starts a one-second interval even for buttons that later return `null` before their display window. Its resize effect at `:110–120` depends on countdown text.
- `Navbar.tsx:139–166` stores scroll position in React state and recreates the scroll effect whenever it changes.
- `CyberpunkHeroContent.tsx:111–140` updates React state per animation frame during its recurring walk phase. Global Lenis and visual overlays add ongoing animation work.

These source paths are confirmed. Their individual contribution to interaction delay has not been isolated with a CPU flame graph. The measured production-home sample had four long tasks totaling 591 ms over the observation window; this alone does not explain the ten-second overlay.

**Fix direction:** use a shared clock only where visible countdowns need it, memoize stable cards, clean up listeners, use refs for scroll bookkeeping and pause offscreen media/animations.

### 11. Medium — Media and optional resources consume startup bandwidth

The normal production-home run downloaded the **3,779,551-byte** fallback `/login_page_video.mp4`, plus approximately **596 KB** for hover/click sounds before any interaction. `AudioController.tsx:9–12` creates those audio objects globally. `HomeHero.tsx:197` always mounts `CyberpunkHeroContent`; its video is at `CyberpunkHeroContent.tsx:181–190`. A separately configured hero background can add another video (`HomeHero.tsx:133`).

`index.html:78–80` requests six font families with multiple weights. Line 165 loads an external DotLottie module unconditionally. These are additional resource costs, not all critical rendering requirements.

**Fix direction:** use a small poster and deferred/adaptive video, load audio on demand, and limit initial fonts/animation dependencies. Face-recognition model files exist in public assets but were not observed loading on the homepage; their full size is not counted as a startup defect.

### 12. Medium — Slow failure paths and duplicated auth work

`dualDb.ts:182–200` allows three 30-second attempts plus 1.5- and 3-second backoffs: **94.5 seconds** before final failure in the timeout case. Its timeout wrapper rejects without aborting the underlying request. This is a configured worst case, not observed latency in the baseline.

Both auth providers mount globally. `StudentAuthContext.tsx:102–152` performs initial-session/profile work and listens for auth events; `AuthContext.tsx:77–143` separately evaluates session roles/admin access. Repeated auth events can repeat profile/whitelist work and loading changes.

**Fix direction:** use abortable, bounded requests with appropriate retry conditions and share session/profile initialization across the relevant role flow.

## Panel coverage

| Area | Strongest evidence |
|---|---|
| Public Home / Events | Fresh browser measurements, production dependency graph, loader and rendering source review |
| Student | Global startup plus repeated ranking/profile queries and full-context updates; authenticated performance not timed |
| Admin | Eager public admin bundle, global management reads, Storage scan multiplication; authenticated performance not timed |
| Coordinator | Global startup, 2.5 s splash, polling and serial message fetches; authenticated performance not timed |
| CR | Global startup; batch query has no pagination, bulk approval issues one RPC per student (`CRDashboard.tsx:52`, `:107`) |
| Sports / Council | Shared global startup costs confirmed; no panel-specific authenticated timing established |
| Security | Shared global startup costs; recent stats query is limited to 100 (`SecurityDashboard.tsx:344`), so it should not be blamed as a full-history scan |
| Gallery | Image metadata loads on demand, but then counts and fetches all 1,000-row pages concurrently and sorts everything (`GalleryContext.tsx:74–145`) |

## Recommended repair order

1. Resolve the missing security view and hero-media identifier mismatch; make core settings resilient to individual failures.
2. Remove the global public loading gate and route/role-scope data providers.
3. Correct production chunk boundaries and development icon optimization.
4. Fix cache invalidation, in-flight deduplication and refresh fan-out.
5. Replace repeated Storage scans and client-side ranking downloads with bounded/shared results.
6. Remove coordinator splash/poll duplication; reduce media and recurring render/listener costs.

After those changes, repeat the same cold visits and add authenticated journey measurements. Check loading-overlay duration separately from first paint, verify the public network no longer loads admin code, and verify remote edits become visible immediately. No live load test, migration, deployment or application-source performance changes were made for this audit.

## Evidence files

- [Measurement summary](2026-11-02-performance-summary.json)
- [Development homepage network/timing capture](2026-11-02-performance-browser-dev-home-normal-cache.json)
- [Production-preview homepage capture](2026-11-02-performance-browser-production-home-normal-cache.json)
- [Production-preview Events capture](2026-11-02-performance-browser-production-events-normal-cache.json)
- [Build sizes and dependency closures](2026-11-02-performance-bundles.json)
- [Minimal backend error checks](2026-11-02-performance-db-errors.json)

Build validation: a fresh Vite production build with `--manifest` completed successfully in 3.24 seconds. Existing application edits and the pre-existing sitemap modification were preserved. Temporary browser tooling and build output were kept outside the repository.
