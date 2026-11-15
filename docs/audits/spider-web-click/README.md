# Green silk on page changes

Page navigation now shoots photographic, pale green silk across the viewport before the destination opens. The old geometric radial web, control hover frames and permanent corner webs are no longer displayed. A transparent silk texture supplies irregular bundles, wispy filaments and natural variation in thickness.

The transition follows React Router page changes: ordinary links, native internal links, navigation buttons and Back. It covers for 520 ms, proceeds once, then releases over 380 ms. Dialogs, event details, menus, tabs, form controls, same-page hashes and query changes do not start it. External links, downloads and modifier clicks retain their browser behavior. Staff workspaces and reduced-motion preferences bypass it.

The effect uses three brief CSS transform/opacity animations and one cached 496 KB WebP texture. It adds no animation loop or canvas. The texture was generated with the built-in image generation tool; the [source, runtime asset and exact prompt](../../../public/images/effects/README.md) are preserved in the project.

Validation: 99 spider tests across eight files pass, including 32 navigation-specific tests; TypeScript and the production build pass. Local Chromium checks verify desktop and touch navigation, immediate event details and mobile menus, full viewport coverage, no mobile horizontal overflow and reduced motion. The screenshots hold Web Animations at 480 ms for inspection, then resume navigation. They do not establish physical-device frame rates. ESLint could not start because the installed ESLint/Ajv dependencies throw before loading the source.

[Desktop web](desktop-shoot.png) · [Desktop destination](desktop-revealed.png) · [Mobile web](mobile-shoot.png) · [Mobile destination](mobile-revealed.png) · [Browser results](verification.json)
