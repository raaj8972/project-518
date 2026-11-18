// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Box3 } from 'three';
import type { LineSegments, Scene } from 'three';
import { createFestivalEnvironment } from '../src/components/ui/festival/environmentRenderer';

const captured = vi.hoisted(() => ({ scene: undefined as Scene | undefined }));
vi.mock('three', async importOriginal => {
  const three = await importOriginal<typeof import('three')>();
  return {
    ...three,
    WebGLRenderer: class {
      domElement = document.createElement('canvas');
      shadowMap = { enabled: false, type: 0 };
      setClearColor() {} setPixelRatio() {} getPixelRatio() { return 1; } setSize() {}
      render(scene: Scene) { captured.scene = scene; }
      dispose() {} forceContextLoss() {}
    },
    TextureLoader: class { load() { return new three.Texture(); } },
  };
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); captured.scene = undefined; });

it('uploads scattered, moving green streaks into the rendered buffers instead of a solid lower beam', () => {
  let nextFrame: FrameRequestCallback | undefined;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { nextFrame = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const host = document.createElement('div');
  const world = createFestivalEnvironment(host, vi.fn())!;
  world.resize(390, 900);
  const scene = captured.scene!;
  const streaks = scene.getObjectByName('scattered-falling-energy') as LineSegments;
  const positions = streaks.geometry.attributes.position;
  const initial = Float32Array.from(positions.array);
  const xValues = Array.from({ length: positions.count }, (_, i) => positions.getX(i));
  expect(Math.max(...xValues) - Math.min(...xValues)).toBeGreaterThan(.3);
  expect(scene.getObjectByName('island-ground-energy-beam')).toBeUndefined();
  expect(scene.getObjectByName('falling-green-sparks')).toBeDefined();
  world.setPaused(false);
  for (let i = 1; i <= 30; i++) nextFrame!(i * 40);
  expect(Array.from(positions.array).some((value, i) => Math.abs(value - initial[i]) > .01)).toBe(true);
  const color = streaks.geometry.attributes.color;
  expect(color.getX(0)).toBeGreaterThan(color.getX(1));
  world.dispose();
  expect(host.querySelector('canvas')).toBeNull();
});

it('keeps the entire rotating campus below desktop actions, including when the page is scrolled', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const section = document.createElement('section');
  const actions = document.createElement('div'); actions.className = 'spider-hero-actions';
  const host = document.createElement('div'); const control = document.createElement('div');
  section.append(actions, host, control);
  vi.spyOn(section, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, -150, 1680, 1000));
  vi.spyOn(actions, 'getBoundingClientRect').mockReturnValue(new DOMRect(500, 450, 680, 60));
  const world = createFestivalEnvironment(host, vi.fn(), { islandControl: control })!;
  try {
    world.resize(1680, 1000);
    const extra = parseFloat(section.style.getPropertyValue('--island-extra-space'));
    const height = 1000 + extra; world.resize(1680, height); world.setPaused(false);
    const scene = captured.scene!;
    for (let turn = 0; turn < 8; turn++) {
      world.rotateBy(Math.PI / 4); scene.updateMatrixWorld(true);
      const bounds = new Box3().setFromObject(scene.getObjectByName('rotating-floating-island')!, true);
      expect(height / 2 - bounds.max.y * height / 10).toBeGreaterThan(660 + 16);
      expect(height / 2 - bounds.min.y * height / 10).toBeLessThan(height - 60);
    }
    expect(parseFloat(control.style.top)).toBeGreaterThan(660 + 16);
    // The desktop hero reserves enough room for a prominent island, rather
    // than shrinking the model into the old 250px bottom padding.
    world.resetRotation();
    // A new baseline includes the currently reserved extra space.
    world.resize(1680, 1440 + extra); scene.updateMatrixWorld(true);
    const large = new Box3().setFromObject(scene.getObjectByName('rotating-floating-island')!, true);
    expect((large.max.x - large.min.x) * (1440 + extra) / 10).toBeGreaterThan(1680 * .35);
    expect((1440 + extra) / 2 - large.max.y * (1440 + extra) / 10).toBeGreaterThan(660 + 16);
  } finally { world.dispose(); }
});

it('keeps the tower banner beside and behind the island on mobile and desktop', () => {
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const host = document.createElement('div');
  const world = createFestivalEnvironment(host, vi.fn())!;
  try {
    world.resize(390, 1000);
    const scene = captured.scene!;
    const flag = scene.getObjectByName('foreground-battle-flag')!;
    expect(flag.visible).toBe(true);
    expect(flag.position.z).toBeLessThan(0);
    expect(flag.renderOrder).toBe(0);
    const bracket = flag.getObjectByName('flag-wall-bracket')!;
    expect(bracket.visible).toBe(true);
    expect(bracket.getObjectByName('flag-diagonal-brace')).toBeDefined();
    expect(bracket.getObjectByName('flag-grounded-post')).toBeDefined();
    scene.updateMatrixWorld(true);
    const footing = new Box3().setFromObject(bracket.getObjectByName('flag-stone-footing')!, true);
    expect(500 - footing.min.y * 100).toBeCloseTo(958);
    const bounds = new Box3().setFromObject(flag, true);
    expect((bounds.max.x - bounds.min.x) * 100).toBeLessThan(100);
    expect(195 + bounds.min.x * 100).toBeGreaterThan(8);
    expect(195 + bounds.max.x * 100).toBeLessThan(382);
    world.resize(1440, 1100);
    expect(flag.visible).toBe(true);
    expect(flag.position.z).toBeLessThan(0);
    expect(flag.renderOrder).toBe(0);
    expect(bracket.visible).toBe(false);
    world.setPaused(false);
    for (const [width, height] of [[390, 1000], [1440, 1100]]) {
      world.resize(width, height);
      for (let turn = 0; turn < 8; turn++) {
        world.rotateBy(Math.PI / 4); scene.updateMatrixWorld(true);
        const island = new Box3().setFromObject(scene.getObjectByName('rotating-floating-island')!, true);
        const banner = new Box3().setFromObject(flag, true);
        expect(banner.max.z).toBeLessThan(island.min.z);
      }
    }
  } finally { world.dispose(); }
});

it('holds the island at 150% below the actions without repeated layout growth', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const section = document.createElement('section');
  const actions = document.createElement('div'); actions.className = 'spider-hero-actions';
  const host = document.createElement('div'); section.append(actions, host);
  vi.spyOn(actions, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 440, 390, 60));
  const world = createFestivalEnvironment(host, vi.fn())!;
  try {
    world.resize(390, 1000);
    const extra = parseFloat(section.style.getPropertyValue('--island-extra-space'));
    expect(extra).toBeGreaterThan(0);
    const height = 1000 + extra;
    for (let pass = 0; pass < 5; pass++) world.resize(390, height);
    expect(parseFloat(section.style.getPropertyValue('--island-extra-space'))).toBeCloseTo(extra);
    const scene = captured.scene!; scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene.getObjectByName('rotating-floating-island')!, true);
    expect((box.max.x - box.min.x) * height / 10).toBeGreaterThan(390);
    expect(height / 2 - box.max.y * height / 10).toBeGreaterThan(516);
    expect(height / 2 - box.min.y * height / 10).toBeLessThan(height - 174);
    expect(host.querySelectorAll('canvas')).toHaveLength(1);
  } finally { world.dispose(); }
  expect(section.style.getPropertyValue('--island-extra-space')).toBe('');
});
