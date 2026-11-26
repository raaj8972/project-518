# Project Rules

## Brand Logo Policy

- **Never** render, inline, or fall back to the legacy cyan/purple broken-circle + inverted-triangle `"RICO"` SVG anywhere on the site (including `public/favicon.svg`, portals, navbar, footer, login pages, admin layouts, student dashboard, or 3D intro scenes).
- All brand logo slots **must** render the currently configured brand logo (`homepageSettings?.brand_logo_url`) using [`<BrandMark />`](src/components/BrandMark.tsx), [`resolveBrandLogoUrl`](src/utils/brandLogo.ts), or [`getPortalLogoUrl`](src/components/cinematic/portalLogoUrl.ts).
- When no custom `brand_logo_url` is set or an upload fails to load, always fall back to `DEFAULT_BRAND_LOGO` (`/images/ricorrenza-medical-mark.svg`).
- Keep [`public/favicon.svg`](public/favicon.svg) matching the official Ricorrenza crest (`/images/ricorrenza-medical-mark.svg`), and keep the regression check in [`tests/brand-logo-rule.test.tsx`](tests/brand-logo-rule.test.tsx) passing.
