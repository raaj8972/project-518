import { Box3, Group } from 'three';
import { describe, expect, it } from 'vitest';
import { createBattleFlag, createFloatingIsland } from '../src/components/ui/festival/environmentModel';
import { getMobileFestivalLayout, MOBILE_ISLAND_BOUNDS } from '../src/components/ui/festival/environmentLayout';

const phones = [
  { width: 320, height: 840, contentBottom: 510, footerTop: 720 },
  { width: 375, height: 812, contentBottom: 470, footerTop: 698 },
  { width: 390, height: 844, contentBottom: 480, footerTop: 730 },
  { width: 430, height: 932, contentBottom: 500, footerTop: 818 },
  { width: 600, height: 900, contentBottom: 470, footerTop: 786 },
  { width: 767, height: 1024, contentBottom: 510, footerTop: 910 },
];

describe.each(phones)('mobile festival at $width px', ({ width, height, contentBottom, footerTop }) => {
  const layout = getMobileFestivalLayout(width, height, contentBottom, footerTop);
  const unit = height / 10;
  const pixelBounds = (root: Group) => {
    root.updateMatrixWorld(true);
    const box = new Box3().setFromObject(root, true);
    return { left: width / 2 + box.min.x * unit, right: width / 2 + box.max.x * unit, top: height / 2 - box.max.y * unit, bottom: height / 2 - box.min.y * unit };
  };

  it('keeps both entire waving flags and their poles inside the viewport, below the buttons', () => {
    const flag = createBattleFlag();
    flag.root.scale.set(layout.flagWidth / unit, layout.flagHeight / 2.2 / unit, 1);
    for (const x of [layout.flagInset, width - layout.flagInset]) {
      flag.root.position.set((x - width / 2) / unit, (height / 2 - layout.flagTop) / unit, 0);
      for (let time = 0; time < 16; time += 2) {
        flag.update(time, 1, x);
        const bounds = pixelBounds(flag.root);
        expect(bounds.left).toBeGreaterThanOrEqual(8);
        expect(bounds.right).toBeLessThanOrEqual(width - 8);
        expect(bounds.top).toBeGreaterThan(contentBottom + 8);
        expect(bounds.bottom).toBeLessThan(footerTop - 48);
      }
    }
    flag.dispose();
  });

  it('fits the rotating island inside the mobile scene', () => {
    const island = createFloatingIsland(); const anchor = new Group(); anchor.add(island.root);
    anchor.scale.setScalar(layout.islandHeight / MOBILE_ISLAND_BOUNDS.height / unit);
    anchor.position.y = (height / 2 - layout.islandCenterY) / unit;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      island.update(angle * 5, 0, angle);
      const bounds = pixelBounds(anchor);
      expect(bounds.left).toBeGreaterThanOrEqual(16);
      expect(bounds.right).toBeLessThanOrEqual(width - 16);
      expect(bounds.top).toBeGreaterThan(contentBottom + 8);
      expect(bounds.bottom).toBeLessThan(layout.toolbarTop - 8);
    }
    expect(layout.toolbarTop + 36).toBeLessThan(footerTop);
    island.dispose();
  });

  it('keeps the smaller side banner below the buttons and above the footer', () => {
    const flag = createBattleFlag();
    try {
      flag.root.scale.set(layout.foregroundFlagWidth / unit, layout.foregroundFlagHeight / 2.2 / unit, 1);
      flag.root.position.set((layout.foregroundFlagInset - width / 2) / unit, (height / 2 - layout.foregroundFlagTop) / unit, 4);
      for (let time = 0; time < 16; time += 2) {
        flag.update(time, 1, 3.4);
        const bounds = pixelBounds(flag.root);
        expect(bounds.left).toBeGreaterThanOrEqual(8);
        expect(bounds.right).toBeLessThanOrEqual(width - 8);
        expect(bounds.top).toBeGreaterThan(contentBottom + 8);
        expect(bounds.bottom).toBeLessThan(footerTop - 48);
      }
      expect(layout.foregroundFlagWidth).toBeLessThan(width * .2);
    } finally { flag.dispose(); }
  });
});
