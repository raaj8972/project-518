// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {CyberpunkHeroContent} from '../src/components/ui/CyberpunkHeroContent';
const mocks=vi.hoisted(()=>({receive:null as any,stop:vi.fn(),subscribe:vi.fn()}));
vi.mock('../src/context/DataContext',()=>({useData:()=>({homepageSettings:{hero_title:'RICO'}})}));
vi.mock('../src/services/heroMediaService',()=>({heroMediaService:{subscribeHeroMedia:(page:string,callback:any)=>{mocks.subscribe(page);mocks.receive=callback;return mocks.stop;}}}));
vi.mock('lottie-web',()=>({default:{loadAnimation:()=>({destroy:vi.fn()})}}));
it('connects the Events page to its own live media, responds to device size and honors image/visibility changes',async()=>{
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
 vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',vi.fn());
 Object.defineProperty(window,'innerWidth',{configurable:true,value:1200,writable:true});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<CyberpunkHeroContent pageKey="events"/>));expect(mocks.subscribe).toHaveBeenCalledWith('events');
  await act(async()=>mocks.receive({enabled:true,background_type:'video',video_url:'/events-desktop.mp4',mobile_video_url:'/events-mobile.mp4',mobile_poster_url:'/events-mobile.jpg'}));
  expect(host.querySelector('video source')?.getAttribute('src')).toBe('/events-desktop.mp4');
  await act(async()=>{window.innerWidth=400;window.dispatchEvent(new Event('resize'));});
  expect(host.querySelector('video source')?.getAttribute('src')).toBe('/events-mobile.mp4');expect(host.querySelector('video')?.getAttribute('poster')).toBe('/events-mobile.jpg');
  await act(async()=>mocks.receive({enabled:true,background_type:'image',image_url:'/events-desktop.jpg',mobile_image_url:'/events-mobile.jpg'}));
  expect(host.querySelector('video')).toBeNull();expect(host.querySelector('img')?.getAttribute('src')).toBe('/events-mobile.jpg');
  await act(async()=>mocks.receive({enabled:false,background_type:'video',video_url:'/events.mp4'}));expect(host.querySelector('video')).toBeNull();expect(host.querySelector('img')).toBeNull();
 }finally{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();}
 expect(mocks.stop).toHaveBeenCalledTimes(1);
});
