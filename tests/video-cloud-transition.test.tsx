// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import VideoCloudTransition from '../src/components/cinematic/VideoCloudTransition';
let root: Root, host: HTMLDivElement, film: HTMLVideoElement, time: number;
let frames: Map<number, FrameRequestCallback>, id: number;
let contexts: { drawImage: ReturnType<typeof vi.fn> }[];
beforeEach(() => {
  (globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT=true;
  frames=new Map();id=0;contexts=[];time=0;
  vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{frames.set(++id,cb);return id;});
  vi.stubGlobal('cancelAnimationFrame',(key:number)=>frames.delete(key));
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>{
    const context={drawImage:vi.fn(),clearRect:vi.fn(),fillRect:vi.fn(),save:vi.fn(),restore:vi.fn(),translate:vi.fn(),scale:vi.fn(),rotate:vi.fn(),setTransform:vi.fn(),createRadialGradient:()=>({addColorStop:vi.fn()})};
    contexts.push(context);return context as unknown as CanvasRenderingContext2D;
  });
  film=document.createElement('video');
  Object.defineProperties(film,{videoWidth:{value:1280},videoHeight:{value:720},readyState:{value:2},duration:{value:10},currentTime:{get:()=>time},seeking:{value:false}});
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('samples decoded original film clouds, never the opening frame or an imported PNG panel',async()=>{
  const onReady=vi.fn(), registerDraw=vi.fn(), progress={current:.53};
  await act(async()=>root.render(<VideoCloudTransition video={{current:film}} progress={progress} mobile={false} onReady={onReady} onFailure={vi.fn()} registerDraw={registerDraw}/>));
  expect(onReady).not.toHaveBeenCalled();expect(host.querySelector('img')).toBeNull();
  time=9.958333;
  await act(async()=>film.dispatchEvent(new Event('seeked')));
  expect(onReady).toHaveBeenCalledTimes(1);
  const sourceDraws=contexts.flatMap(c=>c.drawImage.mock.calls).filter(call=>call[0]===film);
  expect(sourceDraws).toHaveLength(8);
  for (const call of sourceDraws) {
    expect(call[3]).toBeGreaterThan(film.videoWidth * .3);
    expect(call[7] / call[8]).toBeCloseTo(call[3] / call[4], 2);
  }
  expect(frames.size).toBe(1);
  progress.current=.7; const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(100));
  expect(frames.size).toBe(0);
  await act(async()=>root.render(null));expect(registerDraw).toHaveBeenLastCalledWith(null);
});
it('cancels animation work and media listeners when the transition unmounts',async()=>{
  time=9.958333;const onReady=vi.fn(),registerDraw=vi.fn();
  await act(async()=>root.render(<VideoCloudTransition video={{current:film}} progress={{current:.56}} mobile={false} onReady={onReady} onFailure={vi.fn()} registerDraw={registerDraw}/>));
  expect(frames.size).toBe(1);
  await act(async()=>root.render(null));expect(frames.size).toBe(0);
  film.dispatchEvent(new Event('seeked'));expect(onReady).toHaveBeenCalledTimes(1);
});

it('reports an unavailable 2D compositor so the homepage can open without a stuck wipe', async () => {
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
  const onFailure = vi.fn();
  await act(async () => root.render(<VideoCloudTransition video={{current:film}} progress={{current:.55}} mobile onReady={vi.fn()} onFailure={onFailure} registerDraw={vi.fn()} />));
  expect(onFailure).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
});
