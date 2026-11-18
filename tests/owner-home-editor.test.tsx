// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { HomepageManagement } from '../src/components/admin/HomepageManagement';
import { RoadmapMilestonesAdmin } from '../src/components/admin/RoadmapMilestonesAdmin';
const mocks = vi.hoisted(() => ({ media:null as any, team:[] as any[], updateSocial: vi.fn(), updateRoadmap: vi.fn(), addRoadmap: vi.fn(), social:{id:1,instagram_enabled:false,instagram_url:'',youtube_enabled:false,youtube_url:'',created_at:'',updated_at:''}, road:[{id:51,year:2023,title:'Previous edition',points:['Festival milestone'],order_position:1,enabled:true,side:'auto',created_at:'',updated_at:''}], update: vi.fn(), saveMedia: vi.fn(), updateAbout: vi.fn(), updateFaculty: vi.fn(), addFaculty: vi.fn(), updateTeam: vi.fn(), addTeam: vi.fn(), owner: true, faculty: [{id:41,name:'Festival Chair',image:'chair.jpg',title:'Chairperson',description:'Faculty lead',enabled:true,order_position:1}], about: {id:1,enabled:true,hero_title:'About',hero_heading:'Festival story',hero_paragraphs:['Original paragraph'],tracks:[],zones:[],stats:[],updated_at:null}, settings: { hero_title: 'Published title', hero_media_url: 'legacy.jpg', sponsor_logos: [{ id: 'existing-logo', name:'Previous partner',logo_url:'previous.png',enabled:true,order:1 }] } }));
vi.mock('../src/context/DataContext', () => ({ useData: () => ({ homepageSettings: mocks.settings, coreTeamMembers:mocks.team, coreCommittees:[{id:1,name:'Tech Team'}], socialMediaSettings:mocks.social,updateSocialMediaSettings:mocks.updateSocial,roadmapMilestones:mocks.road,addRoadmapMilestone:mocks.addRoadmap,updateRoadmapMilestone:mocks.updateRoadmap, updateHomepageSettings: mocks.update, isOwner: () => mocks.owner, myPermissions:{page_access_configured:true,allowed_pages:['homepage']}, aboutSettings:mocks.about,updateAboutSettings:mocks.updateAbout,facultyHeads:mocks.faculty,updateFacultyHead:mocks.updateFaculty,addFacultyHead:mocks.addFaculty,updateCoreTeamMember:mocks.updateTeam,addCoreTeamMember:mocks.addTeam }) }));
vi.mock('../src/context/SavingProgressContext', () => ({ useSavingProgress: () => ({ withSteps: () => ({ next() {} }), done() {} }) }));
vi.mock('../src/services/heroMediaService', async importOriginal => ({ ...await importOriginal<typeof import('../src/services/heroMediaService')>(), heroMediaService: { getHeroMedia: async () => mocks.media ?? ({ background_type: 'image', image_url: 'configured.jpg', mobile_image_url:'', video_url:'',mobile_video_url:'',poster_url:'',mobile_poster_url:'',overlay_color:'#000000',overlay_opacity:.35,desktop_zoom:1,mobile_zoom:1,desktop_offset_x:0,desktop_offset_y:0,mobile_offset_x:0,mobile_offset_y:0,enabled: true }),saveHeroMedia:mocks.saveMedia } }));
vi.mock('../src/hooks/useTopStars', () => ({ useTopStars: () => ({stars:[],loading:false,refetch:vi.fn()}) }));
vi.mock('../src/components/ImageUpload', () => ({ ImageUpload: ({folder,currentImage,previewFallback,onImageSelect}:any) => <><video data-upload-preview={folder} src={currentImage || previewFallback} /><button type="button" aria-label={`Upload ${folder}`} onClick={() => onImageSelect('https://files.example/new.jpg')}>{currentImage || 'Upload image'}</button></> }));
let container: HTMLDivElement, root: Root;
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; localStorage.clear(); mocks.media=null; mocks.team=[]; mocks.owner=true; for (const mock of [mocks.updateSocial,mocks.updateRoadmap,mocks.addRoadmap,mocks.update,mocks.saveMedia,mocks.updateAbout,mocks.updateFaculty,mocks.addFaculty,mocks.updateTeam,mocks.addTeam]) mock.mockReset().mockResolvedValue(undefined); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
function Location() { const location = useLocation(); return <output data-location>{location.search}</output>; }
const mount = async (path = '/admin/homepage?edit=content') => { await act(async () => root.render(<MemoryRouter initialEntries={[path]}><HomepageManagement /><Location /></MemoryRouter>)); };
const button = (text: string) => [...container.querySelectorAll<HTMLButtonElement>('button')].find(node => node.getAttribute('aria-label') === text || node.textContent?.trim() === text)!;
const click = async (text: string) => { expect(button(text), text).toBeTruthy(); await act(async () => button(text).click()); };
async function change(label: string, value: string) {
  const target = [...container.querySelectorAll('label')].find(node => node.textContent === label)!;
  expect(target, label).toBeTruthy(); const input = document.getElementById(target.htmlFor) as HTMLInputElement;
  await act(async () => { Object.getOwnPropertyDescriptor(input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
it('updates the preview while typing, reviews changes and saves one scoped payload', async () => {
  await mount(); expect(button('Save changes').disabled).toBe(true);
  await change('Festival title', 'The festival returns');
  expect(container.querySelector('[data-preview="title"]')?.textContent).toBe('The festival returns');
  expect(container.querySelector('.studio-save-summary')?.textContent).toContain('1 unsaved change');
  await click('Review changes'); expect(container.querySelector('.studio-changes del')?.textContent).toBe('Published title');
  await click('Save changes'); expect(mocks.update).toHaveBeenCalledTimes(1);
  const payload = mocks.update.mock.calls[0][0]; expect(payload.hero_title).toBe('The festival returns'); expect(payload).toHaveProperty('brand_logo_url'); expect(payload).not.toHaveProperty('hero_media_url'); expect(payload).not.toHaveProperty('sponsor_logos');
  expect(button('Save changes').disabled).toBe(true); expect(localStorage.getItem('admin_homepage_form_draft')).toBeNull();
});
it('keeps entered content across sections, supports device switching and preview section selection', async () => {
  await mount(); await change('Tagline', 'See you on stage'); await click('Brand identity');
  expect(container.querySelector('[data-location]')?.textContent).toBe('?edit=branding');
  await click('Mobile preview'); expect(container.querySelector('.studio-browser')?.getAttribute('data-device')).toBe('mobile');
  await click('Edit homepage hero text');
  expect((container.querySelector('input[id]') as HTMLInputElement).value).toBe('Published title');
  expect(container.querySelector('.studio-preview-tagline')?.textContent).toBe('See you on stage');
  await click('Desktop preview'); expect(container.querySelector('.studio-browser')?.getAttribute('data-device')).toBe('desktop');
});
it('keeps a failed save draft and discards it only on an explicit action', async () => {
  await mount(); await change('Festival title', 'My new title'); mocks.update.mockRejectedValueOnce(new Error('offline')); await click('Save changes');
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('offline');
  expect(JSON.parse(localStorage.getItem('admin_homepage_form_draft')!).hero_title).toBe('My new title');
  await click('Discard changes'); expect(container.querySelector('[data-preview="title"]')?.textContent).toBe('Published title'); expect(button('Save changes').disabled).toBe(true);
});
it('restores an unfinished draft when the editor remounts', async () => {
  await mount(); await change('Festival title', 'Work in progress'); await act(async () => root.unmount()); root = createRoot(container); await mount();
  expect(container.querySelector('[data-preview="title"]')?.textContent).toBe('Work in progress'); expect(button('Save changes').disabled).toBe(false);
});
it('opens partner appearance links while leaving publication controls exclusively in Sponsors', async () => {
  await mount('/admin/homepage?edit=partners');expect(container.querySelector('a[href="/admin/sponsors"]')).not.toBeNull();expect(container.querySelector('[data-preview-section="partners"]')).not.toBeNull();
  expect(container.querySelector('[role="switch"]')).toBeNull();
});
it('supports the save shortcut and prevents duplicate saves while the request is pending', async () => {
  await mount(); await change('Festival title', 'Ready to publish'); let finish!: () => void;
  mocks.update.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true })); });
  expect(container.querySelector('fieldset')?.disabled).toBe(true);
  await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true })); }); expect(mocks.update).toHaveBeenCalledTimes(1);
  await act(async () => finish()); expect(container.querySelector('fieldset')?.disabled).toBe(false);
});

