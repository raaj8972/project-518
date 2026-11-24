import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRightIcon,InstagramLogoIcon,PauseIcon,PlayIcon} from '@radix-ui/react-icons';
import {useArtistAudioBeat,prepareArtistAudio} from '../../hooks/useArtistAudioBeat';
import type {GuestArtist} from '../../types/data';
import {artistPhotos,artistStageClips,getArtistKind,artistMediaUrl,artistYoutubeId,spotifyResource} from '../../utils/artistMedia';
import {ArtistStageImage} from './ArtistStageImage';

type Slide={kind:'photo'|'clip';url:string};
export default function ArtistStageVisual({artist,suspended,motionPaused=false,onDetails,beatSync=true,viewport}:{viewport?:'phone'|'desktop';beatSync?:boolean;artist:GuestArtist;suspended:boolean;motionPaused?:boolean;onDetails?:()=>void}){
 const [desktop,setDesktop]=useState(()=>!!window.matchMedia?.('(min-width:701px)').matches);
 const [reduced,setReduced]=useState(()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const viewport=window.matchMedia?.('(min-width:701px)'),motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');const resize=()=>setDesktop(!!viewport?.matches),reduce=()=>setReduced(!!motion?.matches);viewport?.addEventListener?.('change',resize);motion?.addEventListener?.('change',reduce);return()=>{viewport?.removeEventListener?.('change',resize);motion?.removeEventListener?.('change',reduce);};},[]);
 const useDesktop=viewport?viewport==='desktop':desktop;
 const photos=useMemo(()=>artistPhotos(useDesktop&&artist.desktop_gallery_images?.length?{...artist,gallery_images:artist.desktop_gallery_images}:artist),[artist,useDesktop]);
 const clips=useMemo(()=>artistStageClips(useDesktop&&artist.desktop_stage_clip_urls?.length?{...artist,stage_clip_urls:artist.desktop_stage_clip_urls}:artist),[artist,useDesktop]);
 const slides=useMemo(()=>{
  const result:Slide[]=[];const portrait=photos[0]||artist.image;
  if(artist.stage_media_mode!=='clips'||!clips.length)return photos.map(url=>({kind:'photo' as const,url}));
  for(let index=0;index<Math.max(photos.length,clips.length);index++){result.push({kind:'photo',url:photos[index%Math.max(1,photos.length)]||portrait});if(clips[index])result.push({kind:'clip',url:clips[index]});}
  return result;
 },[photos,clips,artist.image,artist.stage_media_mode]);
 const [index,setIndex]=useState(0),[failed,setFailed]=useState<Set<string>>(new Set());
 const video=useRef<HTMLVideoElement>(null),advancing=useRef(false);
 const slide=slides[index]||slides[0]||{kind:'photo',url:artist.image};
 const halted=suspended||motionPaused||reduced;
 const next=()=>{if(halted||advancing.current)return;advancing.current=true;setIndex(value=>(value+1)%Math.max(1,slides.length));};
 useEffect(()=>{setIndex(0);},[useDesktop]);
 useEffect(()=>{advancing.current=false;const player=video.current;if(halted){player?.pause();return;}if(slide.kind==='clip'&&!failed.has(slide.url)){void player?.play()?.catch(()=>setFailed(previous=>new Set(previous).add(slide.url)));return()=>player?.pause();}if(slides.length<2)return;const timer=window.setTimeout(next,3800);return()=>window.clearTimeout(timer);},[index,slide.url,slide.kind,halted,failed,slides.length]);

 const kind=getArtistKind(artist);
 const noun=kind==='band'?'Band':kind==='dj'?'DJ':'Artist';
 const bio=(artist.description||`Meet ${artist.name} on the Ricorrenza stage.`).trim();
 const firstSentence=(bio.match(/^.*?[.!?](?:\s|$)/)?.[0]||bio.split('\n')[0]).trim();
 const teaser=firstSentence.length>128?`${firstSentence.slice(0,125).replace(/\s+\S*$/,'').trimEnd()}…`:firstSentence;
 const source=artistMediaUrl(artist.detail_music_url);
 const instagram=artistMediaUrl(artist.social_links?.instagram);
 const youtubeId=artistYoutubeId(artist.youtube_url);
 const youtube=artistMediaUrl(artist.social_links?.youtube)||(youtubeId?`https://www.youtube.com/watch?v=${youtubeId}`:'');
 const performance=youtubeId?`https://www.youtube.com/watch?v=${youtubeId}`:artistMediaUrl(artist.video_url)||youtube;
 const spotify=spotifyResource(artist.social_links?.spotify)||spotifyResource(artist.spotify_collection_url);
 const audio=useRef<HTMLAudioElement>(null);
 const [playing,setPlaying]=useState(false),[audioError,setAudioError]=useState('');
 useArtistAudioBeat(audio,beatSync);
 useEffect(()=>{const player=audio.current;const stop=()=>player?.pause();window.addEventListener('rico:artist-stop-audio',stop);return()=>{stop();window.removeEventListener('rico:artist-stop-audio',stop);};},[]);
 const toggleSong=()=>{
  if(!source)return;
  if(playing){audio.current?.pause();return;}
  if(beatSync)prepareArtistAudio();
  window.dispatchEvent(new Event('rico:artist-stop-video'));
  void audio.current?.play()?.catch(()=>setAudioError('Tap Listen to try the song again.'));
 };
 const links=[{name:'Instagram',href:instagram,icon:<InstagramLogoIcon/>},{name:'YouTube',href:youtube,icon:<YouTubeMark/>},{name:'Spotify',href:spotify?.url||'',icon:<SpotifyMark/>}].filter(link=>link.href);
 return <div className={`artist-stage-photo artist-record-card${slide.kind==='clip'?' is-clips':''}${playing?' is-song-playing':''}`} data-media-mode={artist.stage_media_mode==='clips'?'clips':'photos'} aria-label={`${artist.name} showcase`}>
  <span className="artist-record-backplate" aria-hidden="true"/>
  <button type="button" className="artist-record-vinyl" aria-label={`${playing?'Pause':'Play'} ${artist.name} vinyl`} disabled={!source} onClick={toggleSong}><span className="artist-record-vinyl-label"><i>R</i></span><span className="artist-record-spindle"/></button>
  <article className="artist-record-sleeve">
   <div className="artist-stage-presentation">
    {slide.kind==='clip'&&!failed.has(slide.url)&&!reduced?<video key={slide.url} ref={video} src={slide.url} poster={artist.image.includes('#panel-')?undefined:artist.image} muted autoPlay={!halted} playsInline disablePictureInPicture disableRemotePlayback preload="metadata" aria-label={`${artist.name} short clip`} onEnded={next} onTimeUpdate={event=>{if(event.currentTarget.currentTime>=(artist.stage_clip_seconds===60?60:30))next();}} onError={()=>setFailed(previous=>new Set(previous).add(slide.url))}/>:<ArtistStageImage src={slide.kind==='photo'?slide.url:photos[0]||artist.image} alt={artist.name}/>}
    <button type="button" className="artist-stage-poster-link" aria-label={`About ${artist.name}`} onClick={onDetails}/>
    <span className="artist-record-type">{kind==='band'?'Live band':kind==='dj'?'DJ set':'Live artist'}</span>
    {performance&&<a className="artist-record-watch" href={performance} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${artist.name} ${youtubeId?'on YouTube':'performance'}`}><span><PlayIcon/></span><span>Watch {youtubeId?'on':''}<strong>{youtubeId?<><YouTubeMark/>YouTube</>:'Performance'}</strong></span></a>}
   </div>
   <div className="artist-record-content">
    <div className="artist-stage-identity"><div className="artist-record-name"><SoundMark/><h3>{artist.name}</h3></div><p className="artist-record-genre"><span>{noun}</span>{artist.specialty.split(/[\/|·]/).map(value=>value.trim()).filter(Boolean).map((value,index)=><span key={index}>{value}</span>)}</p></div>
    <p className="artist-record-bio">{teaser}</p>
    {links.length>0&&<nav className="artist-record-socials" aria-label={`${artist.name} social profiles`}>{links.map(link=><a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${artist.name} on ${link.name}`} title={link.name}>{link.icon}</a>)}</nav>}
    <div className="artist-stage-discover"><button type="button" className="artist-stage-more" aria-label={`More details about ${artist.name}`} onClick={onDetails}>About the {noun}<ArrowRightIcon/></button>{source?<button type="button" className="artist-stage-listen" aria-label={`${playing?'Pause':'Play'} ${artist.name} preview`} onClick={toggleSong}>{playing?<PauseIcon/>:<MusicMark/>}{playing?'Pause':'Listen'}</button>:spotify&&<a className="artist-stage-listen" href={spotify.url} target="_blank" rel="noopener noreferrer"><SpotifyMark/>Listen</a>}</div>
    {source&&<audio ref={audio} crossOrigin="anonymous" src={source} loop preload="none" onPlay={()=>{setPlaying(true);setAudioError('');}} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onError={()=>{setPlaying(false);setAudioError('Song unavailable. Try the artist’s Spotify link.');}}/>}
    {audioError&&<p className="artist-record-error" role="status">{audioError}</p>}
   </div>
  </article>
 </div>;
}

function YouTubeMark(){return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor"/><path d="m10 9 6 3-6 3Z" fill="#08110c"/></svg>;}
function SpotifyMark(){return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M6.5 9.5c3-1 7-.7 10.8.9M7.2 12.6c2.7-.8 5.7-.5 9 .8M7.9 15.5c2.2-.6 4.8-.3 7.4.7" stroke="#08110c" strokeWidth="1.6" strokeLinecap="round"/></svg>;}
function MusicMark(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M9 17V5l11-2v12M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5" fill="currentColor"/><ellipse cx="17" cy="16" rx="3" ry="2.5" fill="currentColor"/></svg>;}
function SoundMark(){return <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M4 18v4m5-9v14m5-20v26m6-30v34m6-27v20m5-15v10m5-7v4"/></svg>;}
