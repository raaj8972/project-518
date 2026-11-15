# Sponsor stage effects

The homepage partner rail moves at 20–60 px/s (44 px/s by default), reduced to 90% of that speed below 480px. The appearance editor uses the same range. Lamps sit in a stationary layer outside the moving rail: one below 480px, two at 480–899px, three at 900–1399px, four at 1400–1899px, and five from 1900px. Their heads aim at actual sponsor positions using the rail's existing animation frame. Tracking holds a passing sponsor, then hands off when it leaves view; looping in either direction reacquires the equivalent visible copy.

Logo images fill a dedicated responsive area and retain their complete artwork. The shared loop's 20–28px image cap is overridden in this section. Sponsor names are also printed as readable captions. The section heading is visible without depending on a scroll reveal. Two intermittent offscreen emitters release independently curling, expanding and dissolving procedural smoke puffs. The small density fields have zero alpha at every boundary, so no cut image edge can travel across the screen. Rendering is capped at 24fps and 52 puffs, without another WebGL context or an animated image panel. Webs remain at the section's outer screen edges.

Motion stops offscreen, in hidden tabs, and for reduced motion. Pointer hover or keyboard focus pauses the moving rail. Geometry is measured on resize, rather than on every animation frame.

Built-in `image_gen` generated the final lamp asset with transparency; WebP encoding preserves its alpha:

- [Lamp](../../public/images/partner-stage-lamp.webp)

Final lamp prompt:

> Use case: product-mockup. Asset type: transparent cutout sprite for a website's fixed stage spotlight. Generate exactly ONE photorealistic compact professional black metal theatre PAR spotlight, isolated on a genuinely transparent background, no scenery, no floor, no text, no visible beam or smoke. The fixture is upright with its long cylindrical body perfectly VERTICAL, mounting yoke/hinge at the top, circular lens opening at the BOTTOM pointing straight downward toward the viewer slightly so the bottom lens is a horizontal ellipse. Center the fixture with a 10% transparent margin, tall 3:4 composition. Real dark graphite anodized metal, silver edge reflections, realistic vents, bolts, short mounting bracket, subtle scratches, heavy realistic 3D volume, a bright warm chartreuse lens (warm pale lime mixed with amber-white, NOT cold saturated neon green). Strong polished product photography, physically realistic materials and illumination; readable silhouette at 60px height. No cartoon outlines, no drawing, no vector look, no spotlight cone embedded in the asset. Keep all of the complete fixture inside the image.

Verification: automated tracking, handoff, wrap, captions, offscreen/hidden-tab suspension, reduced motion, and cleanup checks in `tests/sponsor-lighting.test.tsx`. Smoke alpha boundaries and lifecycle are covered in `tests/sponsor-smoke.test.tsx`. Safari responsive preview inspected at 390px and 1366px.
