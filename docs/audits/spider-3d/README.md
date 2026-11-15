# Site-wide 3D spider and restored video

Follow-up: [click/touch chase and the black-suit opening](../spider-chase/README.md) extend this experience with an interactive escape reaction and reference-inspired Home portrait.

Added a real Three.js/WebGL black spider with eight articulated legs, physical materials, lighting and lightweight bristles. It descends from the top on a silk thread, hangs briefly, crawls around the viewport and climbs away before repeating. Small web patches sit at two edges. The thread endpoint follows a projected point on the 3D abdomen.

The experience lives above the router, so navigation between public pages and role panels keeps the same scene. Its transparent overlay does not receive pointer events. A pause/play button hides and stops the animation; reduced-motion preferences start it paused. Unsupported WebGL devices receive a static fallback.

The homepage video is restored behind the black-suit hero: muted, looping and inline. Configured desktop/mobile media is used when available; a failed or missing clip falls back to the existing local optimized video. Video pauses offscreen/in a hidden tab and resumes when visible. Spider pause does not stop the video.

Performance choices: Three.js loads after essential page readiness, one bounded canvas moves through CSS transforms, mobile rendering uses DPR 1, rendering is capped at 30 fps, and frame updates do not use React state. The model has fewer than 50,000 triangles. Hidden tabs/paused animation stop the frame loop; geometries, materials, listeners and the WebGL context are released on unmount. No external 3D models or new packages are required.

Validation:

- 49 tests pass, including descent/crawl/climb paths, eight-leg animation, geometry budget, resource cleanup and background-video fallback.
- Application/server TypeScript checks and production build pass.
- Browser checks confirm WebGL 2 rendering, visible silk descent, actual motion, the same canvas after navigation, click-through, pause/resume, reduced-motion handling and WebGL fallback.
- Desktop and mobile video playback was verified with advancing playback time; mobile had no horizontal page overflow.
- Browser graphics checks used software WebGL in isolated Chromium sessions. They confirm behavior, not real-device frame-rate guarantees.

[Descending spider](descending-desktop.png) · [Spider on Events](crawling-events.png) · [Mobile](descending-mobile.png) · [Verification](verification.json)

Local server: http://localhost:8081/. No deployment or live database mutation was performed for this visual feature.
