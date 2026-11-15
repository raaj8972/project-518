# Spider chase and black-suit opening

Clicking or touching the actual 3D spider makes it detach its silk, turn and scurry to a distant crawl waypoint in under a second. Its legs animate faster during escape; it then rejoins the autonomous route at that waypoint without teleporting. A new lightning control, labeled “Make spider run,” provides the same interaction for keyboard users.

Pointer hit testing uses the existing Three.js meshes, not the whole rectangular canvas. Transparent corners still pass through. A confirmed spider tap consumes its resulting click so a link/form beneath the body is not accidentally activated. Native touch scrolling is preserved; canceled gestures clear the pending tap. Pausing or reduced-motion mode disables the chase, and hidden modal scenes ignore taps. New listeners are removed with the scene.

The supplied references inspired a black-and-red opening with an original geometric spider emblem and a framed black-suit portrait on Home. The portrait uses shaded SVG, with outlined RICO lettering, a brief entrance and event/schedule links. The actual roaming spider remains WebGL. The background video still plays behind the hero.

The opening follows essential data readiness rather than a fake percentage or fixed intro runtime. Its final fade takes 360ms and never blocks pointer input after readiness. Reduced-motion users skip the fade. The opening does not replay on normal public-page navigation, and existing portal/login/dashboard bypass behavior is preserved.

Validation:

- 57 tests pass across 10 files, including repeated chase paths, mobile bounds, smooth route rejoining, readiness-driven loader exit and reduced motion.
- Application TypeScript check and production build pass.
- Browser input checks confirm desktop click and touch-enabled mobile tap cause rapid escape, ignore transparent corners, consume only spider hits and rejoin the crawl route.
- Keyboard chase, pause, portal bypass, opening completion, event CTA navigation, mobile overflow and background-video playback pass.
- Browser graphics checks use isolated Chromium with software WebGL, including touch-enabled mobile emulation. They do not establish physical-device frame rates.

[Opening](opening-desktop.png) · [Desktop hero](hero-desktop.png) · [Mobile hero](hero-mobile.png) · [Desktop chase](desktop-flee.png) · [Mobile chase](mobile-flee.png) · [Verification](verification.json)

Local server: http://localhost:8081/. No deployment or live settings changes were made.
