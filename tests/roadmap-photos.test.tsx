// @vitest-environment jsdom
import React,{act,useState} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import TimelinePhotos from '../src/components/Timeline/TimelinePhotos';
import {RoadmapPhotoEditor} from '../src/components/admin/RoadmapPhotoEditor';
import {normalizeRoadmapEdits,normalizeRoadmapImages,publicRoadmapMilestones} from '../src/utils/homepageRoadmap';
import {persistRoadmap} from '../src/utils/persistRoadmap';

vi.mock('../src/components/ImageUpload',()=>({ImageUpload:({onImageSelect,onBatchComplete}: {onImageSelect:(url:string)=>void;onBatchComplete:(results:{url:string;file:File}[])=>void})=><>
  <button type="button" aria-label="Upload selected photo" onClick={()=>onImageSelect('https://photos.example/replacement.jpg')}>Upload</button>
  <button type="button" aria-label="Upload a photo batch" onClick={()=>{onImageSelect('https://photos.example/one.jpg');onImageSelect('https://photos.example/two.jpg');onBatchComplete([{url:'https://photos.example/one.jpg',file:{} as File},{url:'https://photos.example/two.jpg',file:{} as File}]);}}>Batch</button>
</>}));
let host:HTMLDivElement,root:Root,reduced=false;
const photos=['https://photos.example/one.jpg','https://photos.example/two.jpg','https://photos.example/three.jpg'];
beforeEach(()=>{
  (globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT=true;reduced=false;
  vi.stubGlobal('IntersectionObserver',undefined);vi.stubGlobal('matchMedia',()=>({matches:reduced,addEventListener(){},removeEventListener(){}}));
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.useRealTimers();vi.unstubAllGlobals();});
const click=(label:string)=>act(async()=>host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click());
const active=()=>host.querySelector<HTMLImageElement>('.chronicle-photo__image.is-current')?.src;
const tick=(ms:number)=>act(async()=>vi.advanceTimersByTime(ms));

it('automatically cycles each year’s photos, wraps, and pauses for manual navigation',async()=>{
  vi.useFakeTimers();await act(async()=>root.render(<TimelinePhotos images={photos} year="2026"/>));
  expect(active()).toBe(photos[0]);await tick(4950);expect(active()).toBe(photos[1]);
  await tick(9900);expect(active()).toBe(photos[0]);
  await click('Next 2026 photo');expect(active()).toBe(photos[1]);await tick(20000);expect(active()).toBe(photos[1]);
  await click('Play 2026 photos');await tick(4950);expect(active()).toBe(photos[2]);
});
it('keeps photos still for reduced motion and hides controls for a single photo',async()=>{
  vi.useFakeTimers();reduced=true;await act(async()=>root.render(<TimelinePhotos images={photos} year="2015"/>));
  await tick(30000);expect(active()).toBe(photos[0]);expect(host.querySelector('[aria-label="Pause 2015 photos"]')).toBeNull();
  await act(async()=>root.render(<TimelinePhotos images={photos.slice(0,1)} year="2015"/>));expect(host.querySelector('button')).toBeNull();
});
it('appends a multi-upload batch once and supports replacement, reordering and deletion',async()=>{
  function Editor(){const[images,setImages]=useState<string[]>([]);return <><RoadmapPhotoEditor images={images} year={2015} onChange={setImages}/><output>{JSON.stringify(images)}</output></>;}
  await act(async()=>root.render(<Editor/>));await click('Upload a photo batch');
  expect(JSON.parse(host.querySelector('output')!.textContent!)).toEqual(photos.slice(0,2));
  await click('Move photo 2 earlier');expect(JSON.parse(host.querySelector('output')!.textContent!)).toEqual([photos[1],photos[0]]);
  await click('Replace photo 1');await click('Upload selected photo');
  expect(JSON.parse(host.querySelector('output')!.textContent!)).toEqual(['https://photos.example/replacement.jpg',photos[0]]);
  await click('Delete photo 2');expect(JSON.parse(host.querySelector('output')!.textContent!)).toEqual(['https://photos.example/replacement.jpg']);
});
it('keeps photos through restored drafts and public milestone normalization without unsafe URLs',()=>{
  expect(normalizeRoadmapImages([null,photos[0],photos[0],'javascript:alert(1)','data:image/png;base64,x','bad'])).toEqual([photos[0]]);
  const drafts=normalizeRoadmapEdits({'milestone-1':{id:1,year:2015,images:photos,title:'Beginning',points:['History'],enabled:true}});
  expect(drafts['milestone-1'].images).toEqual(photos);
  const publicYear=publicRoadmapMilestones([{...drafts['milestone-1'],side:'right'}] as never)[0];
  expect(publicYear.images).toEqual(photos);expect(publicYear.lines).toEqual(['Beginning','History']);
});
it('keeps existing history text editable on a deployment awaiting the photo column',async()=>{
  const write=vi.fn().mockRejectedValueOnce({code:'PGRST204',message:"Could not find the images column in the schema cache"}).mockResolvedValue(undefined);
  const payload={year:2015,title:'Updated history',images:[]};
  await persistRoadmap(write,payload);
  expect(write).toHaveBeenLastCalledWith({year:2015,title:'Updated history'});expect(payload.images).toEqual([]);
});
it('never silently discards photos when the database photo setup is pending',async()=>{
  const write=vi.fn().mockRejectedValue({code:'PGRST204',message:"Could not find the images column in the schema cache"});
  await expect(persistRoadmap(write,{images:photos})).rejects.toThrow('Your photo draft is kept');expect(write).toHaveBeenCalledTimes(1);
});
it('preserves photos in normal writes and propagates unrelated save errors',async()=>{
  const write=vi.fn().mockResolvedValue(undefined);await persistRoadmap(write,{images:photos});expect(write).toHaveBeenCalledWith({images:photos});
  const failure={code:'42501',message:'Permission denied'};write.mockRejectedValueOnce(failure);
  await expect(persistRoadmap(write,{images:photos})).rejects.toBe(failure);
});
