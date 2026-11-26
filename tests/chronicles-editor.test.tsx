// @vitest-environment jsdom
import React, {act,useState} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {HomepageRoadmapEditor} from '../src/components/admin/homepage/HomepageRoadmapEditor';
import type {RoadmapEdits} from '../src/utils/homepageRoadmap';
import {makeHomepageDraft} from '../src/components/admin/homepage/homepageForm';

vi.mock('../src/components/ImageUpload',()=>({ImageUpload:({bucket,folder,onProcessingChange}:{bucket:string;folder:string;onProcessingChange:(busy:boolean)=>void})=><button type="button" data-bucket={bucket} data-folder={folder} onClick={()=>onProcessingChange(true)}>Start upload</button>}));
let host:HTMLDivElement,root:Root;
const records=[{id:1,year:2015,title:'The beginning',points:['Original detail'],images:[],enabled:true,order_position:1,side:'left'},{id:2,year:2026,title:'Latest',points:[],images:[],enabled:true,order_position:2,side:'right'}] as any;
function Editor({empty=false}:{empty?:boolean}) {
 const [edits,setEdits]=useState<RoadmapEdits>({});const [form,setForm]=useState(()=>makeHomepageDraft(null));
 return <><HomepageRoadmapEditor records={empty?[]:records} edits={edits} setEdits={setEdits} form={form} setForm={setForm}/><output>{JSON.stringify(edits)}</output></>;
}
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
const click=async(label:string)=>{await act(async()=>{[...host.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.getAttribute('aria-label')===label||button.textContent===label)!.click();});};
it('keeps selected edition and its photos together through reorder and locks navigation during uploads',async()=>{
 await act(async()=>root.render(<Editor/>));
 await click('Edit 2026 milestone');
 expect(host.querySelector('[data-bucket]')?.getAttribute('data-bucket')).toBe('roadmap-images');
 expect(host.querySelector('[data-folder]')?.getAttribute('data-folder')).toBe('roadmap/2026');
 await click('Move milestone earlier');
 const edits=JSON.parse(host.querySelector('output')!.textContent!);
 expect(edits['milestone-2'].order_position).toBe(1);expect(edits['milestone-1'].order_position).toBe(2);
 expect(host.querySelector('[aria-label="Edit 2026 milestone"]')?.getAttribute('aria-pressed')).toBe('true');
 await click('Start upload');
 expect(host.querySelector<HTMLButtonElement>('[aria-label="Edit 2015 milestone"]')?.disabled).toBe(true);
});
it('imports existing history without inventing a published edition, and lets new drafts be removed',async()=>{
 await act(async()=>root.render(<Editor empty/>));
 expect(host.textContent).toContain('built-in history');await click('Copy default history');
 const imported=JSON.parse(host.querySelector('output')!.textContent!);
 expect(imported['default-2015'].points).toContain('Biggest ever in History of RICORRENZA');
 await click('Add year');expect(host.textContent).toContain('New edition');
 await click('Remove new milestone from draft');expect(JSON.parse(host.querySelector('output')!.textContent!)).toEqual(imported);
});
