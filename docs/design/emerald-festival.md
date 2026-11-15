# Ricorrenza emerald and gold festival

The public website and student experience share a cinematic green-and-gold visual language inspired by the supplied reference images. Staff dashboards retain their independent styling.

## Implemented

- Emerald ruined-city environment, metallic italic display titles, green year mark, gold navigation frame and illuminated action buttons.
- Real articulated Three.js spider with black armor, gold segmented legs, green reactor and eyes, pulsing lights and projected beams. Existing pointer escape, keyboard controls, pause preference and cleanup are retained. A mechanical SVG is used when WebGL is unavailable.
- Matching Featured Events, Rico Stars, partners, event listings, filters and schedule styling. Other public pages share the background, typography and palette.
- Matching student dashboard, statistics, navigation, registration/event surfaces, profile gates and access/recovery screens. Existing authentication and real data are preserved.
- Explicit route scope on both `html` and `body`: public/student routes use `festival`; staff routes use `staff`. Students receive the spider without the public opening sequence. Staff routes mount neither spider nor opening.
- Reduced-motion support, visible keyboard focus, real ranking loading/error/empty states, and accessible ranking dialogs.

## Generated artwork

Built-in `image_gen` mode was used. The final project asset is `public/images/ricorrenza-emerald-city.webp` (248 KB), converted from the generated PNG with Sharp. The original remains under `/Users/raaj/.codex/generated_images/01a1c078-f19c-71a0-a301-c33e89507117/`.

Final prompt:

> Use case: stylized-concept. Asset type: ultra-wide cinematic website hero background, landscape 16:9. Create a polished high detail AAA science fantasy world inspired by the user's attached green-and-gold Ricorrenza festival reference images. Subject: stormy dark emerald ruined futuristic city, broken gothic industrial towers framing both sides, tattered deep green banners with small abstract gold wing emblems, a rocky levitating island low in the center with a vivid lime green energy beam rising vertically, subtle gold orbital rings around it, green lightning among smoky dramatic clouds, rubble and emerald energy fissures along foreground. Composition: extremely wide landscape panorama, imposing side architecture, center upper 60% mostly dark misty clouds with clean dark negative space for live website text. Floating island and beam live in lower center third, foreground rubble along bottom. Cinematic volumetric light, oxidized brushed gold metal details, dark charcoal stone, luminous green energy. Match the rich dark green/gold atmospheric quality of the references. No spider: a live 3D spider will be composited separately. Constraints: absolutely no text, lettering, title, numbers, interface, cards, buttons, navigation, watermark, or logo. Make an environment artwork only; professional website background with sharply detailed architectural sides and readable dark middle.

Live titles, navigation, cards and controls remain HTML. Configured CMS media still takes precedence on supported hero surfaces, with the generated artwork used by default or when a clip fails.

## Verification

- Application TypeScript check and production Vite build pass.
- Targeted test selection covers model disposal and reactor materials, motion/escape bounds, readiness-driven opening, highlight interaction, student versus staff route boundaries, configured/default hero media, appearance settings, dashboard theme, registration repairs, and community/auth behavior.
- Native Chrome inspection confirmed the desktop hero, generated scenery, live WebGL spider, navigation and student login appearance.
- Responsive layouts and reduced-motion rules were reviewed in code. Authenticated student dashboard rendering was not browser-tested; no student sign-in or production data changes were performed.

Local preview: `http://localhost:8081/`. No deployment was performed.

The system's default Node v22 binary is incompatible with this Mac. Verification used `PATH=/Users/raaj/.nvm/versions/node/v24.11.1/bin:$PATH`.

Final targeted result: 99 tests passed across 12 suites. After the final media-fallback and appearance-label adjustments, the two affected suites also passed again.
