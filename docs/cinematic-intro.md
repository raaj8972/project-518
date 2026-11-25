# Animated title → device-specific film → cloud wipe → Home

## Automatic five-second title

Fresh eligible homepage loads now begin with the reference-style silver/gold RICORRENZA title and green gothic atmosphere. The automatic timeline shows darkness/light/smoke at 0–1s, a metallic close-up with a green edge sweep at 1–2.5s, the full title with IQ CITY and RICO 2026 at 2.5–4s, then a silk spider-web wipe at 4–5s. The webs cover the title before it is hidden at 4.5s, then peel away to reveal the existing device-specific film at frame zero. Title and film no longer ghost over one another. The ending energy bloom/full-screen flash and the preceding spider opening remain removed.

`RicorrenzaPrelude.tsx` owns the title artwork, input lock, visibility-aware five-second timer and cleanup. `RicorrenzaPrelude.css` owns the camera, light and independently moving cloud layers. `IntroWebWipe.tsx` / `.css` owns the shooting/clearing silk stages and covered-title callback. The film stays mounted and preloads while the title runs; its progress stays at zero until handoff. The prelude reuses the existing document-entry eligibility, so SPA navigation back to Home does not repeat it. Reduced motion, deep links, disabled intros and existing failure handling retain their bypass behavior. Escape or the keyboard-focus-only skip button opens the film early. Mobile layout preserves the full wordmark and uses a dedicated portrait atmosphere.

The atmosphere uses live photograph-based cloud flow and overhead green god-rays through `TitleAtmosphere.tsx` / `titleAtmosphereRenderer.ts`. Lower photographed banks roll and rise while the upper architecture remains fixed. Two masked photo-cloud layers also move independently using CSS, so graphics fallback retains visible cloud movement. Rays sweep and send light bands downward; the upper source breathes locally without a fullscreen flash. The isolated rendering loop is capped at 30fps / 800K pixels and pauses while hidden. The shader no longer freezes at five seconds. No extra video is added.

Artwork paths, generation prompts and validation are recorded in [the title design notes](design/ricorrenza-title-intro.md).

## Current mode: video to homepage

The owner temporarily removed the **live 3D character / hall / portal chapter** shown after the film. `INTRO_PORTAL_ENABLED` in `src/components/cinematic/introConfig.ts` is `false`. The opening video and its floating-island footage remain, followed by the sampled-cloud transition directly into the same mounted homepage. The runway is shortened to 520svh; the removed chapter leaves no blank scroll section. The film-only opening does not import the retained character/portal scene, show its drag-to-look controls, or require its WebGL capability probe. The actual homepage island prepares behind the film and must paint its first complete frame before the cloud cover releases; the fallback wallpaper is hidden during normal preparation.

Fresh eligible document loads reset both native scrolling and Lenis to zero and temporarily use manual browser scroll restoration. Refreshing after reaching the homepage must start at the opening film, rather than restoring the old end-of-intro scroll position. The previous restoration mode is restored on teardown. Both `/` and the legacy `/health` homepage route use the cinematic wrapper; ordinary in-app navigation still avoids forced replay.

**Restore only when the owner asks:** set `INTRO_PORTAL_ENABLED = true` in `introConfig.ts`. Character, hall, portal, camera motion, model assets and original chapter timing remain in place. Tests exercise both the current video-only default and the retained portal-enabled flow.

## Retained full version (currently disabled)

Preserved full flow for restoration:

1. Phones/tablets use the previously supplied portrait film. Desktop/laptop uses the newly supplied landscape film.
2. Scroll scrubs video forward/backward. Mobile freezes at source time 17.75s, matching the user's marked floating-campus frame (previously at 72% scroll).
3. The camera pushes into the original video sky. A layered foreground fog effect samples decoded upper cloud banks from that same clip; billows expand and drift in depth. There is no sliding PNG or generated cloud photograph.
4. Under full fog cover, the live rigged warden is placed inside the existing 3D hall. It walks toward the portal with its skeletal gait and cape tracks; emerald energy activates, and the third-person camera travels through it.
5. Portal wash reveals the same mounted Home at its hero. Home/HomeHero/Navbar content and links are preserved.

Desktop source: `/Users/raaj/Downloads/gemini_generated_video_191F4F93_gwr_video_mvp.MP4` (10s, 1280×720, 24fps). Runtime export: `public/media/cinematic/ricorrenza-desktop-v2.mp4` (short-GOP H.264, four-frame keyframe spacing, fast-start, muted).

