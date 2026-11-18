/** The campus stays at the requested 150% detail size. */
const ISLAND_SCALE = 1.5;

/** Preserve the space above the island as its detail view grows downward. */
export function getIslandViewLayout({ width, height, baseHeight, contentBottom, bounds }: {
  width: number; height: number; baseHeight: number; contentBottom: number;
  bounds: { min: { x: number; y: number }; max: { x: number; y: number } };
}) {
  const mobile = width < 768;
  const modelWidth = Math.max(.01, bounds.max.x - bounds.min.x);
  const modelHeight = Math.max(.01, bounds.max.y - bounds.min.y);
  const top = contentBottom + (mobile ? 16 : 18);
  const bottom = Math.max(top + 1, baseHeight - (mobile ? 174 : 60));
  const targetWidth = mobile ? width * .88 : Math.min(width * .46, 760);
  const baseScale = Math.min(targetWidth / modelWidth, (bottom - top) / modelHeight);
  const scale = baseScale * ISLAND_SCALE;
  const pixelWidth = modelWidth * scale, pixelHeight = modelHeight * scale;
  const extraSpace = Math.max(0, pixelHeight - modelHeight * baseScale);
  const centerY = mobile ? bottom + extraSpace - pixelHeight / 2 : (top + bottom + extraSpace) / 2;
  const worldScale = scale / Math.max(1, height) * 10;
  return {
    extraSpace, width: pixelWidth, height: pixelHeight, top: centerY - pixelHeight / 2,
    scale: worldScale,
    anchorY: (.5 - centerY / Math.max(1, height)) * 10 - (bounds.min.y + bounds.max.y) / 2 * worldScale,
  };
}
