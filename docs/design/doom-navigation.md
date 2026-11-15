# Cinematic festival navigation

The festival uses a full-height left drawer on mobile and desktop. It replaces the small dropdown on the emerald theme and Events page. The existing navigation order, hidden Sports feature, student dashboard destination and conditional admin access remain connected to their current settings.

## Artwork

Source: `/Users/raaj/Downloads/576834D4-717D-4948-B3F3-EEBC88D2CC54.PNG`.

The unmodified original is stored at `public/images/doom-menu-reference.png`. SVG viewports display its top illustration/wordmark and lower helmet/banner scene. Navigation labels, active states, close button and social links are separate live elements. Row portraits reuse the same cached artwork. This does not rely on a generated replacement character or a transparent cutout.

## Motion and layout

- The panel slides from the left with a green opening wave and a staggered link entrance; closing reverses the slide.
- Two rings rotate over the hand's original green spell. Soft spell/atmosphere pulses, moving edge light and ten drifting embers supply ambient movement.
- Animation uses CSS transforms/opacity and Framer Motion for opening/closing. It runs only while the drawer is mounted.
- On phones up to 640 px, the drawer uses 80% of the viewport, capped at 380 px. Larger screens keep the 460 px maximum. Its content scrolls independently; the close control stays available at the top with a minimum 44 px target.
- Hover and keyboard focus add a green light sweep, while mouse hover also moves the label/arrow, brightens the portrait and tilts the icon. Individual `translate` is separate from the entrance `transform` so hover movement still works after the entrance animation. Touch presses have a compact green flash and scale response. The active chevron has a small ambient pulse. Reduced-motion rules disable movement and sweeps.
- Every link is rendered from the real navigation data. Anonymous users see Dashboard leading to student sign-in, with a lock indicator.
- Only enabled, valid social account URLs from the existing admin social settings are shown. No placeholder destinations are added.
- The menu footer includes a Designed by Raaj credit linked to the personal Instagram account already used by the site footer (`i_amraaj__`). The Rico Instagram button uses the existing configured festival account, keeping the designer's account separate from the festival page.

## Accessibility and verification

The drawer is a labelled modal with focus containment, Escape/backdrop/close-button dismissal, focus return and background scroll locking. Reduced-motion settings stop ambient effects and remove the slide.

Automated coverage verifies the menu on Events and Home, the active destination, original illustration URL, hidden Sports link, locked Dashboard destination, link navigation, focus containment/restoration, scroll restoration and configured social URLs. Type-check and production build pass. Browser visual verification was blocked because the computer-use browser access host was unavailable.