it('asks for separate laptop and mobile clips and publishes them to the hero service', async () => {
  await mount('/admin/homepage?edit=media');
  await click('Background video'); await change('Laptop / desktop video URL','https://media.example/desktop.mp4');
  await click('Save changes'); expect(mocks.saveMedia).not.toHaveBeenCalled(); expect(container.querySelector('[role="alert"]')?.textContent).toContain('separate mobile');
  await change('Mobile video URL','https://media.example/mobile.mp4'); await click('Save changes');
  expect(mocks.saveMedia).toHaveBeenCalledWith('home',expect.objectContaining({video_url:'https://media.example/desktop.mp4',mobile_video_url:'https://media.example/mobile.mp4',background_type:'video'}));
  expect(mocks.update).not.toHaveBeenCalled();
});
it('edits About and existing lead photos/details within the same workspace', async () => {
  await mount('/admin/homepage?edit=about'); await change('About heading','A new chapter');
  await click('People & leadership'); await change('Lead name','Updated festival chair');
  await click('Save changes');
  expect(mocks.updateAbout).toHaveBeenCalledWith(expect.objectContaining({hero_heading:'A new chapter'}));
  expect(mocks.updateFaculty).toHaveBeenCalledWith(41,expect.objectContaining({name:'Updated festival chair',image:'chair.jpg'}));
  expect(button('Save changes').disabled).toBe(true);
});
it('keeps failed background drafts while saved page changes do not get published accidentally', async () => {
  await mount('/admin/homepage?edit=media'); await click('Background video'); await change('Laptop / desktop video URL','https://media.example/d.mp4'); await change('Mobile video URL','https://media.example/m.mp4'); mocks.saveMedia.mockRejectedValueOnce(new Error('offline')); await click('Save changes');
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Remaining drafts'); expect(localStorage.getItem('homepage_hero_resource_draft')).not.toBeNull(); expect(mocks.update).not.toHaveBeenCalled();
});
it('does not expose media, About or lead mutation controls to a homepage-only admin', async () => {
  mocks.owner=false; await mount('/admin/homepage?edit=media');
  expect(button('Background video & images')).toBeUndefined(); expect(button('About the festival')).toBeUndefined();
  await click('People & leadership'); expect(container.querySelector('.studio-lead-editor')).toBeNull();
});
it('keeps About drafts after a partial save and does not repeat an already saved homepage write', async () => {
  await mount('/admin/homepage?edit=content'); await change('Festival title','Saved page title'); await click('About the festival'); await change('About heading','Unfinished About update'); mocks.updateAbout.mockRejectedValueOnce(new Error('About offline'));
  await click('Save changes'); expect(mocks.update).toHaveBeenCalledTimes(1); expect(container.querySelector('[role="alert"]')?.textContent).toContain('Saved: Homepage'); expect(localStorage.getItem('homepage_about_resource_draft')).not.toBeNull();
  await click('Save changes'); expect(mocks.update).toHaveBeenCalledTimes(1); expect(mocks.updateAbout).toHaveBeenCalledTimes(2); expect(button('Save changes').disabled).toBe(true);
});
it('keeps logo and edition editing exclusively in Sponsors while Home edits appearance only', async () => {
  await mount('/admin/homepage?edit=partners');
  expect(container.textContent).toContain('Partners are managed in Sponsors');
  expect(container.querySelector('a[href="/admin/sponsors"]')).not.toBeNull();
  expect(button('Add current partner')).toBeUndefined();expect(button('Previous partners')).toBeUndefined();
  await change('Partner section title','Our supporters');await click('Save changes');
  expect(mocks.update.mock.calls[0][0]).not.toHaveProperty('sponsor_logos');expect(mocks.update.mock.calls[0][0]).not.toHaveProperty('featured_partners_enabled');
});
it('creates a faculty lead with a photo without leaving the homepage workspace', async () => {
  await mount('/admin/homepage?edit=people'); await click('Faculty'); await change('Lead name','New faculty lead'); await change('Faculty title','Festival convenor');
  const upload = container.querySelector<HTMLButtonElement>('[aria-label="Upload homepage-leads"]')!; await act(async () => upload.click()); await click('Save changes');
  expect(mocks.addFaculty).toHaveBeenCalledWith(expect.objectContaining({name:'New faculty lead',title:'Festival convenor',image:'https://files.example/new.jpg',enabled:true}));
});

