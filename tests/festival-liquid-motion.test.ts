// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LineSegments, Mesh, Scene, ShaderMaterial } from 'three';
import { createLiquidDrops, stepLiquidDrops, type LiquidBounds, type LiquidDrop } from '../src/components/ui/festival/liquidMotion';
import { createFestivalEnvironment, type EnvironmentController } from '../src/components/ui/festival/environmentRenderer';

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

const bounds: LiquidBounds = { width: 1200, top: 900, bottom: 7000 };
const idle = { x: 0, y: 0, active: false, pressed: false };
const makeDrop = (overrides: Partial<LiquidDrop> = {}): LiquidDrop => ({ x: 600, y: 1500, vx: 0, vy: 180, radius: 3, speed: 180, phase: 0, lane: .5, ...overrides });

describe('document-space liquid motion', () => {
  it('continues the same fall at lower document coordinates without a viewport reset', () => {
    const drops = [makeDrop({ y: 3400 })];
    stepLiquidDrops(drops, .05, 0, bounds, idle);
    expect(drops[0].y).toBeCloseTo(3409);
    stepLiquidDrops(drops, .05, .05, bounds, idle);
    expect(drops[0].y).toBeCloseTo(3418);
    expect(drops[0].y).toBeGreaterThan(bounds.top + 2000);
  });

  it('recycles a drop past the document floor or sideways off screen back to its source lane', () => {
    const drops = [makeDrop({ y: bounds.bottom + 25, vx: 50 }), makeDrop({ x: bounds.width + 41, lane: .2 })];
    stepLiquidDrops(drops, .02, 1, bounds, idle);
    expect(drops[0]).toMatchObject({ x: 600, y: 891, vx: 0, vy: 117 });
    expect(drops[1]).toMatchObject({ x: 240, y: 891, vx: 0, vy: 117 });
  });

  it('pushes nearby water away with mouse movement and a stronger touch impulse', () => {
    const untouched = [makeDrop()]; const hovered = [makeDrop()]; const touched = [makeDrop()];
    const pointer = { x: 575, y: 1500, active: true, pressed: false };
    stepLiquidDrops(untouched, .04, 0, bounds, idle);
    stepLiquidDrops(hovered, .04, 0, bounds, pointer);
    stepLiquidDrops(touched, .04, 0, bounds, { ...pointer, pressed: true });
    expect(hovered[0].x).toBeGreaterThan(untouched[0].x);
    expect(touched[0].vx).toBeGreaterThan(hovered[0].vx);
    expect(touched[0].x).toBeGreaterThan(hovered[0].x);
    const before = touched[0].vx;
    stepLiquidDrops(touched, .05, .05, bounds, idle);
    expect(touched[0].vx).toBeGreaterThan(0);
    expect(touched[0].vx).toBeLessThan(before);
  });

  it('chooses a finite deflection when a finger exactly overlaps a drop', () => {
    const drops = [makeDrop({ phase: 1.2 })];
    stepLiquidDrops(drops, .04, 1, bounds, { x: 600, y: 1500, active: true, pressed: true });
    expect([drops[0].x, drops[0].y, drops[0].vx, drops[0].vy].every(Number.isFinite)).toBe(true);
    expect(Math.abs(drops[0].vx)).toBeGreaterThan(1);
  });

  it('keeps valid drops unchanged at zero elapsed time, even under a pressed pointer', () => {
    const drops = [makeDrop({ vx: 47, vy: -25, phase: 1.2 })]; const before = structuredClone(drops);
    stepLiquidDrops(drops, 0, 9, bounds, { x: 600, y: 1500, active: true, pressed: true });
    expect(drops).toEqual(before);
  });

  it('caps work for very tall documents and uses a lower density after a mobile resize', () => {
    const tall = createLiquidDrops({ ...bounds, bottom: 100_000 });
    expect(tall).toHaveLength(160);
    const desktop = createLiquidDrops(bounds); const mobileBounds = { ...bounds, width: 390 };
    const mobile = createLiquidDrops(mobileBounds);
    expect(mobile.length).toBeLessThan(desktop.length);
    for (const drop of mobile) {
      expect(drop.x).toBeGreaterThanOrEqual(0); expect(drop.x).toBeLessThanOrEqual(mobileBounds.width);
      expect(drop.y).toBeGreaterThanOrEqual(bounds.top); expect(drop.y).toBeLessThanOrEqual(bounds.bottom);
    }
    expect(createLiquidDrops({ ...bounds, bottom: bounds.top })).toHaveLength(0);
  });
});

describe('hero river and falling water reactions', () => {
  let now: number; let sequence: number; let frames: Map<number, FrameRequestCallback>;
  const worlds: EnvironmentController[] = [];
  beforeEach(() => {
    now = 0; sequence = 0; frames = new Map();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { const id = ++sequence; frames.set(id, callback); return id; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  });
  afterEach(() => { worlds.splice(0).forEach(world => world.dispose()); vi.restoreAllMocks(); vi.unstubAllGlobals(); captured.scene = undefined; });
  const makeWorld = () => {
    const host = document.createElement('div'); const world = createFestivalEnvironment(host, vi.fn())!;
    worlds.push(world); world.resize(1280, 900);
    return { host, world, scene: captured.scene! };
  };
  const advance = (count: number) => {
    for (let step = 0; step < count; step++) {
      now += 40; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now));
    }
  };

  it('maps touch to river UVs, advances the current and ignores input while paused', () => {
    const { world, scene } = makeWorld();
    const river = scene.getObjectByName('emerald-flowing-river') as Mesh;
    const material = river.material as ShaderMaterial;
    expect(material.uniforms.uAspect.value).toBeCloseTo(1280 / 900);
    world.react(.4, .9, true);
    expect(material.uniforms.uTouch.value.w).toBe(0);
    world.setPaused(false); world.react(.4, .9, true); advance(5);
    expect(material.uniforms.uTouch.value.x).toBeCloseTo(.4);
    expect(material.uniforms.uTouch.value.y).toBeCloseTo(.1);
    expect(material.uniforms.uTouch.value.w).toBeGreaterThan(0);
    expect(material.uniforms.uTime.value).toBeGreaterThan(0);
    expect(material.uniforms.uPointer.value.z).toBeGreaterThan(0);
    world.setPaused(true); const frozen = material.uniforms.uTime.value; advance(5);
    expect(material.uniforms.uTime.value).toBe(frozen);
  });

  it('deflects the actual falling drop buffers near a touch while retaining finite positions', () => {
    const untouched = makeWorld(); const touched = makeWorld();
    const getPositions = (scene: Scene) => (scene.getObjectByName('scattered-falling-energy') as LineSegments).geometry.attributes.position;
    const initial = getPositions(touched.scene); const dropIndex = 30 * 2;
    const x = .5 + initial.getX(dropIndex) / (1280 / 900 * 10); const y = .5 - initial.getY(dropIndex) / 10;
    untouched.world.setPaused(false); touched.world.setPaused(false); touched.world.react(x, y, true);
    advance(8);
    const regular = getPositions(untouched.scene); const displaced = getPositions(touched.scene);
    expect(Math.hypot(displaced.getX(dropIndex) - regular.getX(dropIndex), displaced.getY(dropIndex) - regular.getY(dropIndex))).toBeGreaterThan(.05);
    expect(Array.from(displaced.array).every(Number.isFinite)).toBe(true);
    expect(Array.from(regular.array).every(Number.isFinite)).toBe(true);
  });
});
