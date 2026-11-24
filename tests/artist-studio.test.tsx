// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {GuestArtistManagement} from '../src/components/admin/GuestArtistManagement';
const mocks=vi.hoisted(()=>({settings:{} as any,saveSettings:vi.fn(),artists:[] as any[],add:vi.fn(),update:vi.fn(),remove:vi.fn(),enabled:vi.fn(),featured:vi.fn(),approval:vi.fn(),check:vi.fn(),uploads:{} as Record<string,(busy:boolean)=>void>,ai:null as any}));
vi.mock('../src/context/DataContext',()=>({useData:()=>({homepageSettings:mocks.settings,updateHomepageSettings:mocks.saveSettings,guestArtists:mocks.artists,addGuestArtist:mocks.add,updateGuestArtist:mocks.update,deleteGuestArtist:mocks.remove,toggleGuestArtistEnabled:mocks.enabled,toggleGuestArtistFeatured:mocks.featured})}));
vi.mock('../src/context/SavingProgressContext',()=>({useSavingProgress:()=>({withSteps:()=>({next:vi.fn()}),done:vi.fn()})}));
vi.mock('../src/hooks/useApprovals',()=>({useApprovals:()=>({checkRequiresApproval:mocks.check,submitForApproval:mocks.approval})}));
vi.mock('../src/components/ImageUpload',()=>({ImageUpload:({onImageSelect,onProcessingChange,currentImage,bucket,folder,preserveExistingMedia,cropAspect,maxImageBytes}:any)=>{mocks.uploads[`${bucket}:${folder}`]=onProcessingChange;return <div data-preserve={String(preserveExistingMedia)} data-aspect={cropAspect} data-upload-bucket={bucket} data-upload-limit={maxImageBytes}><button type="button" aria-label={`Upload ${bucket} ${folder}`} onClick={()=>onImageSelect(`https://media.example/${bucket}.jpg`)}>Upload</button>{currentImage&&<img src={currentImage} alt="Uploaded preview"/>}</div>;}}));
vi.mock('../src/components/admin/GenericAIGenerator',()=>({GenericAIGenerator:({onGenerated,onGeneratingChange}:any)=><button type="button" onClick={()=>{onGeneratingChange(true);mocks.ai=()=>{onGenerated({name:'Generated artist',title:'Vocalist',specialty:'Fusion',description:'Reviewed bio',achievements:['Live set']});onGeneratingChange(false);};}}>Generate test bio</button>}));
let host:HTMLDivElement,root:Root;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue(undefined);mocks.artists=[];mocks.settings={brand_year:2026};mocks.saveSettings.mockReset().mockResolvedValue(undefined);mocks.uploads={};for(const mock of [mocks.add,mocks.update,mocks.remove,mocks.enabled,mocks.featured])mock.mockReset().mockResolvedValue(undefined);mocks.check.mockReset().mockResolvedValue(false);mocks.approval.mockReset().mockResolvedValue({success:true});HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};host=document.createElement('div');document.body.append(host);root=createRoot(host);});
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
 await fillBasics();expect(dialog.querySelector('.artist-record-name h3')?.textContent).toBe('Festival performer');
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
 await click('Save changes');expect(document.querySelector('dialog')?.textContent).toContain('offline');expect(document.querySelector('.artist-record-name h3')?.textContent).toBe('Updated performer');
 await click('Save changes');expect(mocks.update).toHaveBeenLastCalledWith(7,expect.objectContaining({name:'Updated performer',image:'published.jpg'}));expect(document.querySelector('dialog')).toBeNull();
});
it('locks save, section switching and modal dismissal while media or AI is processing',async()=>{
 await mount();await click('Add artist');await portrait();await act(async()=>mocks.uploads['guest-artist-images:artists'](true));expect(button('Create artist').disabled).toBe(true);expect(button('Close artist editor').disabled).toBe(true);
 const dialog=document.querySelector('dialog')!;await act(async()=>dialog.dispatchEvent(new Event('cancel',{cancelable:true})));expect(document.querySelector('dialog')).not.toBeNull();
 await act(async()=>mocks.uploads['guest-artist-images:artists'](false));await click('01Artist details');await click('Generate test bio');expect(button('Create artist').disabled).toBe(true);await act(async()=>mocks.ai());expect(button('Create artist').disabled).toBe(false);expect(document.querySelector('.artist-record-name h3')?.textContent).toBe('Generated artist');
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

it('saves the selected festival edition, slideshow uploads and song title together',async()=>{
 await mount();await click('Add artist');await fillBasics();await change('Festival year','2024');await portrait();
 await click('Upload guest-artist-images artists/gallery-1');await click('Upload guest-artist-images artists/gallery-2');await change('Song title','Evening in Durgapur');await change('Direct audio URL','https://media.example/song.mp3');await change('YouTube performance URL','https://youtu.be/aqz-KE-bpKQ');await click('Create artist');
 expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({festival_year:2024,gallery_images:['https://media.example/guest-artist-images.jpg'],track_title:'Evening in Durgapur',detail_music_url:'https://media.example/song.mp3',youtube_url:'https://youtu.be/aqz-KE-bpKQ'}));
});

it('locks publication while a stage gallery photo uploads',async()=>{
 await mount();await click('Add artist');await portrait();await act(async()=>mocks.uploads['guest-artist-images:artists/gallery-2'](true));expect(button('Create artist').disabled).toBe(true);expect(button('Close artist editor').disabled).toBe(true);await act(async()=>mocks.uploads['guest-artist-images:artists/gallery-2'](false));expect(button('Create artist').disabled).toBe(false);
});

it('filters past editions without hiding the visibility and editing controls',async()=>{
 mocks.artists=[{...artist(1,'Current performer'),festival_year:2026},{...artist(2,'Past performer'),festival_year:2024}];await mount();
 const select=document.querySelector<HTMLSelectElement>('[aria-label="Filter by festival year"]')!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value')!.set!.call(select,'2024');select.dispatchEvent(new Event('change',{bubbles:true}));});
 expect(host.querySelectorAll('.artist-roster-card')).toHaveLength(1);expect(host.querySelector('.artist-roster-card h3')?.textContent).toBe('Past performer');await click('Edit profile');expect(document.querySelector('.artist-preview-heading')?.textContent).toContain('2024');
});

it('keeps channel links separate from performance videos and validates song title length',async()=>{
 await mount();await click('Add artist');await fillBasics();await portrait();await change('YouTube performance URL','https://youtube.com/@artist');await click('Create artist');expect(document.querySelector('dialog')?.textContent).toContain('Use a YouTube video link');expect(mocks.add).not.toHaveBeenCalled();
 await change('YouTube performance URL','');await change('Song title','a'.repeat(241));await click('Create artist');expect(document.querySelector('dialog')?.textContent).toContain('within 240 characters');expect(mocks.add).not.toHaveBeenCalled();
});

async function select(label:string,value:string){const labelNode=[...document.querySelectorAll<HTMLLabelElement>('label[for]')].find(node=>node.textContent?.trim()===label)!;expect(labelNode,label).toBeTruthy();const element=document.getElementById(labelNode.htmlFor) as HTMLSelectElement;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value')!.set!.call(element,value);element.dispatchEvent(new Event('change',{bubbles:true}));});}

it('saves band framing, three short clips, Spotify collection and curated songs together',async()=>{
 await mount();await click('Add artist');await fillBasics();await select('Performer type','band');await portrait();
 expect(document.querySelector('[data-aspect="1.6"]')).not.toBeNull();await click('Short video clips');await select('Each clip plays for','60');await change('Clip 1 video URL','https://media.example/one.mp4');await change('Clip 2 video URL','https://media.example/two.mp4');await change('Clip 3 video URL','https://media.example/three.mp4');
 await click('04Social links');await change('Spotify player / playlist URL','https://open.spotify.com/playlist/37i9dQZF1DZ06evO3eIivx?si=example');await click('Add song');await change('Song 1 title','Evening song');await change('Song 1 link','https://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ');await click('Create artist');
 expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({artist_kind:'band',stage_media_mode:'clips',stage_clip_urls:['https://media.example/one.mp4','https://media.example/two.mp4','https://media.example/three.mp4'],stage_clip_seconds:60,spotify_collection_url:'https://open.spotify.com/playlist/37i9dQZF1DZ06evO3eIivx',featured_songs:[{title:'Evening song',url:'https://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ'}]}));
});

it('requires an uploaded clip in clip mode and locks publishing while it uploads',async()=>{
 await mount();await click('Add artist');await fillBasics();await portrait();await click('Short video clips');await click('Create artist');expect(mocks.add).not.toHaveBeenCalled();expect(document.querySelector('dialog')?.textContent).toContain('Add at least one short clip');await change('Clip 1 video URL','https://youtu.be/aqz-KE-bpKQ');await click('Create artist');expect(document.querySelector('dialog')?.textContent).toContain('direct MP4/WebM link');
 await act(async()=>mocks.uploads['guest-artist-videos:artists/stage-clips-1'](true));expect(button('Create artist').disabled).toBe(true);expect(button('Close artist editor').disabled).toBe(true);await act(async()=>mocks.uploads['guest-artist-videos:artists/stage-clips-1'](false));await change('Clip 1 video URL','https://media.example/one.mp4');await click('Create artist');expect(mocks.add).toHaveBeenCalledTimes(1);
});

it('validates Spotify and curated song links without discarding the draft',async()=>{
 await mount();await click('Add artist');await fillBasics();await portrait();await click('04Social links');await change('Spotify player / playlist URL','https://example.com/not-spotify');await click('Create artist');expect(mocks.add).not.toHaveBeenCalled();expect(document.querySelector('dialog')?.textContent).toContain('open.spotify.com');await change('Spotify player / playlist URL','');await click('Add song');await change('Song 1 title','Saved song title');await change('Song 1 link','javascript:bad');await click('Create artist');expect(document.querySelector('dialog')?.textContent).toContain('Spotify song link or YouTube video');await change('Song 1 link','https://youtu.be/aqz-KE-bpKQ');await click('Create artist');expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({featured_songs:[{title:'Saved song title',url:'https://www.youtube.com/watch?v=aqz-KE-bpKQ'}]}));
});