it('edits and previews social links within the homepage save flow', async () => {
  await mount('/admin/homepage?edit=social'); await change('Instagram profile URL','https://www.instagram.com/festival');
  const toggle=[...container.querySelectorAll<HTMLButtonElement>('[role="switch"]')].find(node=>document.getElementById(node.getAttribute('aria-labelledby')!)?.textContent==='Show Instagram link')!;
  await act(async()=>toggle.click()); expect(container.querySelector('[data-preview-section="social"]')?.textContent).toContain('Instagram');
  await click('Save changes'); expect(mocks.updateSocial).toHaveBeenCalledWith(expect.objectContaining({instagram_enabled:true,instagram_url:'https://www.instagram.com/festival'})); expect(mocks.update).not.toHaveBeenCalled();
});
it('rejects a syntactically valid URL for the wrong social platform and keeps the draft', async () => {
  await mount('/admin/homepage?edit=social'); await change('Instagram profile URL','https://example.com/festival'); await click('Save changes');
  expect(mocks.updateSocial).not.toHaveBeenCalled();expect(container.querySelector('[role="alert"]')?.textContent).toContain('valid Instagram'); expect(localStorage.getItem('homepage_social_resource_draft')).not.toBeNull();
});
it('edits roadmap milestones in the studio without requiring a missing visibility column', async () => {
  await mount('/admin/homepage?edit=roadmap'); expect(container.textContent).toContain('Roadmap is shown by default');
  await change('Milestone title','A festival milestone updated'); await change('Milestone points','First detail\nSecond detail');
  expect(container.querySelector('[data-preview-section="roadmap"]')?.textContent).toContain('A festival milestone updated');
  await click('Save changes'); expect(mocks.updateRoadmap).toHaveBeenCalledWith(51,expect.objectContaining({title:'A festival milestone updated',points:['First detail','Second detail'],enabled:true})); expect(mocks.update).not.toHaveBeenCalled();
});
it('keeps failed photo drafts and saves additions, order, replacement and deletion together',async()=>{
  await mount('/admin/homepage?edit=roadmap');
  await change('Or add a photo URL','https://photos.example/one.jpg');await click('Add photo');
  await change('Or add a photo URL','https://photos.example/two.jpg');await click('Add photo');
  await click('Move photo 2 earlier');
  expect(container.querySelector<HTMLImageElement>('[data-preview-section="roadmap"] img')?.src).toBe('https://photos.example/two.jpg');
  mocks.updateRoadmap.mockRejectedValueOnce(new Error('offline'));await click('Save changes');
  expect(JSON.parse(localStorage.getItem('homepage_roadmap_resource_draft')!)['milestone-51'].images).toEqual(['https://photos.example/two.jpg','https://photos.example/one.jpg']);
  await click('Replace photo 1');await click('Upload roadmap/2023');await click('Delete photo 2');await click('Save changes');
  expect(mocks.updateRoadmap).toHaveBeenLastCalledWith(51,expect.objectContaining({images:['https://files.example/new.jpg'],points:['Festival milestone']}));
  expect(button('Save changes').disabled).toBe(true);
});
it('creates a new milestone through the common save bar and retains failed roadmap drafts', async () => {
  await mount('/admin/homepage?edit=roadmap');await click('Add milestone');await change('Milestone title','New edition launched'); mocks.addRoadmap.mockRejectedValueOnce(new Error('offline'));await click('Save changes');
  expect(localStorage.getItem('homepage_roadmap_resource_draft')).not.toBeNull();await click('Save changes');expect(mocks.addRoadmap).toHaveBeenLastCalledWith(expect.objectContaining({title:'New edition launched',enabled:true}));expect(button('Save changes').disabled).toBe(true);
});
it('suggests 2027 after 2026 and 2028 after the next draft without replacing existing editions',async()=>{
 const previous=mocks.road;const date=vi.spyOn(Date.prototype,'getFullYear').mockReturnValue(2026);
 mocks.road=[{...previous[0],year:2026,order_position:4}];
 try{
  await mount('/admin/homepage?edit=roadmap');expect(container.textContent).toContain('Next suggested year: 2027');
  await click('Add milestone');await change('Milestone title','Edition 2027');expect(container.textContent).toContain('Next suggested year: 2028');
  await click('Add milestone');await change('Milestone title','Edition 2028');
  await click('Save changes');
  expect(mocks.addRoadmap.mock.calls.map(([payload])=>({year:payload.year,order:payload.order_position}))).toEqual([{year:2027,order:5},{year:2028,order:6}]);
  expect(mocks.updateRoadmap).not.toHaveBeenCalled();
 }finally{mocks.road=previous;date.mockRestore();}
});
it('adds the next year at the latest position from the standalone Roadmap admin too',async()=>{
 const previous=mocks.road;const date=vi.spyOn(Date.prototype,'getFullYear').mockReturnValue(2026);
 mocks.road=[{...previous[0],year:2026,order_position:4}];
 try{
  await act(async()=>root.render(<RoadmapMilestonesAdmin/>));await click('Use next year: 2027');
  const title=container.querySelector<HTMLInputElement>('input[placeholder="Optional title…"]')!;
  await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(title,'A new edition');title.dispatchEvent(new Event('input',{bubbles:true}));});
  await click('Add');
  expect(mocks.addRoadmap).toHaveBeenCalledWith(expect.objectContaining({year:2027,title:'A new edition',order_position:5,enabled:true}));
  expect(mocks.updateRoadmap).not.toHaveBeenCalled();
 }finally{mocks.road=previous;date.mockRestore();}
});
it('hides consolidated Social and Roadmap edit tabs from homepage-only admins',async()=>{
 mocks.owner=false;await mount('/admin/homepage?edit=roadmap');expect(button('Roadmap & milestones')).toBeUndefined();expect(button('Social media links')).toBeUndefined();
});

