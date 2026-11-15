// Conservative bounds for the tilted college buildings, cliff outcrops and vertical bobbing.
export const MOBILE_ISLAND_BOUNDS = { width: 5.5, height: 4.9 };

/** Pixel layout for the narrow hero, leaving copy, island help and controls clear. */
export function getMobileFestivalLayout(width: number, height: number, contentBottom: number, footerTop: number) {
  const sceneTop = contentBottom + 16;
  const sceneBottom = Math.max(sceneTop + 1, footerTop - 64);
  const availableHeight = sceneBottom - sceneTop;
  const islandHeight = Math.min(width * .88 / MOBILE_ISLAND_BOUNDS.width * MOBILE_ISLAND_BOUNDS.height, availableHeight);
  const islandWidth = islandHeight / MOBILE_ISLAND_BOUNDS.height * MOBILE_ISLAND_BOUNDS.width;
  // Leave the close banner visually larger than the two distant side flags,
  // even when a short screen compresses the space below the action buttons.
  const flagHeight = Math.min(160, width * .38, availableHeight * .5);
  const flagWidth = flagHeight / 2.8;
  const foregroundFlagHeight = Math.min(250, width * .62, Math.max(0, availableHeight - 16) / 1.2);
  const foregroundFlagWidth = foregroundFlagHeight / 2.2;
  return {
    islandWidth, islandHeight,
    islandCenterY: sceneBottom - islandHeight / 2,
    flagWidth, flagHeight, flagTop: sceneTop,
    flagInset: 12 + flagWidth * .7,
    foregroundFlagHeight, foregroundFlagWidth,
    foregroundFlagInset: 12 + foregroundFlagWidth * .7,
    foregroundFlagTop: sceneBottom - foregroundFlagHeight - 10,
    toolbarTop: Math.min(height - 44, footerTop - 44),
  };
}
