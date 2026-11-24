// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import GuestArtistDetailModal from '../src/components/GuestArtistDetailModal';
import {artistSongTarget,getArtistKind,normalizeArtistSongs,spotifyResource} from '../src/utils/artistMedia';
import type {GuestArtist} from '../src/types/data';

const playlist='https://open.spotify.com/playlist/37i9dQZF1DZ06evO3eIivx';
const track='https://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ';
const band={id:7,name:'The Afterhours',artist_kind:'band',title:'Live band',specialty:'Indie fusion',description:'Four musicians, one shared sound.',image:'/images/band.webp',festival_year:2026,youtube_url:'https://youtu.be/aqz-KE-bpKQ',detail_music_url:'/media/song.wav',track_title:'City Lights',social_links:{instagram:'https://instagram.com/the_afterhours',youtube:'https://youtube.com/@the_afterhours',spotify:playlist},spotify_collection_url:playlist,stage_clip_urls:['/media/clip-one.mp4','/media/clip-two.mp4'],stage_clip_seconds:30,featured_songs:[{title:'Evening song',url:track},{title:'Live session',url:'https://youtu.be/aqz-KE-bpKQ'}]} as GuestArtist;
let host:HTMLDivElement,root:Root;
const onClose=vi.fn();
beforeEach(()=>{
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;onClose.mockReset();
 vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();document.body.style.overflow='';vi.restoreAllMocks();});
async function mount(isOpen=true){await act(async()=>root.render(<GuestArtistDetailModal artist={band} isOpen={isOpen} onClose={onClose}/>));}
async function click(label:string){const button=[...document.querySelectorAll<HTMLButtonElement>('.artist-profile-dialog button')].find(node=>node.textContent?.trim()===label||node.getAttribute('aria-label')===label);expect(button,label).toBeTruthy();await act(async()=>button!.click());}

it('opens a band profile with safe social links, clips and songs without starting media',async()=>{
 await mount();const dialog=document.querySelector<HTMLDialogElement>('dialog')!;
 expect(dialog.open).toBe(true);expect(dialog.dataset.artistKind).toBe('band');expect(dialog.textContent).toContain('ABOUT THE BAND');expect(dialog.querySelector('.artist-profile-story')?.textContent).toContain(band.description);expect(dialog.querySelector('.artist-profile-intro')?.textContent).not.toContain(band.description);expect(dialog.querySelector('.artist-profile-player')).toBeNull();expect(dialog.querySelectorAll('iframe,video,audio')).toHaveLength(0);
 expect(dialog.querySelectorAll('.artist-profile-song-list li')).toHaveLength(2);expect(dialog.querySelectorAll('[aria-label="Artist short clips"] button')).toHaveLength(2);expect(dialog.querySelector('a[href="'+playlist+'"]')?.getAttribute('rel')).toBe('noopener noreferrer');expect(document.body.style.overflow).toBe('hidden');
});

it('switches between performance, playlist and songs using a single player',async()=>{
 await mount();await click('Watch performance');expect(document.querySelector('iframe')?.src).toContain('youtube-nocookie.com/embed/aqz-KE-bpKQ');
 await click('Spotify player');expect(document.querySelectorAll('iframe')).toHaveLength(1);expect(document.querySelector('iframe')?.src).toContain('/embed/playlist/');expect(document.querySelector('iframe')?.height).toBe('352');
 await click('Play Evening song');expect(document.querySelector('iframe')?.src).toContain('/embed/track/');expect(document.querySelector('iframe')?.height).toBe('152');
 await click('Play Live session');expect(document.querySelector('audio')).toBeNull();expect(document.querySelector('iframe')?.title).toBe('Live session');
 await click('Stop playback');expect(document.querySelectorAll('iframe,video,audio')).toHaveLength(0);
});

it('plays the requested short clip and stops at its configured duration',async()=>{
 await mount();await click('Short clip 2');const video=document.querySelector('video')!;expect(video.getAttribute('src')).toBe('/media/clip-two.mp4');expect(video.controls).toBe(true);video.currentTime=30;await act(async()=>video.dispatchEvent(new Event('timeupdate')));expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
});

it('handles Escape and restores body scrolling and focus after dismissal',async()=>{
 const opener=document.createElement('button');document.body.append(opener);opener.focus();document.body.style.overflow='auto';await mount();await act(async()=>document.querySelector('dialog')!.dispatchEvent(new Event('cancel',{cancelable:true})));expect(onClose).toHaveBeenCalledTimes(1);await mount(false);expect(document.querySelector('dialog')).toBeNull();expect(document.body.style.overflow).toBe('auto');expect(document.activeElement).toBe(opener);opener.remove();
});

it('normalizes Spotify resources and rejects unsafe or unrelated song providers',()=>{
 expect(spotifyResource('spotify:track:0Lr4kGOYn9l83EjuK6cZFQ')?.url).toBe(track);expect(spotifyResource('https://open.spotify.com/intl-en/embed/playlist/37i9dQZF1DZ06evO3eIivx?si=abc')?.url).toBe(playlist);
 for(const url of ['javascript:bad','https://spotify.example/track/0Lr4kGOYn9l83EjuK6cZFQ','http://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ','https://open.spotify.com/track/short'])expect(spotifyResource(url)).toBeNull();
 expect(artistSongTarget('https://example.com/song.mp3')).toBeNull();expect(normalizeArtistSongs([{title:' Song ',url:track},{title:'Unsafe',url:'javascript:bad'},null])).toEqual([{title:'Song',url:track}]);expect(getArtistKind({title:'Acoustic duo'})).toBe('band');expect(getArtistKind({title:'DJ night'})).toBe('dj');expect(getArtistKind({artist_kind:'artist',title:'Live band'})).toBe('artist');
});

it('shows an inline live About preview without opening a dialog or locking the editor',async()=>{
 document.body.style.overflow='auto';await act(async()=>root.render(<GuestArtistDetailModal inline isOpen artist={band} onClose={onClose}/>));expect(document.querySelector('dialog')).toBeNull();expect(document.body.style.overflow).toBe('auto');expect(document.querySelector('.artist-profile-inline .artist-profile-bio')?.textContent).toBe(band.description);expect(document.querySelector('.artist-profile-inline')?.textContent).not.toContain('Play City Lights');
 await act(async()=>root.render(<GuestArtistDetailModal inline isOpen artist={{...band,description:'Updated full story',featured_songs:[{title:'New song',url:track}]}} onClose={onClose}/>));expect(document.querySelector('.artist-profile-bio')?.textContent).toBe('Updated full story');expect(document.querySelector('.artist-profile-song-list')?.textContent).toContain('New song');
});

it('reloads a selected Spotify player when chosen again and clears its loading state',async()=>{
 await mount();await click('Spotify player');const first=document.querySelector('iframe')!;await act(async()=>first.dispatchEvent(new Event('load')));expect(document.querySelector('.artist-profile-player-loading')).toBeNull();await click('Spotify player');const next=document.querySelector('iframe')!;expect(next).not.toBe(first);expect(document.querySelector('.artist-profile-player-loading')).not.toBeNull();await act(async()=>next.dispatchEvent(new Event('load')));expect(document.querySelector('.artist-profile-player-loading')).toBeNull();
});