it('normalizes nullable database video columns and validates missing clips without crashing', async () => {
  mocks.media={background_type:'video',enabled:true,video_url:null,mobile_video_url:null,image_url:null,mobile_image_url:null,poster_url:null,overlay_opacity:null};
  await mount('/admin/homepage?edit=media');
  expect(button('Save changes').disabled).toBe(true);
  await change('Laptop / desktop video URL','https://media.example/laptop.mp4');
  await click('Save changes');
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('separate mobile');
  expect(mocks.saveMedia).not.toHaveBeenCalled();
  await click('Discard changes');
  expect(button('Save changes').disabled).toBe(true);
  expect(localStorage.getItem('homepage_hero_resource_draft')).toBeNull();
});
it('repairs partial stored drafts across every studio section while preserving usable edits', async () => {
  localStorage.setItem('admin_homepage_form_draft',JSON.stringify({hero_title:42,hero_subtitle:'Keep this tagline',sponsor_logos:[null,{}, {name:null,logo_url:null}],brand_year:{bad:true},brand_logo_side:'invalid'}));
  localStorage.setItem('homepage_hero_resource_draft',JSON.stringify({video_url:null,mobile_video_url:{bad:true},enabled:'yes',desktop_zoom:'Infinity'}));
  localStorage.setItem('homepage_about_resource_draft',JSON.stringify({hero_heading:'Keep this story',hero_paragraphs:[null,42,'Valid paragraph'],tracks:{bad:true},zones:[null,'Stage'],stats:[null,{}, {value:null,label:'Guests'}]}));
  localStorage.setItem('homepage_social_resource_draft',JSON.stringify({instagram_url:null,youtube_url:42}));
  localStorage.setItem('homepage_lead_resource_draft',JSON.stringify({bad:null,broken:{},'faculty-41':{id:41,kind:'faculty',name:null,image:null,role:null,description:null,enabled:true}}));
  localStorage.setItem('homepage_roadmap_resource_draft',JSON.stringify({bad:null,'milestone-51':{id:51,year:2023,title:null,points:[null,42,'Restored milestone'],enabled:true}}));
  await mount();
  expect(container.querySelector('.studio-preview-tagline')?.textContent).toBe('Keep this tagline');
  for(const tab of ['Background video & images','Page content','Brand identity','Automatic homepage sections','About the festival','Social media links','Roadmap & milestones','Films & reels','People & leadership','Partner showcase']) await click(tab);
  await click('Save changes');
  expect(mocks.saveMedia).not.toHaveBeenCalled();
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('lead');
  await click('Discard changes');
  expect(button('Save changes').disabled).toBe(true);
  for(const key of ['admin_homepage_form_draft','homepage_hero_resource_draft','homepage_about_resource_draft','homepage_social_resource_draft','homepage_lead_resource_draft','homepage_roadmap_resource_draft']) expect(localStorage.getItem(key)).toBeNull();
});
it('handles malformed JSON and invalid primitive drafts as clean saved content',async()=>{
  for(const key of ['admin_homepage_form_draft','homepage_hero_resource_draft','homepage_about_resource_draft','homepage_social_resource_draft','homepage_lead_resource_draft','homepage_roadmap_resource_draft'])localStorage.setItem(key,'{broken');
  await mount();expect(button('Save changes').disabled).toBe(true);
  await click('About the festival');await change('About heading','Usable editor');await click('Save changes');
  expect(mocks.updateAbout).toHaveBeenCalledWith(expect.objectContaining({hero_heading:'Usable editor'}));
});