it('allows returning to the photo slideshow when a dormant clip draft is invalid',async()=>{
 await mount();await click('Add artist');await fillBasics();await portrait();await click('Short video clips');await change('Clip 1 video URL','https://youtu.be/aqz-KE-bpKQ');await click('Photo slideshow');await click('Create artist');expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({stage_media_mode:'photos'}));
});

it('saves public year selection, date/place labels and light preferences independently of artist profiles',async()=>{
 mocks.artists=[{...artist(1,'Current'),festival_year:2026},{...artist(2,'Past'),festival_year:2025}];await mount();await change('Festival date label','DEC 2026');await change('Festival place','The Arena');const year=[...document.querySelectorAll<HTMLLabelElement>('.artist-stage-year-choices label')].find(node=>node.textContent==='2025')!;await act(async()=>year.click());await click('Save stage settings');expect(mocks.saveSettings).toHaveBeenCalledWith(expect.objectContaining({artist_stage_settings:expect.objectContaining({visible_years:[2026],date_label:'DEC 2026',venue_label:'The Arena'})}));expect(mocks.update).not.toHaveBeenCalled();
});
it('sends stage settings through the existing approval flow when required',async()=>{
 mocks.check.mockResolvedValue(true);await mount();await click('Save stage settings');expect(mocks.approval).toHaveBeenCalledWith('homepage_setting','update',expect.objectContaining({artist_stage_settings:expect.any(Object)}),1);expect(mocks.saveSettings).not.toHaveBeenCalled();
});
it('preserves stage setting drafts after a failed save and permits retry',async()=>{
 await mount();await change('Festival place','The new arena');mocks.saveSettings.mockRejectedValueOnce(new Error('Settings offline'));await click('Save stage settings');expect(document.body.textContent).toContain('Settings offline');await click('Save stage settings');expect(mocks.saveSettings).toHaveBeenLastCalledWith(expect.objectContaining({artist_stage_settings:expect.objectContaining({venue_label:'The new arena'})}));
});
it('saves independent desktop photos/videos and a performer light colour',async()=>{
 await mount();await click('Add artist');await fillBasics();await portrait();expect(button('Upload guest-artist-images artists/gallery-1').parentElement?.getAttribute('data-aspect')).toBe('1.2');await click('Short video clips');expect(button('Upload guest-artist-images artists/gallery-1').parentElement?.getAttribute('data-aspect')).toBe('0.5625');await change('Desktop clip 1 video URL','https://media.example/desktop.mp4');await click('Upload guest-artist-images artists/desktop-gallery-1');await change('Light colour','#54cbb0');await click('Create artist');expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({desktop_gallery_images:['https://media.example/guest-artist-images.jpg'],desktop_stage_clip_urls:['https://media.example/desktop.mp4'],stage_light_color:'#54cbb0'}));
});
it('locks publishing until a desktop media upload finishes',async()=>{
 await mount();await click('Add artist');await portrait();await act(async()=>mocks.uploads['guest-artist-images:artists/desktop-gallery-1'](true));expect(button('Create artist').disabled).toBe(true);await act(async()=>mocks.uploads['guest-artist-images:artists/desktop-gallery-1'](false));expect(button('Create artist').disabled).toBe(false);
});

