# RICORRENZA opening title

The supplied green title card is the visual reference. This implementation animates layered artwork and HTML typography; the metallic letters are raster artwork with camera transforms and masked lighting, rather than a new WebGL text scene. The existing scroll film and homepage remain mounted underneath.

The ending full-screen flash/energy expansion remains removed. During the last second, realistic silk webs shoot across the title, fully cover it, then peel away to show the original film. Title content is hidden at the covered midpoint, rather than crossfading over the film. The earlier spider opening is no longer mounted; normal festival-page spider behavior remains after readiness and cinematic handoff.

## Assets

Generated with the built-in `image_gen` tool using the user's reference, saved into the project as optimized WebP files:

- `public/media/cinematic/ricorrenza-title-metal-v1.webp`: transparent silver/gold wordmark, 2154 × 443, 329,780 bytes.
- `public/media/cinematic/ricorrenza-title-atmosphere-v1.webp`: landscape background, 1672 × 941, 79,126 bytes.
- `public/media/cinematic/ricorrenza-title-atmosphere-mobile-v1.webp`: portrait background preserving the side arches, 864 × 1535, 56,460 bytes.

The component selects one atmosphere for the initial viewport and shares the wordmark across layouts. No additional animation framework or video download was added. The opening never waits indefinitely for artwork: after 1.2 seconds of visible loading time it proceeds, with CSS atmosphere and text fallbacks available.

## Moving clouds and overhead light

`TitleAtmosphere.tsx` overlays a live WebGL rendering of the same photograph. `titleAtmosphereRenderer.ts` applies nonuniform flow to the lower cloud banks: the detailed photographed smoke rolls inward, rises and changes shape while upper architecture stays fixed. The light combines sweeping green shafts, downward-moving mist, a narrow lime/cream core and a locally pulsing flare at the upper source. Seven animated CSS shafts support the photo fallback, with moving light bands every 1.7s and a fan sweep over 2.6s. Two softly masked photographic cloud banks move independently over 3.2s and 4.1s even if WebGL is unavailable. Shader motion no longer freezes at five seconds.

The rendering loop is limited to 30fps, 800,000 pixels and a maximum DPR of 1.25. It suspends in a hidden tab and resumes its previous animation time. The reference photograph remains visible until a complete live frame is drawn; renderer initialization failure or context loss retains the photo, moving cloud layers and CSS lighting. GPU resources, animation frames and observers are released on unmount. Fragment shaders use high precision where supported and a bounded-noise fallback on older mobile GPUs.

`IntroWebWipe.tsx` uses the existing `/images/effects/real-silk-web.webp` texture and fine SVG strands. Prelude integration starts its 1000ms wipe at 4000ms of visible title time; opaque coverage at 4500ms hides the title, then the web clears onto the already-mounted video. The parent five-second deadline remains a failsafe. The component and parent both preserve remaining time across hidden-tab pauses and cancel timers on teardown.

## Generation prompts

### Metallic wordmark

Use case: background-extraction / logo-brand. Asset type: transparent metallic title artwork for a responsive website opening animation. Input images: the FIRST image, supplied by the user, is the exact design reference: a silver-and-gold RICORRENZA title in a lime-green gothic atmosphere, above RICO 2026. The other two images are unrelated local assets and MUST NOT be copied. Isolate/reproduce ONLY the main stylized word RICORRENZA from the user's first reference image, on a genuinely transparent background. Copy that exact futuristic wide italic sharp beveled uppercase logotype, very large dramatic sweeping first R and sharp last A, scratched SILVER/ivory metallic front faces, warm GOLD extruded bevels and dark thick sides, subtle vivid lime green reflections along bottom edges. The fourth letter O is the round gold compass ring with eight thin sharp star points and a bright lime star at its centre, exactly as in the user's image. Exact spelling R I C O R R E N Z A, one continuous horizontal word. Wide landscape output, tightly framed around the word with small transparent margins, approximately 4.8:1 word aspect ratio within a 3:1 canvas. NO additional text, no IQ CITY, no RICO 2026, no background, no glow rectangles, no castle, no added city, no frame. Preserve the reference typography, silver face colors and gold bevels as closely as possible; do not redesign it.

### Landscape atmosphere

Use case: precise-object-edit. Asset type: background plate for a website cinematic opening. Input images: the FIRST image is the user's exact reference green gothic RICORRENZA title card; the other images of gold lettering and a hooded figure are unrelated and MUST NOT be copied. Reproduce the BACKGROUND of the first/user image as faithfully as possible at 1920 by 1080 landscape framing. Remove ALL foreground text and logos: remove IQ CITY, MEDICAL COLLEGE, PRESENTS, the foreground metallic RICORRENZA, RICO 2026 and ANNUAL CULTURAL FEST, and their small separators and plaque. Keep the nearly invisible enormous flowing outline letter R filling the centre, black-and-deep-forest-green atmosphere, luminous chartreuse-green ribbons of energy, symmetrical dark gothic pointed arched metal window frames at far left and far right, green-lit mist behind those windows, falling very thin golden-green shafts of overhead light, and detailed heavy rolling emerald-green smoke banks glowing lime around bottom corners and lower edge. Preserve the original composition: large clean almost black empty central field where the original logo was, intense lime green at upper centre and low corners, very subtle green particle dust. Cinematic 3D rendered realism, extremely close to original background design and color palette, no added objects, no people, no new architecture, no planets, no symbols, no new words, no watermark. The huge faint background R from the original may remain barely perceptible.

### Portrait atmosphere

Use case: precise-object-edit. Asset type: mobile portrait background plate for the SAME website opening title. Adapt this supplied exact background to a tall PORTRAIT 9:16 canvas (1080x1920). Keep the identical visual design and green/black color palette, the same huge faint flowing outline R, lime energy ribbons, shafts of light from upper centre, realistic green smoke and lime-lit rolling cloud banks across bottom. Recompose rather than centre crop: BOTH of the original black gothic pointed window arches MUST still appear at the far LEFT and RIGHT EDGES of the portrait image, narrow and very dark, with green light behind them. Leave the middle 65 percent of the canvas almost black and spacious to overlay a title at mid-height. The top centre should have a fine green shaft, not a giant white blob. Keep the landscape reference's exact gothic emerald atmosphere and realistic smoke detail. No words, no logos, no foreground title, no people, no added symbols, no other objects, no watermark.

## Validation

- Automated coverage exercises the title duration, artwork loading/error/timeout, hidden-tab pauses, input handling, cleanup, StrictMode, video preloading, progress freezing and frame-zero handoff, plus the retained document/policy/film behavior.
- Ten atmosphere lifecycle cases cover first-frame visibility, frame budget, both pause paths, render resolution, observer resize, failures, context loss and resource cleanup.
- Eight web-wipe cases cover midpoint-only replacement, exactly-once completion, prop and visibility pauses, initially hidden entry, cleanup, StrictMode and callback updates. Parent integration checks the four-second start and five-second completion without duplicate callbacks.
- Application TypeScript and production build pass. The build's security scan reports no findings.
- Native Chrome verified successful live shader rendering, successive frames with moving cloud contours and light shafts, full title composition at phone and desktop viewport widths, and the automatic handoff to the original film. This checks responsive browser rendering; physical phone performance was not measured.
- Targeted ESLint execution is blocked by the workspace's existing ESLint/Ajv dependency error (`Cannot set properties of undefined (setting 'defaultMeta')`).
