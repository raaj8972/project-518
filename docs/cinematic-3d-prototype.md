# RICORRENZA cinematic intro

Historical prototype notes. The current device-specific video → cloud → live portal flow and safeguards are documented in [cinematic-intro.md](cinematic-intro.md); the latest model and art handoff are in [character-model-guide.md](character-model-guide.md).

## Project inspection and integration plan

The inspected app is React 18.3 + TypeScript + Vite 8, using React Router 6. React Three Fiber 8, Three.js, Drei 9, GSAP 3 and Lenis were already dependencies; no packages were added.

The real homepage is `src/pages/Home.tsx`, with `HomeHero.tsx` selecting the existing theme hero. Navbar/Footer are siblings in `AppShell`. The existing emerald hero is `SpiderHeroContent.tsx`; its FestivalEnvironment already pauses when outside the viewport. These homepage, hero, navigation and content components were left as found.

Implementation steps:
1. Wrap only the router's index Home in CinematicHome, inside the existing LockedPageGuard.
2. Generate an original skinned armored warden, plus a reproducible asset source and Blender artist handoff.
3. Tie walk phase, root movement, cape bones, camera and all energy effects to native vertical scroll.
4. Build one continuous world: entry platform → floating realm → open campus doorway → interior → portal.
5. Reveal the same mounted Home DOM during the final portal wash; release pointer and keyboard access at completion.
6. Add quality tiers, reduced-motion bypass, loading, failure handling and scoped cleanup; validate build, math, asset structure and lifecycle.
7. Document the remaining production art work rather than describe procedural art as photoreal or reference-final.

## Current visual status

The initial version did not meet the supplied reference's realism. It was visibly primitive and was rejected by the user. The second art pass adds a detailed storm panorama, real stone relief, irregular cliffs, refined architecture, metal reflections, higher mobile resolution, and a more detailed original skinned character. It remains procedural/stylized. It is **not an exact match to the film-quality reference**.

The supplied reference is a rendered cinematic artwork. Matching its armor sculpture, complex fabric silhouette, detailed architecture and volumetric lighting requires finished production assets and artist refinement. The code and asset pipeline are functional; that art-quality gap remains material.

## Runtime layout and behavior

- `CinematicHome.tsx` is a separate wrapper; Home is never recreated as an image or duplicate page.
- Desktop scroll runway: 400 small viewport heights; portrait: 440. Native touch scrolling is retained, with no OrbitControls or scroll interception on the canvas.
- Chapters: arrival 0–15%, realm 15–35%, approach 35–55%, interior/activation 55–75%, portal/home handoff 75–100%.
- Hermite camera interpolation is continuous across chapter boundaries. Portrait framing pulls back for the realm, then converges on the same entrance.
- The real Home moves into the viewport only during the handoff and stays mounted throughout. It is inert before completion; its original links, forms and routing remain active afterward.
- Skip Intro scrolls to the real Home endpoint using the existing Lenis instance through a small shared `rico:scroll-to` event.
- Scrolling back from Home remounts the 3D scene at the same deterministic progress. Home component state is retained.
- Existing unrelated spider controls are hidden while the intro is visible. The original navbar is shown during the first homepage viewport, even though the intro's scroll distance would otherwise trigger its existing hide-on-scroll behavior.
- `?intro=off` and homepage hash links bypass the intro. Reduced motion bypasses the entire runway and WebGL scene. Turning reduced motion on during the intro also returns to the real homepage start.

## Performance and resource ownership

- React Three Fiber uses demand rendering. Camera, bones, clouds, lightning and portal shaders advance only when scroll requests a frame.
- Low tier: mobile/limited hardware, DPR capped at 1.5, native antialiasing, fewer islands/clouds and radial segments, no shadow map or bloom.
- High tier: DPR capped at 1.75, one 1024² entry shadow map and a capped-resolution bloom chain.
- Very limited hardware (2 GB or 2 logical cores), Save-Data, WebGL failure/context loss, or stalled startup uses a lighter static realm with a direct Enter button.
- The canvas unmounts after the cinematic range and when the page is hidden; reverse scroll recreates it. R3F releases its renderer/context. Owned geometry, material, cloned texture, skeleton, animation mixer, environment render target and postprocess resources are disposed by their components.
- Small loader caches retain CPU source assets for reverse-scroll reuse; rendered clones have their own GPU resources and cleanup.
- The final world has 37 low / 55 high scene draw calls before character, shadow and postprocessing, and 82,038 / 170,686 triangles. The character adds five mesh batches and 24,816 triangles.
- No measured 60 FPS or real iPhone/Android certification is claimed. Device profiling remains necessary.

## Included assets and rebuilding