it('updates the real card and About preview from every form section before saving',async()=>{
 await mount();await click('Add artist');await fillBasics();await select('Performer type','band');await change('Artist bio','A short card introduction.\n\nA fuller story for the About profile.');await click('Add highlight');await change('Highlight 1','An acoustic live set');await change('Festival year','2025');
 expect(document.querySelector('.artist-record-name h3')?.textContent).toBe('Festival performer');expect(document.querySelector('.artist-record-bio')?.textContent).toBe('A short card introduction.');
 await portrait();await click('Upload guest-artist-images artists/gallery-1');await click('Upload guest-artist-images artists/desktop-gallery-1');await change('Direct audio URL','https://media.example/repeat.mp3');await change('Song title','Evening song');await change('YouTube performance URL','https://youtu.be/aqz-KE-bpKQ');
 expect(document.querySelector('.artist-draft-stage audio')?.getAttribute('src')).toBe('https://media.example/repeat.mp3');expect(document.querySelector<HTMLAudioElement>('.artist-draft-stage audio')?.loop).toBe(true);expect(document.querySelector('.artist-record-watch')?.getAttribute('href')).toContain('aqz-KE-bpKQ');
 await click('03Performance');await change('Performance date','2025-11-12');await change('Performance time','18:30');await change('Venue','Open air stage');
 await click('04Social links');await change('Instagram profile URL','https://instagram.com/live_band');await change('YouTube channel URL','https://youtube.com/@live_band');await change('Spotify player / playlist URL','https://open.spotify.com/playlist/37i9dQZF1DZ06evO3eIivx');await click('Add song');await change('Song 1 title','A song for the crowd');await change('Song 1 link','https://youtu.be/aqz-KE-bpKQ');
 expect(document.querySelector('.artist-record-socials a')?.getAttribute('href')).toBe('https://instagram.com/live_band');await click('About preview');const preview=document.querySelector('.artist-profile-inline')!;expect(preview.querySelector('.artist-profile-bio')?.textContent).toContain('A fuller story for the About profile.');expect(preview.textContent).toContain('An acoustic live set');expect(preview.textContent).toContain('Open air stage');expect(preview.textContent).toContain('A song for the crowd');expect(preview.textContent).not.toContain('Play Evening song');expect(document.querySelectorAll('dialog')).toHaveLength(1);
 await click('Create artist');expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({festival_year:2025,artist_kind:'band',detail_music_url:'https://media.example/repeat.mp3',track_title:'Evening song',achievements:['An acoustic live set'],venue:'Open air stage',featured_songs:[{title:'A song for the crowd',url:'https://www.youtube.com/watch?v=aqz-KE-bpKQ'}]}));
});