Mobile source: `/Users/raaj/Downloads/watermark-removed-gemini_generated_video_1D7EEE4E.mp4`. Runtime uses the seek-optimized `ricorrenza-mobile-v2.mp4`, trimmed to 17.792s with its last displayed source frame at 17.75s. No artificial tail is included. Both originals are unchanged.

Source selection is device based (Android/iOS/iPadOS detection), so rotating a phone does not unexpectedly switch to the desktop clip. Narrow desktop browser windows still use the desktop video. Asset selection is in `introFlow.ts`.

Timeline over eight viewport heights:
- 0–48%: video up to its endpoint.
- 48–55%: original-video fog builds around the camera.
- 55–59%: fully covered, with a minimum 240ms hold; wait for 3D readiness.
- 59–65%: billowing fog clears, revealing the live character in the hall.
- 65–94%: skeletal character walk, portal activation and camera passage.
- 94–100%: real homepage handoff.

A fast swipe waits briefly at the covered transition until 3D is ready, with a bounded deadline that opens Home automatically on failure. Skip bypasses the whole intro and releases its video/canvas resources immediately. Reduced motion and homepage hash links skip the intro. Reverse scrolling returns through the same phases during normal playback. Video seeks coalesce and wait for decoder completion; no autoplay or loop runs. The video source and event listeners, timers and scoped ScrollTrigger are released on teardown. The previous scene manages its own GPU resources.

Cloud rendering is in `VideoCloudTransition.tsx`. It samples only a decoded endpoint frame (never the opening frame), excludes the central lightning/campus, feathers each original-film sample to zero alpha at its edges, and composites drifting depth layers at a capped update rate. It stops work outside the transition, while hidden and on unmount.

A diagnosed readiness timer bug previously replaced a successfully loaded 3D scene with a fallback image. The timer cancels on readiness and rechecks the ready ref before firing. A dedicated 25-second regression test protects it. Actual renderer failure now opens the real Home automatically.

Rebuild original-frame, short-GOP exports on macOS (no generated tail):

```sh
swift scripts/prepare-cinematic-video.swift /Users/raaj/Downloads/watermark-removed-gemini_generated_video_1D7EEE4E.mp4 public/media/cinematic/ricorrenza-mobile-v2.mp4 17.75
swift scripts/prepare-cinematic-video.swift /Users/raaj/Downloads/gemini_generated_video_191F4F93_gwr_video_mvp.MP4 public/media/cinematic/ricorrenza-desktop-v2.mp4
```

Validation: source frames inspected for both films; TypeScript, focused media/controller/flow/lifecycle tests and production build checked. Native Safari previously verified video scrubbing, reverse and live Home reveal; physical iOS/Android performance profiling is still outstanding. The earlier procedural 3D art is retained as requested, with its original artistic limitations described in cinematic-3d-prototype.md.

Latest verification: native Safari confirmed the live rigged character, an activating emerald portal, continued 3D rendering beyond the old timeout window and the unchanged real homepage reveal. Lighting is tuned darker for the hall; original character art remains stylized rather than a photoreal sculpt.

The portal centre now uses the published **Brand logo** from the existing homepage branding settings (`brand_logo_url`). Saving a replacement updates the scene and versions its texture URL using `updated_at`; no separate portal upload is needed. The logo keeps its uploaded colours, transparency and aspect ratio, sits inside the actual portal plane behind the character, and fades with portal activation and camera passage in either scroll direction. Transparent PNG/WebP works best. With no custom upload it uses the site's existing favicon. An unavailable image leaves the 3D scene usable; logo textures, geometry and material are released on replacement/unmount.

Logo verification: native Safari showed the currently uploaded festival emblem centred in the live emerald portal behind the character, including reverse scrolling. Thirty focused logo/intro/scene/camera tests, the application TypeScript check and the production build passed for this addition.

Final checks: 42 tests passed across nine focused test files; application TypeScript check and production Vite build passed. Both obsolete generated cloud panels and the old video-only cloud-tail export were removed from served assets.

## Device safety and delivery

