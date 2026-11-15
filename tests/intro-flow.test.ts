import { expect, it } from 'vitest';
import { cloudEntryPose, introAssets, introFlow, isMobileViewer } from '../src/components/cinematic/introFlow';
it('selects the two user-provided clips by device, preserving phone landscape and desktop narrow windows', () => {
 expect(isMobileViewer({userAgent:'Mozilla iPhone Mobile'})).toBe(true);
 expect(isMobileViewer({userAgent:'Mozilla Android Mobile'})).toBe(true);
 expect(isMobileViewer({userAgent:'Mozilla Macintosh',maxTouchPoints:5})).toBe(true);
 expect(isMobileViewer({userAgent:'Mozilla Macintosh',maxTouchPoints:0})).toBe(false);
 expect(introAssets(true).video).toContain('mobile-v2');
 expect(introAssets(false).video).toContain('desktop-v2');
});
it('covers the frozen video with falling clouds before revealing the existing 3D approach and portal', () => {
 expect(introFlow(.58).scene).toBe(0);
 expect(introFlow(1).scene).toBe(1);
 expect(introFlow(.56).videoVisible).toBe(false);
});
it('uses a gentle reversible cloud push instead of magnifying the film into a blurry closeup', () => {
 expect(cloudEntryPose(.48)).toEqual({scale:1,rise:0});
 expect(cloudEntryPose(.55).scale).toBeCloseTo(1.3);
 for(let i=0;i<=100;i++) {
  const p=i/100, pose=cloudEntryPose(p);
  expect(pose.scale).toBeGreaterThanOrEqual(1);expect(pose.scale).toBeLessThanOrEqual(1.3);
  expect(pose.rise).toBeGreaterThanOrEqual(-3);
  expect(cloudEntryPose(p)).toEqual(pose);
 }
});
