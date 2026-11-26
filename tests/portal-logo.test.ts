import { afterEach, expect, it, vi } from 'vitest';
import { Group, SRGBColorSpace, Texture, TextureLoader } from 'three';
import { createPortalLogo } from '../src/components/cinematic/portalLogoMesh';
import { getPortalLogoUrl } from '../src/components/cinematic/portalLogoUrl';

afterEach(() => vi.restoreAllMocks());
function mockImage(width = 1200, height = 600) {
  const texture = new Texture({ naturalWidth: width, naturalHeight: height } as HTMLImageElement);
  const dispose = vi.spyOn(texture, 'dispose');
  let finish: ((image: Texture) => void) | undefined, fail: ((error: unknown) => void) | undefined;
  const load = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, onLoad, _progress, onError) => {
    finish = onLoad; fail = onError; return texture;
  });
  return { texture, dispose, load, finish: () => finish?.(texture), fail: () => fail?.(new Error('Unavailable logo')) };
}

it('uses published uploads, versions replacements, and preserves query strings and fragments', () => {
  expect(getPortalLogoUrl(null)).toBe('/images/ricorrenza-medical-mark.svg');
  expect(getPortalLogoUrl({ brand_logo_url: '  ' })).toBe('/images/ricorrenza-medical-mark.svg');
  expect(getPortalLogoUrl({ brand_logo_url: '/favicon.svg' })).toBe('/images/ricorrenza-medical-mark.svg');
  expect(getPortalLogoUrl({ brand_logo_url: ' //cdn.example/logo.png?size=400#mark ', updated_at: 'new upload' })).toBe('https://cdn.example/logo.png?size=400&v=new%20upload#mark');
  expect(getPortalLogoUrl({ brand_logo_url: 'http://cdn.example/logo.webp' })).toBe('https://cdn.example/logo.webp?v=1');
  const embedded = 'data:image/png;base64,abc';
  expect(getPortalLogoUrl({ brand_logo_url: embedded })).toBe(embedded);
});

it.each([[1200, 600, 2.7, 1.35], [600, 1200, 1.35, 2.7]])('fits %sx%s uploads without distortion and keeps the logo in the portal plane', (width, height, x, y) => {
  const image = mockImage(width, height), invalidate = vi.fn();
  const logo = createPortalLogo('/brand.png', invalidate);
  expect(logo.mesh.visible).toBe(false);
  image.finish(); logo.update(.6);
  expect(logo.mesh.scale.x).toBeCloseTo(x); expect(logo.mesh.scale.y).toBeCloseTo(y);
  expect(logo.mesh.position.toArray()).toEqual([0, 4.08, -75.68]);
  expect(logo.mesh.material.map).toBe(image.texture);
  expect(image.texture.colorSpace).toBe(SRGBColorSpace);
  expect(logo.mesh.material.depthTest).toBe(true); expect(logo.mesh.material.toneMapped).toBe(false);
  expect(logo.mesh.visible).toBe(true); expect(invalidate).toHaveBeenCalledOnce();
  logo.update(0); expect(logo.mesh.visible).toBe(false);
  logo.update(.6); expect(logo.mesh.material.opacity).toBe(1);
  logo.update(.88); expect(logo.mesh.visible).toBe(false);
  logo.update(.6); expect(logo.mesh.visible).toBe(true);
  logo.dispose();
});

it('disposes replaced GPU resources and ignores a late image load after unmount', () => {
  const image = mockImage(), invalidate = vi.fn(), logo = createPortalLogo('/old.png', invalidate);
  const group = new Group(); group.add(logo.mesh);
  const materialDispose = vi.spyOn(logo.mesh.material, 'dispose'), geometryDispose = vi.spyOn(logo.mesh.geometry, 'dispose');
  logo.dispose(); logo.dispose(); image.finish(); logo.update(.6);
  expect(image.dispose).toHaveBeenCalledOnce(); expect(materialDispose).toHaveBeenCalledOnce(); expect(geometryDispose).toHaveBeenCalledOnce();
  expect(logo.mesh.parent).toBeNull(); expect(logo.mesh.material.map).toBeNull();
  expect(logo.mesh.visible).toBe(false); expect(invalidate).not.toHaveBeenCalled();
});

it('keeps a missing image from breaking the live portal scene', () => {
  const image = mockImage(), invalidate = vi.fn(), logo = createPortalLogo('/missing.png', invalidate);
  expect(() => image.fail()).not.toThrow(); logo.update(.6);
  expect(logo.mesh.visible).toBe(false); expect(logo.mesh.material.map).toBeNull();
  logo.dispose(); expect(image.dispose).toHaveBeenCalledOnce();
});
