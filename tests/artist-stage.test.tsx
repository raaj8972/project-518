// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import ArtistStage from '../src/components/Home/ArtistStage';
import {artistMediaUrl,artistPhotos,artistYoutubeId} from '../src/utils/artistMedia';
import {getArtistFestivalYear,normalizeGuestArtists} from '../src/utils/guestArtists';
import {createArtistDemo} from '../src/data/artistDemo';
import type {GuestArtist} from '../src/types/data';

let host:HTMLDivElement,root:Root;
const artist=(id:number,year:number,patch:Partial<GuestArtist>={})=>({id,name:`Performer ${id}`,title:'Live band',specialty:'Fusion',description:'A live performance.',image:`https://media.example/portrait-${id}.webp`,enabled:true,festival_year:year,order_position:id,gallery_images:['https://media.example/one.webp','https://media.example/two.webp','https://media.example/three.webp'],detail_music_url:'https://media.example/song.mp3',track_title:'Selected song',youtube_url:'https://www.youtube.com/watch?v=aqz-KE-bpKQ',social_links:{instagram:'https://instagram.com/performer',youtube:'https://youtube.com/@performer'},...patch} as GuestArtist);
beforeEach(()=>{
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
 vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(function(this:HTMLMediaElement){this.dispatchEvent(new Event('pause'));});
 vi.spyOn(HTMLMediaElement.prototype,'play').mockImplementation(function(this:HTMLMediaElement){this.dispatchEvent(new Event('play'));return Promise.resolve();});
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});
async function mount(artists:GuestArtist[],props:Record<string,unknown>={}){await act(async()=>root.render(<ArtistStage artists={artists} currentYear={2026} {...props}/>));}
function button(name:string){return [...host.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.getAttribute('aria-label')===name||button.textContent?.trim()===name)!;}
async function click(name:string){expect(button(name),name).toBeTruthy();await act(async()=>button(name).click());}

it('uses one reveal screen for an unannounced year and allows browsing past editions',async()=>{
 await mount([artist(5,2025),artist(4,2024),artist(6,2026,{enabled:false})]);expect(host.querySelectorAll('.artist-concert-screens .artist-stage-photo')).toHaveLength(1);expect(host.querySelector('.artist-stage-reveal')?.textContent).toContain('Artist reveals');expect(host.querySelectorAll('iframe')).toHaveLength(0);
 await click('Meet our past artists');expect(host.querySelector('h3')?.textContent).toBe('Performer 5');expect(host.textContent).toContain('FROM THE ARCHIVES');await click('20241');expect(host.querySelector('h3')?.textContent).toBe('Performer 4');
});

it('shows one active artist screen with neighbouring artist previews and no separate music or video panels',async()=>{
 await mount([artist(1,2026),artist(2,2026),artist(3,2026),artist(4,2026,{enabled:false})]);const screens=host.querySelector('.artist-concert-screens')!;expect(screens.querySelectorAll('.artist-stage-photo')).toHaveLength(1);expect(screens.querySelectorAll('iframe,.artist-stage-video,.artist-stage-record')).toHaveLength(0);expect(host.querySelectorAll('.artist-stage-roster>button')).toHaveLength(3);expect(screens.querySelector('.artist-concert-peek-previous img')?.getAttribute('src')).toBe('https://media.example/portrait-3.webp');expect(screens.querySelector('.artist-concert-peek-next img')?.getAttribute('src')).toBe('https://media.example/portrait-2.webp');
 await click('Show next artist: Performer 2');expect(host.querySelector('.artist-stage-identity h3')?.textContent).toBe('Performer 2');await click('Previous artist');expect(host.querySelector('.artist-stage-identity h3')?.textContent).toBe('Performer 1');
});

it('updates the central gallery and artist details target together when choosing artist dots',async()=>{
 const onArtistDetails=vi.fn();await mount([artist(1,2026),artist(2,2026,{gallery_images:['https://media.example/second.webp']})],{onArtistDetails});await click('Show artist 2: Performer 2');expect(host.querySelector('.artist-stage-presentation img')?.getAttribute('src')).toBe('https://media.example/second.webp');expect(button('Show artist 2: Performer 2').getAttribute('aria-pressed')).toBe('true');await click('More details about Performer 2');expect(onArtistDetails).toHaveBeenCalledWith(expect.objectContaining({id:2}));
});