it('shows the active existing website video in both upload cards without creating an unsaved draft',async()=>{
  mocks.media={background_type:'auto',enabled:true,video_url:null,mobile_video_url:null,image_url:null,mobile_image_url:null};
  await mount('/admin/homepage?edit=media');
  expect(container.querySelector('[data-upload-preview="home/desktop"]')?.getAttribute('src')).toBe('/hero-preview.mp4');
  expect(container.querySelector('[data-upload-preview="home/mobile"]')?.getAttribute('src')).toBe('/hero-preview.mp4');
  expect(container.querySelectorAll('[data-media-source="default"]')).toHaveLength(2);
  expect(button('Save changes').disabled).toBe(true);expect(localStorage.getItem('homepage_hero_resource_draft')).toBeNull();
  await change('Laptop / desktop poster URL','https://media.example/poster.jpg');await click('Save changes');
  expect(mocks.saveMedia).toHaveBeenCalledWith('home',expect.objectContaining({poster_url:'https://media.example/poster.jpg',video_url:'',mobile_video_url:''}));
});
it('shows saved Supabase clips in each device card and reflects replacements without hiding the other device',async()=>{
  mocks.media={background_type:'video',enabled:true,video_url:'https://media.example/saved-desktop.mp4',mobile_video_url:'https://media.example/saved-mobile.mp4'};
  await mount('/admin/homepage?edit=media');
  expect(container.querySelector('[data-upload-preview="home/desktop"]')?.getAttribute('src')).toBe(mocks.media.video_url);
  expect(container.querySelector('[data-upload-preview="home/mobile"]')?.getAttribute('src')).toBe(mocks.media.mobile_video_url);
  expect(button('Save changes').disabled).toBe(true);
  await change('Laptop / desktop video URL','https://media.example/replacement.mp4');await click('Save changes');
  expect(mocks.saveMedia).toHaveBeenCalledWith('home',expect.objectContaining({video_url:'https://media.example/replacement.mp4',mobile_video_url:mocks.media.mobile_video_url}));
});
it('labels mobile fallback to the saved desktop clip and allows adjusting the existing background',async()=>{
  mocks.media={background_type:'video',enabled:true,video_url:'https://media.example/desktop-only.mp4',mobile_video_url:null};
  await mount('/admin/homepage?edit=media');
  expect(container.querySelector('[data-upload-preview="home/mobile"]')?.getAttribute('src')).toBe(mocks.media.video_url);
  expect(container.querySelector('[data-media-source="desktop"]')).not.toBeNull();
  await change('Laptop / desktop poster URL','https://media.example/new-poster.jpg');await click('Save changes');
  expect(mocks.saveMedia).toHaveBeenCalledTimes(1);expect(button('Save changes').disabled).toBe(true);
});

