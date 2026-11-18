# Website performance changes

## Delivered

- Static SVG/bitmap logos no longer import Lottie eagerly. The animation player is a conditional chunk (307,763 bytes raw / 78,855 gzip in the audit build), fetched only for JSON animation logos. Logo requests are aborted on replacement/unmount and stale responses cannot overwrite the current logo.
- Homepage partners, leadership, history and About sections mount once within 700px of the viewport. Reserved placeholder space keeps the page navigable during loading. Hash navigation eagerly renders sections so deep links remain available. Browsers without IntersectionObserver render immediately.
- Faculty, chief guest and membership modal code loads only when those modals open, with local Suspense boundaries.
- The mobile hero selects its mobile source on the first render. Removed the legacy hero GSAP/ScrollTrigger effect, which performed no animation and refreshed all scroll triggers on teardown.
- Homepage reveal observation is scoped to the homepage and handles asynchronously arriving sections. Removed repeated document-wide scans and the legacy document-wide parallax scroll handler; actual Parallax components retain their own animation logic.
- Leadership source lists are memoized so unrelated modal/state changes do not refilter/resort them.
- Shared AutoCarousel reads child layout during resize rather than each scroll event. Autoplay timers are absent while paused, offscreen, hidden or displaying a single page.
- Shared smooth scrolling suspends its RAF chain in hidden tabs, resumes a single chain, and cleans up on StrictMode remounts.
- The current opening remains film → floating-island footage → clouds → homepage. The owner-requested portal disable flag stays false; scene assets and restoration code remain intact. Browser network estimates and modern 4GB/four-core mobile devices select low graphics quality rather than silently removing the introduction. Smooth supported mobile decoding does not require a positive power-efficiency estimate.
- Intro failures apply only to the current document; a fresh page can retry even when an older build stored a failure in session storage. Loading allowances accommodate the film/scene startup, and direct homepage navigation or a failed attempt offers a Replay intro link. Reduced-motion, save-data and actual unsupported-device safeguards remain.

## Validation

Production Vite build and TypeScript validation. Targeted tests cover deferred mounting, direct links, unsupported observers, logo loading and stale responses, carousel geometry/timers, scrolling lifecycle, auth/data caching boundaries, hero media selection, roadmap visibility, staff login and event menus.

Opening follow-up: Chrome preview verified the original complete sequence, then the requested video-only sequence with a direct homepage handoff. Tests cover both the current default and the retained portal-enabled version.

## Further optimization with unchanged visuals and assets

- Isolated the full Lucide catalog to sponsor/admin routes using the installed package's equivalent CJS distribution. Ordinary shell icons remain tree-shaken ESM. All 4,538 export names, nested catalog entries and 4,536 SVG component/alias outputs match. Configured icons remain synchronous; no icon placeholders were added.
- Final production App static import graph: 675,310 raw bytes / 212,774 estimated gzip bytes. Baseline App graph was 1,275,257 raw bytes. These are JavaScript dependency-graph sizes, not full-page transfer totals or a production loading-time measurement. Home's static graph is 706,756 raw bytes; the full icon catalog is absent from App, Home and Navbar static graphs.
- `preloadBrand` reuses CoreData's published settings response instead of issuing a second request 200ms after startup. Cached-logo warmup and exact Navbar upload versioning remain. Hero and sponsor media load through their existing components rather than speculative global preloads.
- Service-worker activation copies the already-cached SPA shell to its 15 offline route entries instead of downloading the same shell 15 times. Cached content-hashed bundles/fonts/images make zero repeat background network requests; mutable images still revalidate, HTML remains network-first, and video/range requests stay with the browser/CDN. Vercel's generated JS/CSS/WOFF2 assets receive immutable cache headers.
- Chronicles caches unchanged path positions and skips identical SVG/style writes. A 100-frame stationary sample drops from 300 geometry reads / 100 transform writes to 3 / 1; later stationary samples perform zero of either. Clock, sampled values, pauses and frame cadence remain unchanged.
- LogoLoop measures its responsive factor through its existing resize path. A 180-frame sample across a resize performs zero per-frame width reads instead of 180, with the same motion output.
- Unlocked pages do not import maintenance-only code or run a lock-expiry interval. The same maintenance view, admin bypass and timed unlock remain covered.

Final verification: **158 tests across 19 files**, application TypeScript check and production Vite build passed. Chrome production preview rendered the existing Gallery and Sponsors pages, including the synchronous configured sponsor-package icons. No original image, video, model or stylesheet artwork was edited by this optimization pass. The portal remains disabled as requested.

## Intro to complete homepage handoff

The homepage island, flags and textures prepare behind the intro, with their animation loop suspended while covered. Loading the wallpaper no longer counts as scene readiness. The intro keeps its full cloud cover until the first complete homepage frame is painted, then reveals that scene directly; no temporary wallpaper or image-to-3D crossfade appears. The same renderer instance survives handoff. Static artwork is reserved for an actual unsupported/failed renderer. Visible-time loading deadlines prevent a stuck intro, and both the video-only default and retained portal version are covered.

Validation: 84 targeted tests across eight files, TypeScript and production build passed. Chrome preview showed the film, opaque cloud hold and completed island/flag scene, without the temporary wallpaper stage.

## Island scale and flag contact

The island stays at the requested 150% size without zoom controls. Extra space below the copy keeps the enlarged rotating campus clear of the actions. The smaller foreground banner sits along the left tower, behind the campus.

Flag cloth now uses bounded, damped springs for local finger/mouse contact and the nearby island outline. The pole and suspension row remain fixed; release preserves momentum before the fabric settles back into the wind. The existing scene clock, mobile DPR/FPS limits, visibility pause and reduced-motion behavior remain. Contact uses the startup rotation bounds and reusable buffers, without per-frame geometry traversal or DOM measurements.

Validation: 97 tests across nine files, application TypeScript check and production build passed. Chrome preview checked local cloth contact and the fixed-size island with no zoom controls.