it('centres the sample band and shows its neighbours as carousel previews',async()=>{
 await mount(createArtistDemo(2026),{demo:true});expect(host.querySelector('.artist-stage-identity h3')?.textContent).toBe('The Afterhours');expect(host.querySelector('.artist-stage')?.getAttribute('data-artist-kind')).toBe('band');expect(button('Show previous artist: Aarohi Sen')).toBeTruthy();expect(button('Show next artist: DJ Aaryan')).toBeTruthy();expect(host.querySelectorAll('.artist-concert-dots>button')).toHaveLength(3);expect(host.querySelectorAll('iframe')).toHaveLength(0);
});

it('does not duplicate the same neighbour when only two artists are announced',async()=>{
 await mount(createArtistDemo(2026).filter(row=>row.festival_year===2026).slice(0,2),{demo:true});expect(host.querySelectorAll('button.artist-concert-peek')).toHaveLength(1);expect(host.querySelector('.artist-concert-peek.is-coming')?.textContent).toContain('More artists');
});

it('advances photos without overlay controls and provides a separate motion pause',async()=>{
 vi.useFakeTimers();await mount([artist(1,2026)]);const source=()=>host.querySelector('.artist-stage-presentation img')?.getAttribute('src');expect(source()).toBe('https://media.example/one.webp');expect(host.querySelector('.artist-stage-photo-controls')).toBeNull();await act(async()=>vi.advanceTimersByTime(3800));expect(source()).toBe('https://media.example/two.webp');await click('Pause motion');await act(async()=>vi.advanceTimersByTime(10000));expect(source()).toBe('https://media.example/two.webp');await click('Resume motion');await act(async()=>vi.advanceTimersByTime(3800));expect(source()).toBe('https://media.example/three.webp');
});

it('opens a full artist profile through the visible More details action',async()=>{
 const description='Acoustic stories and a chorus that stays with you.\n\nThe full band story only appears after opening About.';await mount([artist(1,2026,{description})]);expect(host.querySelector('.artist-record-bio')?.textContent).toBe('Acoustic stories and a chorus that stays with you.');await click('More details about Performer 1');await act(async()=>{await vi.dynamicImportSettled();});const dialog=document.querySelector('dialog')!;expect(dialog?.open).toBe(true);expect(dialog.textContent).toContain('ABOUT THE BAND');expect(dialog.querySelector('.artist-profile-story')?.textContent).toContain(description);expect(dialog.textContent).toContain('Watch performance');expect(host.querySelectorAll('iframe')).toHaveLength(0);await act(async()=>dialog.querySelector<HTMLButtonElement>('[aria-label="Close artist details"]')!.click());expect(document.querySelector('dialog')).toBeNull();
});

it('refreshes the gallery when saved media changes and falls back to the portrait',async()=>{
 await mount([artist(1,2026)]);await mount([artist(1,2026,{gallery_images:['https://media.example/new-photo.webp']})]);expect(host.querySelector('.artist-stage-presentation img')?.getAttribute('src')).toBe('https://media.example/new-photo.webp');await mount([artist(2,2026,{gallery_images:[]})]);expect(host.querySelectorAll('.artist-stage-presentation > img')).toHaveLength(1);expect(host.querySelector('.artist-stage-presentation img')?.getAttribute('src')).toBe('https://media.example/portrait-2.webp');
});

