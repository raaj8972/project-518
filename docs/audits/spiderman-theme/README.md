# Spider-Man black-suit appearance

Follow-up: [a site-wide 3D spider, silk descent and background video](../spider-3d/README.md) have now been added. The static-hero notes below describe the earlier version of the theme.

Applied matte black/charcoal surfaces, white typography, muted grey supporting text and red accents. The homepage uses a static web/mask illustration instead of the legacy animated/video hero for this theme. Existing CMS title and subtitle content remains in use.

The shared colour tokens cover public pages and role-panel utilities, including hover, focus, borders, gradients and translucent surfaces. Navigation branding is monochrome. Login copy and colours match the new appearance; Google branding retains its own colours. Form focus outlines and readable placeholders remain visible. Success and warning colours retain their meanings.

Black Suit is the default for unversioned settings. The admin appearance picker supports it alongside the existing themes; explicit new selections are versioned and persist without overwriting unrelated batch settings. Read-only `?theme=...` previews remain available. No database settings were automatically written for the redesign.

Validation: application TypeScript and production build passed; 42 tests passed, including theme switching/persistence and preview regression checks. Seven desktop/mobile captures had no JavaScript errors or horizontal document overflow. Key palette contrast: body 18.71:1, muted text 9.78:1, primary button text 5.73:1. These checks cover the named palette pairs, not a full accessibility certification.

- [Desktop homepage](home-desktop.png)
- [Mobile homepage](home-mobile.png)
- [Desktop Events](events-desktop.png)
- [Mobile login](login-mobile.png)
- [Browser checks](checks.json)
- [Verification summary](verification.json)

The local server is running at http://localhost:8081/. No new libraries, fonts, canvas effects or background animation loops were added.
