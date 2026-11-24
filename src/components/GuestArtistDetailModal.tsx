import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRightIcon, CalendarIcon, Cross2Icon, DiscIcon, ExternalLinkIcon, InstagramLogoIcon, PlayIcon, VideoIcon } from '@radix-ui/react-icons';
import type { GuestArtist } from '../types/data';
import { artistMediaUrl, artistStageClips, artistSongTarget, artistYoutubeId, getArtistKind, normalizeArtistSongs, spotifyResource } from '../utils/artistMedia';
import { getArtistFestivalYear } from '../utils/guestArtists';
import { ArtistStageImage } from './Home/ArtistStageImage';
import '../styles/ArtistProfile.css';

export type GuestArtistDetail = Partial<GuestArtist> & { name: string };
type Playback = {kind:'none'} | {kind:'video';url:string;title:string;youtube:boolean;clipLimit?:number} | {kind:'spotify';url:string;title:string};

export default function GuestArtistDetailModal({isOpen,onClose,artist,inline=false}:{inline?:boolean;isOpen:boolean;onClose:()=>void;artist:GuestArtistDetail|null}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const closeRef=useRef(onClose);closeRef.current=onClose;
  const [playback,setPlayback]=useState<Playback>({kind:'none'});
  const [mediaError,setMediaError]=useState('');
  const [playerLoading,setPlayerLoading]=useState(false);
  const [playbackKey,setPlaybackKey]=useState(0);
  const headingId=useId();
  const kind=getArtistKind(artist||{});
  const noun=kind==='band'?'band':kind==='dj'?'DJ':'artist';
  const collection=spotifyResource(artist?.spotify_collection_url)||spotifyResource(artist?.social_links?.spotify);
  const clips=artistStageClips(artist||{});
  const songs=normalizeArtistSongs(artist?.featured_songs);
  const youtube=artistYoutubeId(artist?.youtube_url);
  const video=artistMediaUrl(artist?.video_url);
  const instagram=artistMediaUrl(artist?.social_links?.instagram);
  const channel=artistMediaUrl(artist?.social_links?.youtube);
  const live=artistMediaUrl(artist?.watch_live_url);
  const stop=()=>setPlayback({kind:'none'});
  const close=()=>{stop();closeRef.current();};
  const choose=(next:Playback)=>{setPlaybackKey(key=>key+1);setPlayerLoading(next.kind==='spotify'||next.kind==='video'&&next.youtube);setMediaError('');setPlayback(next);};

  useEffect(()=>{
    if(!isOpen||!artist||inline)return;
    const element=dialog.current;
    const previous=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    setPlayback({kind:'none'});setMediaError('');
    window.dispatchEvent(new Event('rico:artist-stop-audio'));
    window.dispatchEvent(new Event('rico:artist-stop-video'));
    if(element){if(typeof element.showModal==='function')element.showModal();else element.setAttribute('open','');}
    const hidden=()=>{if(document.hidden)setPlayback({kind:'none'});};
    document.addEventListener('visibilitychange',hidden);
    return()=>{
      document.removeEventListener('visibilitychange',hidden);
      if(element?.open){if(typeof element.close==='function')element.close();else element.removeAttribute('open');}
      document.body.style.overflow=overflow;previous?.focus();
    };
  },[isOpen,artist?.id,inline]);

  if(!isOpen||!artist)return null;
  const openPerformance=()=>{if(youtube)choose({kind:'video',url:`https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0`,title:`${artist.name} performance`,youtube:true});else if(video)choose({kind:'video',url:video,title:`${artist.name} performance`,youtube:false});};
  const spotify=playback.kind==='spotify'?spotifyResource(playback.url):null;
  const validDate=artist.performance_at&&!isNaN(Date.parse(artist.performance_at))?new Date(artist.performance_at):null;
  const performerLinks=[{label:'Instagram',href:instagram,icon:InstagramLogoIcon},{label:'YouTube',href:channel,icon:VideoIcon},{label:'Spotify',href:spotifyResource(artist.social_links?.spotify)?.url||collection?.url||'',icon:DiscIcon}].filter(link=>link.href);
  const content=<div className="artist-profile-shell">
      <header className="artist-profile-header"><div><span>{artist.id&&artist.id<0?'DESIGN PREVIEW / SAMPLE MEDIA':`RICORRENZA / ${getArtistFestivalYear(artist)}`}</span><strong>BACKSTAGE WITH THE {noun.toUpperCase()}</strong></div>{!inline&&<button type="button" onClick={close} aria-label="Close artist details"><Cross2Icon/></button>}</header>
      <div className="artist-profile-scroll" data-lenis-prevent>
        <section className="artist-profile-intro">
          <div className="artist-profile-photo"><ArtistStageImage src={artistMediaUrl(artist.image)} alt=""/></div>
          <div className="artist-profile-copy"><span className="artist-profile-eyebrow">ABOUT THE {noun.toUpperCase()}</span><h2 id={headingId}>{artist.name}</h2><p className="artist-profile-role">{artist.title}{artist.specialty&&<span>{artist.specialty}</span>}</p>
            {(validDate||artist.venue)&&<p className="artist-profile-date"><CalendarIcon/>{validDate?.toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}{artist.venue&&`${validDate?' · ':''}${artist.venue}`}</p>}
          </div>
        </section>
        {!!(artist.description||artist.achievements?.length)&&<section className="artist-profile-story" aria-label={`The ${noun} story`}>
          <div className="artist-profile-section-title"><div><span>BEHIND THE SOUND</span><h3>{kind==='band'?'The band’s story':kind==='dj'?'Behind the decks':'The artist’s story'}</h3></div></div>
          {artist.description&&<p className="artist-profile-bio">{artist.description}</p>}
          {!!artist.achievements?.length&&<ul className="artist-profile-highlights">{artist.achievements.map((highlight,index)=><li key={index}>{highlight}</li>)}</ul>}
        </section>}
        {(youtube||video||collection||clips.length>0)&&
        <section className="artist-profile-media" aria-label="Artist video and music">
          <div className="artist-profile-section-title"><div><span>FROM THEIR STAGE TO YOURS</span><h3>Music & performances</h3></div></div>
          <div className="artist-profile-player-actions">
            {(youtube||video)&&<button type="button" aria-pressed={playback.kind==='video'} onClick={openPerformance}><VideoIcon/>Watch performance</button>}
            {collection&&<button type="button" aria-pressed={playback.kind==='spotify'} onClick={()=>choose({kind:'spotify',url:collection.url,title:`${artist.name} on Spotify`})}><PlayIcon/>Spotify player</button>}
          </div>
          {clips.length>0&&<div className="artist-profile-clips" role="group" aria-label="Artist short clips">{clips.map((url,index)=><button type="button" key={url} onClick={()=>choose({kind:'video',url,title:`${artist.name} · short clip ${index+1}`,youtube:false,clipLimit:artist.stage_clip_seconds===60?60:30})}><PlayIcon/>Short clip {index+1}</button>)}</div>}
          {playback.kind!=='none'&&<div className={`artist-profile-player${playback.kind==='spotify'?' is-spotify':''}`}>
            {playback.kind==='video'?playback.youtube?<iframe key={`${playbackKey}-${playback.url}`} onLoad={()=>setPlayerLoading(false)} src={playback.url} title={playback.title} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>:<video key={`${playbackKey}-${playback.url}`} src={playback.url} controls autoPlay playsInline onTimeUpdate={event=>{if(playback.clipLimit&&event.currentTarget.currentTime>=playback.clipLimit)event.currentTarget.pause();}} onError={()=>setMediaError('This performance is unavailable. Try the artist’s YouTube link.')}/>
              :playback.kind==='spotify'&&spotify?<iframe key={`${playbackKey}-${spotify.embedUrl}`} onLoad={()=>setPlayerLoading(false)} src={`${spotify.embedUrl}?theme=0`} title={playback.title} width="100%" style={{height:spotify.type==='track'?152:352}} height={spotify.type==='track'?152:352} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>
              :null}
            {playerLoading&&(playback.kind==='spotify'||playback.kind==='video'&&playback.youtube)&&<div className="artist-profile-player-loading" role="status"><span/><span/><span/><p>Loading {playback.kind==='spotify'?'Spotify':'video'} player…</p></div>}
          </div>}
          {mediaError&&<p className="artist-profile-error" role="alert">{mediaError}</p>}
          {playback.kind!=='none'&&<button type="button" className="artist-profile-stop" onClick={stop}>Stop playback<Cross2Icon/></button>}
        </section>}
        {(collection||songs.length>0)&&<section className="artist-profile-songs"><div className="artist-profile-section-title"><div><span>KEEP THE MUSIC GOING</span><h3>Songs to know</h3></div>{collection&&<a href={collection.url} target="_blank" rel="noopener noreferrer">Open in Spotify<ExternalLinkIcon/></a>}</div>
          {collection&&!songs.length&&<div className="artist-profile-collection"><DiscIcon/><div><strong>{collection.type==='artist'?`More from ${artist.name}`:collection.type==='playlist'?'The artist’s playlist':collection.type==='album'?'Listen to the album':'Featured on Spotify'}</strong><p>Discover their songs in the Spotify player, or keep listening in Spotify.</p></div><button type="button" onClick={()=>choose({kind:'spotify',url:collection.url,title:`${artist.name} songs on Spotify`})}>Explore songs<ArrowRightIcon/></button></div>}
          {!!songs.length&&<ol className="artist-profile-song-list">{songs.map((item,index)=>{const target=artistSongTarget(item.url)!;return <li key={`${item.url}-${index}`}><span>{String(index+1).padStart(2,'0')}</span><div><strong>{item.title}</strong><small>{target.provider}</small></div><button type="button" aria-label={`Play ${item.title}`} onClick={()=>choose(target.provider==='Spotify'?{kind:'spotify',url:target.url,title:item.title}:{kind:'video',url:target.embedUrl,title:item.title,youtube:true})}><PlayIcon/><span>Play here</span></button><a href={target.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.title} in ${target.provider}`}><ExternalLinkIcon/></a></li>;})}</ol>}
        </section>}
        {(performerLinks.length>0||live)&&<nav className="artist-profile-links" aria-label={`Follow ${artist.name}`}><span>FOLLOW THE {noun.toUpperCase()}</span>{performerLinks.map(link=><a href={link.href} key={link.label} target="_blank" rel="noopener noreferrer"><link.icon/>{link.label}<ExternalLinkIcon/></a>)}{live&&<a href={live} target="_blank" rel="noopener noreferrer"><VideoIcon/>Watch live<ExternalLinkIcon/></a>}</nav>}
        <footer className="artist-profile-footer">ONE STAGE. A THOUSAND MEMORIES.</footer>
      </div>
    </div>;
  if(inline)return <section className="artist-profile-dialog artist-profile-inline" data-artist-kind={kind} aria-labelledby={headingId}>{content}</section>;
  return createPortal(<dialog ref={dialog} className="artist-profile-dialog" data-artist-kind={kind} aria-labelledby={headingId} onCancel={event=>{event.preventDefault();close();}} onClick={event=>{if(event.target===event.currentTarget)close();}}>{content}</dialog>,document.body);
}
