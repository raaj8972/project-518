// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { createBattleFlag } from '../src/components/ui/festival/environmentModel';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each(['load', 'error'])('waits for the logo to finish (%s) before revealing the photographed flag', async result => {
  const images: any[] = [];
  vi.stubGlobal('Image', class {
    naturalWidth = 256; naturalHeight = 512; onload?: () => void; onerror?: () => void;
    constructor() { images.push(this); }
  });
  const paint = { scale: vi.fn(), clearRect: vi.fn(), drawImage: vi.fn(), globalAlpha: 1, globalCompositeOperation: 'source-over' };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(paint as any);
  const flag = createBattleFlag('/logo.svg'); const ready = vi.fn();
  void flag.ready.then(ready);
  images[0].onload();
  await Promise.resolve(); await Promise.resolve();
  expect(ready).not.toHaveBeenCalled();
  if (result === 'load') images[1].onload(); else images[1].onerror();
  await flag.ready;
  expect(ready).toHaveBeenCalledTimes(1);
  if (result === 'load') expect(paint.drawImage).toHaveBeenCalledWith(images[1], 0, 0, 256, 512, expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
  flag.dispose();
});

it('removes transparent padding while preserving the logo artwork and original colours', async () => {
  const images: any[] = [];
  vi.stubGlobal('Image', class {
    naturalWidth = 512; naturalHeight = 512; onload?: () => void;
    constructor() { images.push(this); }
  });
  const pixels = new Uint8ClampedArray(512 * 512 * 4);
  for (let y = 96; y < 416; y++) for (let x = 160; x < 352; x++) pixels[(y * 512 + x) * 4 + 3] = 255;
  const paint = { scale: vi.fn(), clearRect: vi.fn(), drawImage: vi.fn(), fillRect: vi.fn(), getImageData: vi.fn(() => ({ data: pixels })), globalAlpha: 1, globalCompositeOperation: 'source-over', fillStyle: '' };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(paint as any);
  const flag = createBattleFlag('/padded-logo.png');
  images[0].onload(); images[1].onload(); await flag.ready;
  const imprint = paint.drawImage.mock.calls.find(call => call[0] === images[1] && call.length === 9)!;
  expect(imprint.slice(1, 5)).toEqual([160, 96, 192, 320]);
  expect(imprint[7]).toBeGreaterThan(130); expect(imprint[8]).toBe(232);
  expect(paint.fillRect).not.toHaveBeenCalled();
  const cloth = flag.root.getObjectByName('wind-deformed-cloth') as any;
  expect(cloth.material.emissiveMap).not.toBeNull();
  expect(cloth.material.emissiveIntensity).toBeGreaterThan(0);
  expect(cloth.material.color.getHexString()).toBe('ffffff');
  expect(cloth.material.emissive.getHexString()).toBe('ffffff');
  flag.dispose();
});