it('previews independent phone and desktop media and keeps inputs when switching the mobile editor view',async()=>{
 mocks.artists=[{...artist(34,'Responsive artist'),gallery_images:['https://media.example/phone.webp'],desktop_gallery_images:['https://media.example/desktop.webp']}];await mount();await click('Edit profile');expect(document.querySelector('.artist-stage-presentation img')?.getAttribute('src')).toBe('https://media.example/phone.webp');await click('Desktop media');expect(document.querySelector('.artist-stage-presentation img')?.getAttribute('src')).toBe('https://media.example/desktop.webp');await click('Live preview');expect(document.querySelector('.artist-editor-body')?.getAttribute('data-mobile-view')).toBe('preview');await click('Edit inputs');await change('Artist name','Edited in place');await click('Live preview');expect(document.querySelector('.artist-record-name h3')?.textContent).toBe('Edited in place');await click('Phone media');expect(document.querySelector('.artist-stage-presentation img')?.getAttribute('src')).toBe('https://media.example/phone.webp');expect(mocks.update).not.toHaveBeenCalled();
});

it('previews a fallback poster when dedicated stage photos are empty',async()=>{
 mocks.artists=[{...artist(35,'Poster artist'),image:'https://media.example/profile.webp',card_media_url:'https://media.example/poster.webp',card_media_is_video:false,gallery_images:[]}];await mount();await click('Edit profile');expect(document.querySelector('.artist-stage-presentation img')?.getAttribute('src')).toBe('https://media.example/poster.webp');await act(async()=>document.querySelectorAll<HTMLButtonElement>('.artist-form-tabs button')[1].click());await click('Upload guest-artist-images artists/gallery-1');expect(document.querySelector('.artist-stage-presentation img')?.getAttribute('src')).toBe('https://media.example/guest-artist-images.jpg');
});

it('matches every artist upload widget to the project and bucket file-size limits',async()=>{
 await mount();await click('Add artist');await portrait();const verify=()=>{const uploads=[...document.querySelectorAll<HTMLElement>('[data-upload-bucket]')];expect(uploads.length).toBeGreaterThan(8);for(const upload of uploads)expect(Number(upload.dataset.uploadLimit)).toBe(upload.dataset.uploadBucket==='guest-artist-audio'?25*1024*1024:50*1024*1024);};verify();await click('Short video clips');verify();
});