`introCapability.ts` checks limits before assigning the video source or importing the 3D scene. It bypasses the intro for reported mobile RAM of 4 GB or less, mobile CPUs with four or fewer logical cores, desktop RAM/CPUs of 2 or less, iOS below 16, Android below 10, offline state, Data Saver, reported 2G/3G or a reported downlink below 2.5 Mbps. Unknown values are not treated as zero. Safari often hides hardware/network hints, so those devices use capability checks and runtime monitoring instead.

Before downloading the film, a short-lived WebGL2 context checks hardware availability with `failIfMajorPerformanceCaveat`; the context is immediately released. The actual H.264 High 3.1 codec is checked, and MediaCapabilities is queried when available for supported/smooth decoding and mobile power efficiency. The optional API can be missing or reject queries on older implementations; those browsers retain codec/GPU checks and runtime watchdogs. See the [Media Capabilities specification](https://www.w3.org/TR/media-capabilities/) for the browser-reported values; they are estimates, not a substitute for physical-device profiling.

Automatic Home deadlines (count only while the tab is visible): capability check 1.2 s, initial video frame 6.5 s, 3D readiness 8 s from scene preload, missing cloud/scene transition 4.5 s, decoder seek or requested render frame 4 s. Five consecutive video seeks above 550 ms or eight persistently slow frames above 70 ms also open Home. Frame monitoring measures render work and request latency rather than mistaking demand-idle time for poor FPS. Context loss, shader errors, codec errors and an unavailable cloud compositor follow the same path. Network changes/offline state are rechecked while the intro runs.

An automatic failure removes the runway, restores the same mounted homepage at its hero, releases intro resources, and remembers the failure for this browser tab (`sessionStorage`, with a safe in-memory fallback when storage is blocked). It never leaves an error panel requiring another tap. The existing homepage static-art fallback is used on limited devices, and the optional spider effect is omitted there. On capable devices, homepage 3D and the spider renderer wait until the cinematic handoff so they do not compete with the film/portal during loading. Homepage copy, navbar, links and routing are unchanged.

All mobile orientations use the low scene tier: DPR capped at 1.25, no shadow pass and no bloom composer. Desktop DPR is capped at 1.5. Demand rendering and decoder/cloud work stop when idle or hidden. The supplied seek-optimized films retain their original frames and frequent keyframes; only the chosen device clip is requested.

Netlify/Vercel media headers allow browser/CDN caching for seven days. Replacing a film requires a new filename/version. The service worker now leaves video and byte-range requests to the browser/CDN, avoiding stale whole-file responses or background re-downloads on each seek. Its cache version is bumped so existing installations receive the new worker. Live CDN byte-range headers, cache hits, concurrent-visitor traffic and physical older iOS/Android devices still require post-deploy verification; local tests cannot establish those production/device results.

Verification for this hardening: 146 tests passed across 15 relevant files, followed by 98 affected safety/lifecycle tests after the final cleanup. Application TypeScript and the final production build passed. Local video delivery returned `206 Partial Content`, the requested 1,024 bytes and correct `Content-Range`/`Accept-Ranges` headers. Native Safari verified film startup, the live portal/logo, and Skip revealing the original homepage at its hero. Both hosting configuration files parsed successfully.

## Character and cloud refinement

Runtime uses the second original rigged warden (`warden-v2.glb`, 44,062 triangles, 3.65 MB): a shaped metal mask with actual eye/vent holes, convex breastplate, corrected shoulder normals and embroidered cape. The original asset remains available. See [the character guide](character-model-guide.md) for artistic limits, rebuild instructions and beginner/artist handoff options.

Horizontal drag in the live hall (65–88% of the runway), or the left/right arrow keys, orbits the camera around the actual character. Vertical touch gestures remain native scrolling and continue its skeletal walk. No new viewer page or navigation link is added. Camera radius stays inside the hall and in front of the portal; the look offset eases out before passage. Camera math is deterministic on reverse scroll. Input listeners and pointer capture are removed on bypass/unmount. A warm hall light keeps the front mask readable.

Cloud entry caps the film push at 1.3×, samples larger original sky banks at their actual aspect ratios and uses depth-dependent expansion around a vanishing point. Terminal-frame sampling, the full-cover handoff and device safeguards remain. This is layered original-film compositing, not simulated volumetric clouds.

Refinement verification: 156 tests passed across 16 relevant files; application TypeScript and production build passed. Native Safari verified horizontal drag revealing the mask in the same hall, continued vertical-scroll walking with the look angle held, camera return to the portal and the actual homepage handoff. Real phone touch/performance profiling remains a separate check.
