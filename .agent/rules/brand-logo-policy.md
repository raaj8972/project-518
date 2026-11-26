---
trigger: always_on
description: Enforce using only the published brand logo (or official golden medical crest fallback) across the entire site and ban the legacy cyan-triangle RICO SVG.
---

# Brand Logo Policy

- **Never** render or fall back to the legacy cyan/purple triangle `"RICO"` SVG emblem anywhere in the website, portals, admin console, auth pages, loading screens, 3D scenes, or `public/favicon.svg`.
- Every brand logo surface across the application **must** display the currently published `homepageSettings?.brand_logo_url` resolved via [`resolveBrandLogoUrl`](src/utils/brandLogo.ts) / [`getPortalLogoUrl`](src/components/cinematic/portalLogoUrl.ts) or [`<BrandMark />`](src/components/BrandMark.tsx).
- When `homepageSettings` is still loading, UI components may fall back temporarily to the cached `rico_brand_logo_url` (`allowCachedWhileLoading`). When no custom brand logo is configured or an image fails to load, always fall back to `DEFAULT_BRAND_LOGO` (`/images/ricorrenza-medical-mark.svg`) — never `/favicon.svg` and never a hardcoded legacy placeholder icon.
- Never introduce new `<img src="/favicon.svg">` or `|| '/favicon.svg'` fallbacks in UI code. Keep `public/favicon.svg` synced with the official crest (`/images/ricorrenza-medical-mark.svg`).
