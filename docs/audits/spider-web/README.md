# Web feedback on controls and cards

The black spider theme now adds silk webs to the corners of the hovered or keyboard-focused button, link, tab or designated card. Event SpotlightCards and schedule cards are included. One decorative, pointer-transparent SVG frame serves the whole site; it adds no canvas, package or continuous animation loop.

Touch and pen input show the same frame on press. Feedback clears after 1.1 seconds, on a canceled gesture, or when a drag becomes scrolling. No default input behavior is canceled, so links navigate on the first tap. Disabled/inert controls are excluded, and all document listeners/timers are removed when the theme changes or the component unmounts. Decorative icons inside a button still identify their parent control. Reduced-motion users get immediate feedback without a fade.

Validation: 53 tests pass across 9 files; TypeScript checks and production build pass. Browser checks cover desktop hover, card hover, keyboard focus, mobile single-tap navigation, tap feedback timeout, scroll dismissal, moving 3D spider on mobile, horizontal overflow and reduced-motion feedback. The browser checks use isolated desktop and touch-enabled mobile Chromium with software WebGL; they do not establish physical-device frame rates.

[Desktop hover](desktop-hover.png) · [Event card](event-card-hover.png) · [Mobile tap](mobile-tap.png) · [Mobile event](mobile-event-tap.png) · [Verification](verification.json)

Local server: http://localhost:8081/.