- `public/models/cinematic/warden.glb`: original hooded armored warden with 20 bones, five material batches, six embedded original procedural PBR maps, Walk and Idle clips. Final asset: 1,491,412 bytes, 24,816 triangles, 16,850 indexed vertices. Indexed geometry reduced the preceding 4.95 MB export by 70%.
- `scripts/generate-cinematic-character.mjs`: Three.js source generator. Rebuild with `node scripts/generate-cinematic-character.mjs`.
- `public/images/cinematic-storm-sky.webp`: 2048×1024, ~221 KB, generated with the built-in Image Generation tool; used only as environment artwork, not a replacement for the moving character or real Home.
- `public/images/cinematic-stone-normal.png`: 512² normal map derived from the project's existing `festival-natural-stone.webp`; rebuild with `node scripts/generate-cinematic-textures.mjs`.
- `scripts/blender-cinematic-assets.py`: imports the generated original rig and creates editable realm/campus and portal kits. Run `blender --background --python scripts/blender-cinematic-assets.py -- --output /tmp/rico-assets`. It exports `warden-refinement.glb`, `realm-kit.glb`, `portal-kit.glb` and an editable `.blend`.

Blender was unavailable, so the Python script was syntax checked but not executed. It is an artist handoff, not a claim that a Blender sculpt, cloth simulation or final cinematic animation was created.

The local default Node 22 executable has an incompatible architecture on this host. Working validation used `/usr/local/bin/node` or the installed Node 24. For example: `/usr/local/bin/node node_modules/vite/bin/vite.js --host 127.0.0.1`.

## Production assets still needed for the requested realism

1. A finished original armored character: anatomically refined sculpt, retopology, UVs, baked normals/AO, authored metal/cloth maps and careful close-up material tuning. Replace `public/models/cinematic/warden.glb`, clear the browser cache/reload, and adjust the root offset/scale in CinematicCharacter if necessary. Use metres, Y-up, face -Z, feet at y=0, approximately 3 m stylized height. Keep named `Walk` and `Idle` clips or change the two clip lookups in the component.
2. A polished walk/stop/look animation, with final foot locking and weight shifts. Current motion is real skeletal two-bone IK with matched root travel, not a sliding static model; the short stop blend still needs animator refinement. The runtime assumes a 1.2 m stride per 1.18 s walk cycle; update that distance when substituting animation.
3. Baked or simulated cape motion with collision, secondary folds and wind. Current cape is a skinned three-bone cloth mesh with scroll-sampled motion; it is not a cloth physics simulation.
4. An accurate IQ City campus model or clear licensed photographic references. The bundled campus is a geometric interpretation, not a survey/photogrammetry reconstruction. A replacement should retain the open entrance around x=0, z=-58 and the portal corridor toward z=-76; otherwise update the camera waypoints.
5. Finished Gothic architecture, cliff/foliage assets, authored PBR atlases, baked ambient occlusion/light maps and a final lighting/compositing pass. Mobile versions should use LODs, instancing and compressed texture atlases.

The Blender-exported environment kits are not automatically loaded by the runtime. The world currently uses real programmatic geometry and local textures; an artist can replace selected groups in CinematicWorld with GLB components while retaining the coordinate contract.

## Validation

Passed TypeScript application checking and a production Vite build. Cinematic tests cover camera continuity, reverse sampling, portrait/landscape poses, device tiers, actual skeletal walk channels, GLB budgets, same-DOM Home preservation, skip, fallback, preference/deep-link bypass and cleanup. Selected existing homepage/readiness regressions also pass.

A native Safari preview was inspected during development, including the revised textured opening, scroll chapters, activated portal and real Home reveal. Skip Intro was verified. The existing View Schedule and Explore Events links were clicked and reached the live /schedule and /events routes. The decorative canvas fallback was made passive after a startup issue was found in this browser check. Browser-connector access was unavailable; native app controls were used instead. Real iOS/Android performance and orientation testing remain unfinished. Test those devices with touch momentum, reverse travel and reduced motion before publishing.

The build retains pre-existing warnings about Vite/polyfill options, third-party eval and an ineffective dynamic import; no dependencies were changed to address unrelated warnings.

ESLint could not start because the existing ESLint/AJV dependency override crashes with `Cannot set properties of undefined (setting 'defaultMeta')`. TypeScript and the focused tests/build completed successfully.

## Generated sky prompt

Built-in Image Generation tool, original raster environment texture. Saved project asset: `public/images/cinematic-storm-sky.webp`.

Use case: stylized-concept. Asset type: high detail photorealistic cinematic fantasy storm sky texture for a real-time 3D game sky dome. Create a panoramic 2:1 equirectangular-style vista ONLY of enormous richly sculpted storm clouds, cloud ocean and a veiled moon, matching the attached RICORRENZA reference mood: very dark black-emerald gothic fantasy sky, dramatic illuminated silver-green cloud edges, distant pale warm gold horizon haze, delicate emerald lightning forks. Film VFX matte painting quality, realistic volumetric cumulus, finely detailed atmospheric depth, physically convincing scattered light. Composition: horizon across middle; dark monumental curling storm clouds across upper half; densely billowing illuminated cloud ocean below; small partially cloud-obscured moon in upper right. Sky remains richly readable instead of near black. There are NO characters, no buildings, no islands, no ground, no arches, no text, no UI, no logos or watermarks. This is an original environment texture and must not contain a humanoid. Wide panorama format with no frame.

