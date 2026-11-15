// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {GuestArtistManagement} from '../src/components/admin/GuestArtistManagement';
const mocks=vi.hoisted(()=>({artists:[] as any[],add:vi.fn(),update:vi.fn(),remove:vi.fn(),enabled:vi.fn(),featured:vi.fn(),approval:vi.fn(),check:vi.fn(),uploads:{} as Record<string,(busy:boolean)=>void>,ai:null as any}));
vi.mock('../src/context/DataContext',()=>({useData:()=>({guestArtists:mocks.artists,addGuestArtist:mocks.add,updateGuestArtist:mocks.update,deleteGuestArtist:mocks.remove,toggleGuestArtistEnabled:mocks.enabled,toggleGuestArtistFeatured:mocks.featured})}));
vi.mock('../src/context/SavingProgressContext',()=>({useSavingProgress:()=>({withSteps:()=>({next:vi.fn()}),done:vi.fn()})}));
vi.mock('../src/hooks/useApprovals',()=>({useApprovals:()=>({checkRequiresApproval:mocks.check,submitForApproval:mocks.approval})}));
vi.mock('../src/components/ImageUpload',()=>({ImageUpload:({onImageSelect,onProcessingChange,currentImage,bucket,folder,preserveExistingMedia}:any)=>{mocks.uploads[`${bucket}:${folder}`]=onProcessingChange;return <div data-preserve={String(preserveExistingMedia)}><button type="button" aria-label={`Upload ${bucket} ${folder}`} onClick={()=>onImageSelect(`https://media.example/${bucket}.jpg`)}>Upload</button>{currentImage&&<img src={currentImage} alt="Uploaded preview"/>}</div>;}}));
vi.mock('../src/components/admin/GenericAIGenerator',()=>({GenericAIGenerator:({onGenerated,onGeneratingChange}:any)=><button type="button" onClick={()=>{onGeneratingChange(true);mocks.ai=()=>{onGenerated({name:'Generated artist',title:'Vocalist',specialty:'Fusion',description:'Reviewed bio',achievements:['Live set']});onGeneratingChange(false);};}}>Generate test bio</button>}));
let host:HTMLDivElement,root:Root;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;mocks.artists=[];mocks.uploads={};for(const mock of [mocks.add,mocks.update,mocks.remove,mocks.enabled,mocks.featured])mock.mockReset().mockResolvedValue(undefined);mocks.check.mockReset().mockResolvedValue(false);mocks.approval.mockReset().mockResolvedValue({success:true});HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();});
async function mount(){await act(async()=>root.render(<GuestArtistManagement/>));}
function button(label:string){return [...document.querySelectorAll<HTMLButtonElement>('button')].find(node=>node.textContent?.trim()===label||node.getAttribute('aria-label')===label)!;}
async function click(label:string){expect(button(label),label).toBeTruthy();await act(async()=>button(label).click());}
async function change(label:string,value:string){const element=[...document.querySelectorAll<HTMLLabelElement>('label[for]')].find(node=>node.textContent?.replace('*','').trim()===label)!;expect(element,label).toBeTruthy();const input=document.getElementById(element.htmlFor) as HTMLInputElement;await act(async()=>{Object.getOwnPropertyDescriptor(input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});}
async function fillBasics(){await change('Artist name','Festival performer');await change('Title / role','Vocalist');await change('Specialty / genre','Fusion');await change('Artist bio','An introduction to the live performance.');}
async function portrait(){await click('02Photos & media');await click('Upload guest-artist-images artists');}
const artist=(id:number,name:string,enabled=true)=>({id,name,title:'Live performer',specialty:'Fusion',description:'Artist biography',image:'published.jpg',order_position:id,enabled,is_featured:false,achievements:[],social_links:null});
it('opens a proper dialog with a live preview and a save footer outside the scroll region',async()=>{
 await mount();expect(host.querySelector('.artist-empty')).not.toBeNull();
 const opener=button('Add artist');opener.focus();await click('Add artist');
 const dialog=document.querySelector('dialog')!;expect(dialog.open).toBe(true);expect(dialog.getAttribute('aria-labelledby')).toBe('artist-dialog-title');expect(dialog.querySelector('.artist-editor-scroll .artist-form-footer')).toBeNull();expect(dialog.querySelector('.artist-form-footer')).not.toBeNull();
 await fillBasics();expect(dialog.querySelector('.artist-preview-copy h3')?.textContent).toBe('Festival performer');
 await click('Cancel');expect(document.querySelector('dialog')).toBeNull();expect(document.activeElement).toBe(opener);
});
it('keeps all sections editable and saves only database fields with the uploaded portrait and schedule',async()=>{
 await mount();await click('Add artist');await fillBasics();await portrait();
 await click('03Performance');await change('Performance date','2026-12-12');await change('Performance time','18:30');await change('Venue','Main stage');
 await click('04Social links');await change('Instagram profile URL','https://instagram.com/festival_artist');await click('Create artist');
 expect(mocks.add).toHaveBeenCalledTimes(1);const payload=mocks.add.mock.calls[0][0];expect(payload).toMatchObject({name:'Festival performer',is_featured:true,image:'https://media.example/guest-artist-images.jpg',venue:'Main stage',card_media_is_video:false,social_links:{instagram:'https://instagram.com/festival_artist'}});expect(payload.performance_at).toBeTruthy();for(const key of ['performance_date','performance_time','card_media_mode'])expect(payload).not.toHaveProperty(key);expect(document.querySelector('dialog')).toBeNull();
});
it('shows inline validation, switches to the missing section and does not steal focus during typing',async()=>{
 await mount();await click('Add artist');await click('Create artist');expect(mocks.add).not.toHaveBeenCalled();expect(document.activeElement?.getAttribute('aria-invalid')).toBe('true');
 await change('Artist name','First character');expect((document.activeElement as HTMLInputElement).value).toBe('First character');
 await fillBasics();await click('Create artist');expect(document.querySelector('.artist-form-tabs [aria-current="step"]')?.textContent).toContain('Photos & media');expect(document.querySelector('dialog')?.textContent).toContain('Add an artist portrait');
});
it('keeps draft values and published media after a failed edit, and permits retry',async()=>{
 mocks.artists=[artist(7,'Published performer')];await mount();await click('Edit profile');await change('Artist name','Updated performer');mocks.update.mockRejectedValueOnce(new Error('offline'));
 await click('Save changes');expect(document.querySelector('dialog')?.textContent).toContain('offline');expect(document.querySelector('.artist-preview-copy h3')?.textContent).toBe('Updated performer');
 await click('Save changes');expect(mocks.update).toHaveBeenLastCalledWith(7,expect.objectContaining({name:'Updated performer',image:'published.jpg'}));expect(document.querySelector('dialog')).toBeNull();
});
it('locks save, section switching and modal dismissal while media or AI is processing',async()=>{
 await mount();await click('Add artist');await portrait();await act(async()=>mocks.uploads['guest-artist-images:artists'](true));expect(button('Create artist').disabled).toBe(true);expect(button('Close artist editor').disabled).toBe(true);
 const dialog=document.querySelector('dialog')!;await act(async()=>dialog.dispatchEvent(new Event('cancel',{cancelable:true})));expect(document.querySelector('dialog')).not.toBeNull();
 await act(async()=>mocks.uploads['guest-artist-images:artists'](false));await click('01Artist details');await click('Generate test bio');expect(button('Create artist').disabled).toBe(true);await act(async()=>mocks.ai());expect(button('Create artist').disabled).toBe(false);expect(document.querySelector('.artist-preview-copy h3')?.textContent).toBe('Generated artist');
});
it('validates links and an incomplete performance time across tabs',async()=>{
 await mount();await click('Add artist');await fillBasics();await portrait();await click('04Social links');await change('Instagram profile URL','javascript:bad');await click('Create artist');expect(document.querySelector('dialog')?.textContent).toContain('https://');expect(mocks.add).not.toHaveBeenCalled();
 await change('Instagram profile URL','https://instagram.com/artist');await click('03Performance');await change('Performance date','2026-12-12');await click('Create artist');expect(document.querySelector('dialog')?.textContent).toContain('both a date and time');
});
it('filters the real lineup and keeps visibility actions available without opening the form',async()=>{
 mocks.artists=[artist(1,'Visible performer'),artist(2,'Hidden performer',false)];await mount();await click('Hidden');expect(host.querySelectorAll('.artist-roster-card')).toHaveLength(1);expect(host.querySelector('.artist-roster-card h3')?.textContent).toBe('Hidden performer');await click('Show Hidden performer');expect(mocks.enabled).toHaveBeenCalledWith(2);expect(button('Feature Hidden performer')).toBeUndefined();expect(mocks.featured).not.toHaveBeenCalled();
});
it('retains the form on a rejected approval submission and never writes directly',async()=>{
 mocks.check.mockResolvedValue(true);mocks.artists=[artist(9,'Review performer')];mocks.approval.mockResolvedValueOnce({success:false,error:'Review service unavailable'});await mount();await click('Edit profile');await click('Save changes');expect(document.querySelector('dialog')?.textContent).toContain('Review service unavailable');expect(mocks.update).not.toHaveBeenCalled();expect(document.querySelector('dialog')).not.toBeNull();
});

it('features artists automatically without a featured switch or a second publish action',async()=>{
 await mount();await click('Add artist');expect(document.querySelector('dialog')?.textContent).toContain('automatically');expect([...document.querySelectorAll('[role="switch"]')]).toHaveLength(1);
 await fillBasics();await portrait();await click('Create artist');expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({is_featured:true,enabled:true}));
});
it('recovers nullable media, achievements and social objects when editing older records',async()=>{
 mocks.artists=[{...artist(12,'Older performer'),achievements:null,social_links:null,video_url:null,youtube_url:null,watch_live_url:null,card_media_url:null,card_media_is_video:null,detail_music_url:null,is_featured:false}];await mount();await click('Edit profile');await click('Save changes');expect(mocks.update).toHaveBeenCalledWith(12,expect.objectContaining({is_featured:true,achievements:[],social_links:{instagram:'',youtube:'',spotify:''},video_url:'',card_media_url:'',detail_music_url:''}));
});