it('normalizes years and unsafe media without changing older dated editions',()=>{
 expect(getArtistFestivalYear({performance_at:'2025-12-31T20:00:00Z'})).toBe(2026);expect(getArtistFestivalYear({festival_year:2024,performance_at:'2026-01-01T12:00:00Z'})).toBe(2024);expect(normalizeGuestArtists([{name:'Old',image:'image.jpg',gallery_images:null,track_title:null,performance_at:'2024-11-01T12:00:00Z'}])[0]).toMatchObject({festival_year:2024,gallery_images:[],track_title:''});expect(artistYoutubeId('https://notyoutube.com/watch?v=aqz-KE-bpKQ')).toBeNull();expect(artistYoutubeId('https://youtu.be/aqz-KE-bpKQ')).toBe('aqz-KE-bpKQ');expect(artistMediaUrl('javascript:alert(1)')).toBe('');expect(artistMediaUrl('//untrusted.example/song.mp3')).toBe('');expect(artistPhotos({image:'/portrait.webp',gallery_images:['javascript:bad']})).toEqual(['/portrait.webp']);
});

it('shows only configured years, updates hidden selections and renders only editable date/place',async()=>{
 const artists=[artist(1,2026),artist(2,2025),artist(3,2023)];await mount(artists,{settings:{visible_years:[2026,2023],date_label:'DEC 2026',venue_label:'The Arena'}});expect(host.querySelector('.artist-stage-years')?.textContent).not.toContain('2025');expect(host.querySelector('.artist-stage-years')?.textContent).toContain('2023');expect(host.querySelectorAll('.artist-concert-info>span')).toHaveLength(2);expect(host.querySelector('.artist-concert-info')?.textContent).toContain('DEC 2026');expect(host.querySelector('.artist-concert-info')?.textContent).toContain('The Arena');await mount(artists,{settings:{visible_years:[2023]}});expect(host.querySelector('.artist-stage-identity h3')?.textContent).toBe('Performer 3');
});

it('changes light colour by artist and responds to actual audio energy',async()=>{
 await mount([artist(1,2026,{stage_light_color:'#54cbb0'}),artist(2,2026,{stage_light_color:'#de7995'})]);const stage=host.querySelector<HTMLElement>('.artist-stage')!;expect(stage.style.getPropertyValue('--artist-accent')).toBe('#54cbb0');await act(async()=>window.dispatchEvent(new CustomEvent('rico:artist-energy',{detail:{energy:.7}})));expect(stage.style.getPropertyValue('--stage-energy')).toBe('0.7');await click('Next artist');expect(stage.style.getPropertyValue('--artist-accent')).toBe('#de7995');
});

it('keeps direct social links, YouTube and both artist actions inside the main sleeve',async()=>{
 const spotify='https://open.spotify.com/artist/0OdUWJ0sBjDrqHygGUXeCF';await mount([artist(1,2026,{social_links:{instagram:'https://instagram.com/theband',youtube:'https://youtube.com/@theband',spotify}})]);const sleeve=host.querySelector('.artist-record-sleeve')!;expect(sleeve.querySelector('.artist-stage-more')).not.toBeNull();expect(sleeve.querySelector('.artist-stage-listen')).not.toBeNull();expect(host.querySelector('.artist-stage-inner .artist-stage-profile')).toBeNull();const links=[...sleeve.querySelectorAll<HTMLAnchorElement>('.artist-record-socials a')];expect(links.map(link=>link.href)).toEqual(['https://instagram.com/theband','https://youtube.com/@theband',spotify]);expect(links.every(link=>link.target==='_blank'&&link.rel==='noopener noreferrer')).toBe(true);expect(sleeve.querySelector('.artist-record-watch')?.getAttribute('href')).toBe('https://www.youtube.com/watch?v=aqz-KE-bpKQ');
});
it('plays the uploaded song from the sleeve or the vinyl and stops it when About opens',async()=>{
 const onArtistDetails=vi.fn();await mount([artist(1,2026)],{onArtistDetails});expect(host.querySelector('audio')?.loop).toBe(true);await click('Play Performer 1 preview');expect(host.querySelector('.artist-record-card')?.classList.contains('is-song-playing')).toBe(true);await click('Pause Performer 1 vinyl');expect(host.querySelector('.artist-record-card')?.classList.contains('is-song-playing')).toBe(false);await click('Play Performer 1 vinyl');await click('More details about Performer 1');expect(onArtistDetails).toHaveBeenCalledWith(expect.objectContaining({id:1}));expect(host.querySelector('.artist-record-card')?.classList.contains('is-song-playing')).toBe(false);
});