it('edits heads and council with Instagram and departments while preserving hidden legacy metadata', async () => {
  mocks.team=[{id:51,name:'Ishita Sen',image:'ishita.jpg',is_head:true,is_council:false,committee_id:1,order_position:2,enabled:true,role:'Lead developer',description:'Private legacy biography',social_links:{instagram:'@ishita',facebook:'https://facebook.com/ishita'}},{id:52,name:'Aditi Das',image:'aditi.jpg',is_head:false,is_council:true,committee_id:null,order_position:3,enabled:true,social_links:{instagram:'@aditi'}}];
  await mount('/admin/homepage?edit=people');
  const select=async(name:string)=>{const target=[...container.querySelectorAll<HTMLButtonElement>('.studio-profile-grid button')].find(node=>node.querySelector('strong')?.textContent===name)!;await act(async()=>target.click());};
  await select('Ishita Sen');
  const labels=[...container.querySelectorAll('.studio-lead-editor label')].map(node=>node.textContent);
  expect(labels).toContain('Instagram');expect(labels).toContain('Department');expect(labels).not.toContain('Role');expect(labels).not.toContain('About this lead');
  await change('Instagram','@ishita.sen');await change('Phone','+91 98300 00011');await change('Batch','2023–2028');
  await select('Aditi Das');await change('Lead name','Aditi Roy');await click('Save changes');
  const head=mocks.updateTeam.mock.calls.find(call=>call[0]===51)![1];
  expect(head.social_links).toEqual({instagram:'https://www.instagram.com/ishita.sen/',facebook:'https://facebook.com/ishita',batch:'2023–2028'});expect(head.phone).toBe('+91 98300 00011');expect(head).not.toHaveProperty('description');expect(head).not.toHaveProperty('role');
  expect(mocks.updateTeam).toHaveBeenCalledWith(52,expect.objectContaining({name:'Aditi Roy',committee_id:null,is_council:true}));
});

it('offers faculty Instagram and Facebook fields and saves normalized profile URLs',async()=>{
 await mount('/admin/homepage?edit=people');
 await change('Instagram','@faculty.vision');await change('Facebook','facebook.com/festival.faculty');await click('Save changes');
 expect(mocks.updateFaculty).toHaveBeenCalledWith(41,expect.objectContaining({social_links:expect.objectContaining({instagram:'https://www.instagram.com/faculty.vision/',facebook:'https://facebook.com/festival.faculty'})}));
});
