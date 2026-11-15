// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { heroMediaService, normalizeHeroMedia } from '../src/services/heroMediaService';
import { useStudioDraft } from '../src/hooks/useStudioDraft';
import { makeAboutDraft } from '../src/components/admin/homepage/HomepageAboutEditor';
import { makeSocialDraft, socialDraftError } from '../src/components/admin/homepage/HomepageSocialEditor';
import { makeHomepageDraft, normalizeHomepageDraft, serializeHomepageDraft } from '../src/components/admin/homepage/homepageForm';
import { normalizeRoadmapEdits, publicRoadmapMilestones } from '../src/utils/homepageRoadmap';
const mocks=vi.hoisted(()=>({read:vi.fn(),upsert:vi.fn(),realtime:null as any,remove:vi.fn()}));
vi.mock('../src/lib/dualDb',()=>({dualRead:mocks.read,dualUpsert:mocks.upsert,invalidateTableCache:vi.fn()}));
vi.mock('../src/lib/supabase',()=>({supabase:{channel:()=>({on:(_event:any,_filter:any,callback:any)=>{mocks.realtime=callback;return {subscribe:()=>({channel:'test'})};}}),removeChannel:mocks.remove}}));
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;mocks.read.mockResolvedValue({data:null});mocks.upsert.mockResolvedValue(undefined);});
afterEach(()=>vi.restoreAllMocks());
it('normalizes real nullable media row shapes on fetch without leaking database metadata',async()=>{
  mocks.read.mockResolvedValue({data:{id:5,page_key:'home',video_url:null,mobile_video_url:null,image_url:null,mobile_image_url:null,poster_url:null,mobile_poster_url:null,overlay_color:null,overlay_opacity:null,enabled:null,desktop_zoom:null}});
  const media=await heroMediaService.getHeroMedia('home',{strict:true});
  expect(media.video_url.trim()).toBe('');expect(media.mobile_video_url.trim()).toBe('');expect(media.overlay_opacity).toBe(.35);expect(media.enabled).toBe(true);expect(media.desktop_zoom).toBe(1);expect(media).not.toHaveProperty('id');
});
it('returns fresh defaults and preserves explicit false and valid existing URLs',()=>{
  const first=normalizeHeroMedia(null);first.video_url='mutated';
  expect(normalizeHeroMedia(null).video_url).toBe('');
  expect(normalizeHeroMedia({enabled:false,video_url:'published.mp4',overlay_opacity:0})).toMatchObject({enabled:false,video_url:'published.mp4',overlay_opacity:0});
});
it('clamps crop values and rejects objects, invalid enums and non-finite numbers',()=>{
  const media=normalizeHeroMedia({background_type:'broken',video_url:{},desktop_zoom:Infinity,mobile_zoom:'2',desktop_offset_x:20,mobile_offset_y:-20,overlay_opacity:'bad'});
  expect(media).toMatchObject({background_type:'image',video_url:'',desktop_zoom:1,mobile_zoom:2,desktop_offset_x:.5,mobile_offset_y:-.5,overlay_opacity:.35});
});
it('normalizes realtime nullable rows, handles DELETE and ignores late events after cleanup',async()=>{
  const receive=vi.fn();const stop=heroMediaService.subscribeHeroMedia('home',receive);
  await vi.waitFor(()=>expect(receive).toHaveBeenCalledTimes(1));receive.mockClear();
  await mocks.realtime({eventType:'UPDATE',new:{video_url:null,mobile_video_url:null}});
  expect(receive.mock.calls[0][0].video_url).toBe('');
  await mocks.realtime({eventType:'DELETE',new:{}});expect(receive.mock.calls[1][0].enabled).toBe(true);
  stop();await mocks.realtime({eventType:'UPDATE',new:{video_url:'late.mp4'}});expect(receive).toHaveBeenCalledTimes(2);expect(mocks.remove).toHaveBeenCalledTimes(1);
});
it('merges partial media saves with the saved record and strips unknown draft fields',async()=>{
  mocks.read.mockResolvedValue({data:{id:9,video_url:'desktop.mp4',mobile_video_url:'mobile.mp4',background_type:'video',overlay_opacity:.6}});
  await heroMediaService.saveHeroMedia('home',{enabled:false,video_url:null,unexpected:'bad'} as any);
  expect(mocks.upsert).toHaveBeenCalledWith('hero_media',expect.objectContaining({id:9,enabled:false,video_url:'desktop.mp4',mobile_video_url:'mobile.mp4',overlay_opacity:.6}));
  expect(mocks.upsert.mock.calls[0][1]).not.toHaveProperty('unexpected');
});
it('keeps strict load failures retryable and does not write fallback data',async()=>{
  vi.spyOn(console,'error').mockImplementation(()=>{});mocks.read.mockRejectedValue(new Error('offline'));
  await expect(heroMediaService.getHeroMedia('home',{strict:true})).rejects.toThrow('offline');expect(mocks.upsert).not.toHaveBeenCalled();
});
it('repairs malformed About, Social, roadmap and homepage settings before rendering or validation',()=>{
  const about=makeAboutDraft({hero_title:42,hero_paragraphs:[null,'Story'],tracks:{},stats:[null,{value:null,label:'Guests'}]} as any);
  expect(about.hero_title).toBe('About Ricorrenza');expect(about.hero_paragraphs).toEqual(['Story']);expect(about.tracks).toEqual([]);expect(about.stats).toEqual([{value:'',label:'Guests'}]);
  const social=makeSocialDraft({instagram_url:{},youtube_url:null,instagram_enabled:false} as any);expect(socialDraftError(social)).toBeNull();
  const home=makeHomepageDraft({hero_title:{},brand_year:'invalid',show_faculty_heads:null,sponsor_logos:[null]} as any);expect(typeof home.hero_title).toBe('string');expect(home.show_faculty_heads).toBe(true);expect(home.sponsor_logos).toEqual([]);
  const draft=normalizeHomepageDraft({brand_year:'2027',hero_title:'',brand_logo_side:'bad'},home);expect(draft.brand_year).toBe(2027);expect(draft.hero_title).toBe('');expect(draft.brand_logo_side).toBe('left');
  expect(serializeHomepageDraft({...home,brand_year:NaN}).brand_year).toBeNull();
  expect(publicRoadmapMilestones([{id:1,year:2023,title:null,points:[null,'History'],enabled:true}] as any)[0].lines).toEqual(['History']);
  expect(normalizeRoadmapEdits({broken:null})).toEqual({});
});
it('restores partial media only after async load and remains clean after discard and a source refresh',async()=>{
  localStorage.setItem('async-media',JSON.stringify({video_url:null,mobile_video_url:{},overlay_color:'#123456'}));
  let draft!:ReturnType<typeof useStudioDraft<ReturnType<typeof normalizeHeroMedia>>>;
  function Harness({source}:{source:ReturnType<typeof normalizeHeroMedia>|null}){draft=useStudioDraft('async-media',source,normalizeHeroMedia);return null;}
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  try{
    await act(async()=>root.render(<Harness source={null}/>));expect(draft.form).toBeNull();expect(localStorage.getItem('async-media')).not.toBeNull();
    const saved=normalizeHeroMedia({video_url:'saved.mp4'});
    await act(async()=>root.render(<Harness source={saved}/>));expect(draft.form?.video_url).toBe('saved.mp4');expect(draft.form?.overlay_color).toBe('#123456');expect(draft.dirty).toBe(true);
    await act(async()=>draft.discard());expect(draft.dirty).toBe(false);expect(localStorage.getItem('async-media')).toBeNull();
    await act(async()=>root.render(<Harness source={{...saved}}/>));expect(draft.dirty).toBe(false);
    await act(async()=>draft.setForm(previous=>({...previous,video_url:'draft.mp4'})));
    await act(async()=>root.render(<Harness source={{...saved,mobile_video_url:'new-server.mp4'}}/>));expect(draft.form?.video_url).toBe('draft.mp4');
    await act(async()=>draft.discard());expect(draft.form?.mobile_video_url).toBe('new-server.mp4');expect(draft.dirty).toBe(false);
  }finally{await act(async()=>root.unmount());host.remove();}
});
