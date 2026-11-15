// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { canLookAround, createInlineLook } from '../src/components/cinematic/inlineLook';
import { samplePortalCamera } from '../src/components/cinematic/cinematicMotion';

let element: HTMLDivElement, progress: {current:number}, look: {yaw:number}, invalidate: ReturnType<typeof vi.fn>, dispose: () => void;
function pointer(type: string, x: number, y: number, target: Element = element) {
  const event = new MouseEvent(type, {clientX:x,clientY:y,button:0,bubbles:true,cancelable:true});
  Object.defineProperties(event,{pointerId:{value:1},isPrimary:{value:true}});
  target.dispatchEvent(event);return event;
}
beforeEach(()=>{
  element=document.createElement('div');element.tabIndex=0;document.body.append(element);
  progress={current:.73};look={yaw:0};invalidate=vi.fn();
  Object.assign(element,{setPointerCapture:vi.fn(),hasPointerCapture:()=>false,releasePointerCapture:vi.fn()});
  vi.spyOn(window,'innerWidth','get').mockReturnValue(400);
  dispose=createInlineLook(element,{progress,look,invalidate});
});
afterEach(()=>{dispose();element.remove();vi.restoreAllMocks();});
it('orbits in the same scene on a horizontal drag and leaves vertical progress unchanged',()=>{
  pointer('pointerdown',100,200);const move=pointer('pointermove',280,203);
  expect(move.defaultPrevented).toBe(true);expect(look.yaw).toBeCloseTo(-Math.PI*.9);
  expect(element.setPointerCapture).toHaveBeenCalledWith(1);expect(invalidate).toHaveBeenCalledOnce();
  expect(progress.current).toBe(.73);pointer('pointerup',280,203);expect(element.dataset.looking).toBeUndefined();
});
it('does not capture/prevent vertical touch scrolling or convert it to rotation',()=>{
  pointer('pointerdown',100,200);const move=pointer('pointermove',103,110);
  expect(move.defaultPrevented).toBe(false);expect(look.yaw).toBe(0);
  expect(element.setPointerCapture).not.toHaveBeenCalled();expect(invalidate).not.toHaveBeenCalled();
  pointer('pointermove',280,100);expect(look.yaw).toBe(0);
});
it('ignores the film, portal passage, small taps and interactive buttons',()=>{
  expect(canLookAround(.4)).toBe(false);expect(canLookAround(.73)).toBe(true);expect(canLookAround(.9)).toBe(false);
  progress.current=.4;pointer('pointerdown',0,0);pointer('pointermove',100,0);expect(look.yaw).toBe(0);
  progress.current=.73;pointer('pointerdown',0,0);pointer('pointermove',3,1);expect(look.yaw).toBe(0);pointer('pointerup',3,1);
  const button=document.createElement('button');element.append(button);
  pointer('pointerdown',0,0,button);pointer('pointermove',200,0);expect(look.yaw).toBe(0);
});
it('cancels native pointer gestures and removes all handlers on teardown',()=>{
  pointer('pointerdown',0,0);pointer('pointermove',30,0);const previous=look.yaw;
  pointer('pointercancel',30,0);pointer('pointermove',120,0);expect(look.yaw).toBe(previous);
  dispose();pointer('pointerdown',0,0);pointer('pointermove',200,0);expect(look.yaw).toBe(previous);
});
it('supports keyboard look without consuming the vertical arrow keys',()=>{
  const right=new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true});element.dispatchEvent(right);
  expect(right.defaultPrevented).toBe(true);expect(look.yaw).toBeLessThan(0);
  const down=new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true});element.dispatchEvent(down);
  expect(down.defaultPrevented).toBe(false);
});
it('shows the actual face from the front and preserves scroll travel with the orbit held',()=>{
  const behind=samplePortalCamera(.3,390/844),front=samplePortalCamera(.3,390/844,Math.PI);
  expect(front.position[2]).toBeLessThan(front.target[2]);expect(behind.position[2]).toBeGreaterThan(behind.target[2]);
  expect(samplePortalCamera(.5,390/844,Math.PI).target[2]).toBeLessThan(front.target[2]);
});
it('stays inside the hall, eases back before the portal and remains reversible',()=>{
  for(const yaw of [-Math.PI,-1,0,1,Math.PI])for(let i=0;i<=100;i++){
    const p=i/100,pose=samplePortalCamera(p,390/844,yaw);
    expect([...pose.position,...pose.target,pose.fov].every(Number.isFinite)).toBe(true);
    expect(Math.abs(pose.position[0])).toBeLessThan(4);
    if(p>=.82)expect(pose).toEqual(samplePortalCamera(p,390/844));
    if(p<=.6)expect(pose.position[2]).toBeGreaterThan(-75.36);
    const next=samplePortalCamera(Math.min(1,p+.00001),390/844,yaw);
    expect(Math.hypot(...next.position.map((v,j)=>v-pose.position[j]))).toBeLessThan(.03);
  }
});
