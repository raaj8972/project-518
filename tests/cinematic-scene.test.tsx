// @vitest-environment jsdom
import React, { act, Children, isValidElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PerspectiveCamera } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CinematicScene from '../src/components/cinematic/CinematicScene';

type Frame = (state: { camera: PerspectiveCamera; size: { width: number; height: number } }) => void;
const mocks = vi.hoisted(() => ({ canvas: null as HTMLCanvasElement | null, invalidate: vi.fn(), frames: [] as Frame[] }));
vi.mock('@react-three/fiber', () => ({
  // HTML canvas fallback children are mounted even when WebGL succeeds. Preserve that
  // behavior here so a side-effecting fallback cannot silently disable every device.
  Canvas: ({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) => <>{Children.toArray(children).filter(child => isValidElement(child) && typeof child.type !== 'string')}{fallback}</>,
  useThree: () => ({ invalidate: mocks.invalidate, gl: { domElement: mocks.canvas } }),
  useFrame: (callback: Frame) => { mocks.frames.push(callback); },
}));
vi.mock('@react-three/drei', () => ({ Preload: () => null }));
vi.mock('../src/components/cinematic/CinematicCharacter', () => ({ default: () => null }));
vi.mock('../src/components/cinematic/CinematicPortalLogo', () => ({ default: () => null }));
vi.mock('../src/components/cinematic/CinematicWorld', () => ({ CinematicWorld: () => null }));
vi.mock('../src/components/cinematic/CinematicLighting', () => ({ CinematicReflections: () => null, CinematicBloom: () => null }));
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.canvas = document.createElement('canvas'); mocks.frames = []; vi.clearAllMocks();
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.useRealTimers(); });

it('marks the scene ready only after its first frame and keeps mounted canvas fallback passive', async () => {
  const onReady = vi.fn(), onFailure = vi.fn(), registerInvalidate = vi.fn();
  await act(async () => root.render(<CinematicScene progress={{ current: .7 }} quality="high" onReady={onReady} onFailure={onFailure} registerInvalidate={registerInvalidate} />));
  expect(host.textContent).toContain('3D is unavailable');
  expect(onFailure).not.toHaveBeenCalled(); expect(onReady).not.toHaveBeenCalled();
  const camera = new PerspectiveCamera();
  await act(async () => mocks.frames.forEach(frame => frame({ camera, size: { width: 390, height: 844 } })));
  expect(onReady).toHaveBeenCalledTimes(1); expect(camera.position.z).toBeLessThan(0);
  await act(async () => mocks.frames.forEach(frame => frame({ camera, size: { width: 390, height: 844 } })));
  expect(onReady).toHaveBeenCalledTimes(1); expect(onFailure).not.toHaveBeenCalled();
});

it('handles actual context loss and releases its canvas listener and demand invalidator on unmount', async () => {
  const onFailure = vi.fn(), registerInvalidate = vi.fn();
  await act(async () => root.render(<CinematicScene progress={{ current: 0 }} quality="low" onReady={vi.fn()} onFailure={onFailure} registerInvalidate={registerInvalidate} />));
  expect(registerInvalidate).toHaveBeenCalledWith(expect.any(Function));
  const lost = new Event('webglcontextlost', { cancelable: true });
  await act(async () => mocks.canvas!.dispatchEvent(lost));
  expect(lost.defaultPrevented).toBe(true); expect(onFailure).toHaveBeenCalledTimes(1);
  await act(async () => root.render(null));
  expect(registerInvalidate).toHaveBeenLastCalledWith(null);
  mocks.canvas!.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  expect(onFailure).toHaveBeenCalledTimes(1);
});

it('reports a renderer that stops producing requested frames, while allowing normal demand-idle time', async () => {
  vi.useFakeTimers(); const onFailure = vi.fn(), registerInvalidate = vi.fn();
  await act(async () => root.render(<CinematicScene progress={{current:0}} quality="low" onReady={vi.fn()} onFailure={onFailure} registerInvalidate={registerInvalidate}/>));
  const camera = new PerspectiveCamera();
  await act(async () => mocks.frames.forEach(frame => frame({camera,size:{width:390,height:844}})));
  await act(async () => vi.advanceTimersByTime(30000)); expect(onFailure).not.toHaveBeenCalled();
  registerInvalidate.mock.calls[0][0]();
  await act(async () => vi.advanceTimersByTime(4000)); expect(onFailure).toHaveBeenCalledOnce();
});
