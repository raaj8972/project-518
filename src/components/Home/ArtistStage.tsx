import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowRightIcon, PauseIcon, PlayIcon, CalendarIcon } from '@radix-ui/react-icons';
import {readArtistStageSettings,artistLightColor,artistLightHue} from '../../utils/artistStageSettings';
import type { GuestArtist } from '../../types/data';
import { BRAND_YEAR } from '../../constants/brand';
import { getArtistFestivalYear } from '../../utils/guestArtists';
import { artistPhotos, artistStageClips, getArtistKind } from '../../utils/artistMedia';
import '../../styles/ArtistStage.css';
import '../../styles/ArtistRecordCard.css';
import { ArtistStageImage } from './ArtistStageImage';
import ArtistStageVisual from './ArtistStageVisual';
const ArtistDetails=lazy(()=>import('../GuestArtistDetailModal'));

interface Props {
  artists: GuestArtist[];
  settings?: unknown;
  currentYear?: number;
  demo?: boolean;
  paused?: boolean;
  loading?: boolean;
  onArtistDetails?: (artist: GuestArtist) => void;
}


function ArtistPeek({artist,side,onSelect}:{artist?:GuestArtist;side:'previous'|'next';onSelect:(artist:GuestArtist)=>void}) {
  const className=`artist-concert-peek artist-concert-peek-${side}`;
  return artist?<button type="button" className={className} data-artist-kind={getArtistKind(artist)} aria-label={`Show ${side} artist: ${artist.name}`} onClick={()=>onSelect(artist)}><ArtistStageImage src={artist.image} alt=""/><span><strong>{artist.name}</strong><small>{artist.title}</small></span></button>:<div className={`${className} is-coming`} aria-hidden="true"><span><strong>More artists<br/>coming soon</strong><small>STAY TUNED</small></span></div>;
}

export default function ArtistStage({artists, settings, currentYear = Number(BRAND_YEAR), demo = false, paused = false, loading = false, onArtistDetails}: Props) {
  const [year, setYear] = useState(currentYear);
  const [selected, setSelected] = useState<number | null>(null);
  const [localDetails,setLocalDetails]=useState<GuestArtist|null>(null);
  const [visible, setVisible] = useState(true);
  const section = useRef<HTMLElement>(null);
  const id = useId();
  const configuration=useMemo(()=>readArtistStageSettings(settings,currentYear,artists),[settings,currentYear,artists]);
  const years=configuration.visible_years;
  const [motionPaused,setMotionPaused]=useState(false);
  useEffect(()=>{if(!years.includes(year)){setYear(years.includes(currentYear)?currentYear:years[0]);setSelected(null);}},[years.join(','),currentYear,year]);
  useEffect(()=>{
    const element=section.current;let beatIndex=0;
    const reset=()=>{if(!element)return;element.dataset.audio='ambient';element.style.setProperty('--stage-energy','0');element.style.setProperty('--stage-beat-hue','0deg');};
    reset();
    const energy=(event:Event)=>{
      const detail=(event as CustomEvent).detail||{};const value=Number.isFinite(detail.energy)?Math.min(1,Math.max(0,detail.energy)):0;
      if(!configuration.beat_sync||detail.active===false){reset();return;}
      if(!element)return;
      element.dataset.audio='playing';element.style.setProperty('--stage-energy',String(value));
      if(detail.beat){beatIndex++;element.style.setProperty('--stage-beat-hue',`${beatIndex*47%360}deg`);}
    };
    window.addEventListener('rico:artist-energy',energy);
    return()=>{window.removeEventListener('rico:artist-energy',energy);reset();};
  },[configuration.beat_sync]);
  const lineup = useMemo(() => artists.filter(artist => artist.enabled && getArtistFestivalYear(artist, currentYear) === year).sort((a, b) => (a.order_position || 0) - (b.order_position || 0)), [artists, year, currentYear]);
  const active = lineup.find(artist => artist.id === selected) || lineup[demo && lineup.length > 1 ? 1 : 0];
  const kind=getArtistKind(active||{});
  const openDetails=()=>{if(!active)return;stopMedia();if(onArtistDetails)onArtistDetails(active);else setLocalDetails(active);};
  const activeIndex = lineup.findIndex(artist => artist.id === active?.id);
  const previous=lineup.length>1?lineup[(activeIndex-1+lineup.length)%lineup.length]:undefined;
  const next=lineup.length>2?lineup[(activeIndex+1)%lineup.length]:undefined;
  const stopMedia = () => {window.dispatchEvent(new Event('rico:artist-stop-audio')); window.dispatchEvent(new Event('rico:artist-stop-video'));};
  useEffect(() => {setYear(currentYear); setSelected(null);}, [currentYear]);
  useEffect(() => {
    let inView = true;
    const update = () => {if (document.hidden) stopMedia(); setVisible(inView && !document.hidden);};
    document.addEventListener('visibilitychange', update);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {inView = entries[0]?.isIntersecting ?? true; setVisible(inView && !document.hidden); if (!inView) stopMedia();}, {threshold: 0.02});
    if (section.current) observer?.observe(section.current);
    return () => {document.removeEventListener('visibilitychange', update); observer?.disconnect(); stopMedia();};
  }, []);
  useEffect(() => {if (paused) stopMedia();}, [paused]);
  const selectArtist = (artist: GuestArtist) => {stopMedia(); setSelected(artist.id);};
  const move = (direction: number) => {const index = lineup.findIndex(artist => artist.id === active?.id); if (lineup.length) selectArtist(lineup[(index + direction + lineup.length) % lineup.length]);};

  return <section ref={section} id="artists" className={`artist-stage${demo ? ' artist-stage-is-demo' : ''}`} aria-labelledby={`${id}-heading`} data-artist-kind={kind} data-stage-media={active?.stage_media_mode==='clips'?'clips':'photos'} data-motion={motionPaused?'paused':'running'} data-lights={configuration.lights_enabled?'on':'off'} style={{'--artist-accent':artistLightColor(active||{}),'--lamp-hue':`${artistLightHue(active||{})}deg`} as CSSProperties}>
    <div className="artist-concert-scene">
      <div className="artist-concert-backdrop" aria-hidden="true"/>
      <div className="artist-stage-lights" aria-hidden="true"/>
      <div className="artist-concert-brand" aria-label={`Ricorrenza ${currentYear}`}>
        <p>IQ CITY MEDICAL COLLEGE PRESENTS</p>
        <div className="artist-concert-wordmark"><img src="/images/artist-reference-wordmark.webp" alt="RICORRENZA" decoding="async"/></div>
        <span>2K{String(currentYear).slice(-2)}</span>
      </div>
      <header className="artist-stage-heading"><div className="artist-stage-title-plaque"><span>LIVE ON STAGE</span><h2 id={`${id}-heading`}>OUR ARTISTS</h2></div></header>
      {loading ? <div className="artist-concert-screens artist-stage-loading" role="status"><div className="artist-stage-photo"/><span>Setting the stage…</span></div> : active ? <>
        <div className="artist-concert-screens" aria-label="Artist showcase" aria-roledescription="carousel">
          <ArtistPeek artist={previous} side="previous" onSelect={selectArtist}/>
          <ArtistPeek artist={next} side="next" onSelect={selectArtist}/>
          <ArtistStageVisual key={`${year}-${active.id}-${active.stage_media_mode}-${artistPhotos(active).join('|')}-${artistStageClips(active).join('|')}-${active.desktop_gallery_images?.join('|')}-${active.desktop_stage_clip_urls?.join('|')}-${active.detail_music_url}`} artist={active} suspended={!visible || paused || !!localDetails} motionPaused={motionPaused} onDetails={openDetails} beatSync={configuration.beat_sync}/>

        <button type="button" className="artist-concert-arrow artist-concert-arrow-left" onClick={() => move(-1)} disabled={lineup.length < 2} aria-label="Previous artist"><svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="27"/><path d="M34 20L24 30L34 40"/></svg></button>
        <button type="button" className="artist-concert-arrow artist-concert-arrow-right" onClick={() => move(1)} disabled={lineup.length < 2} aria-label="Next artist"><svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="27"/><path d="M26 20L36 30L26 40"/></svg></button>
        </div>
        <div className="artist-concert-dots" role="group" aria-label="Choose an artist">{lineup.map((artist,index)=><button key={artist.id} type="button" aria-label={`Show artist ${index+1}: ${artist.name}`} aria-pressed={artist.id===active.id} onClick={()=>selectArtist(artist)}/>)}</div>
      </> : <div className="artist-concert-screens artist-stage-empty" aria-label="Artist media coming soon">
        <ArtistPeek side="previous" onSelect={selectArtist}/><ArtistPeek side="next" onSelect={selectArtist}/>
        <div className="artist-stage-photo artist-stage-reveal" role="status"><span>THE STAGE IS SET</span><strong>Artist reveals<br/>coming soon</strong><small>{year} LINEUP</small></div>
      </div>}
      <ConcertInfo date={configuration.date_label} venue={configuration.venue_label}/>
    </div>
    <div className="artist-stage-inner">
      <div className="artist-stage-motion"><button type="button" aria-pressed={motionPaused} onClick={()=>setMotionPaused(!motionPaused)}>{motionPaused?<PlayIcon/>:<PauseIcon/>}{motionPaused?'Resume motion':'Pause motion'}</button></div>
      <div className="artist-stage-year-bar"><span><i/>{year === currentYear ? 'THIS YEAR’S LINEUP' : 'FROM THE ARCHIVES'}</span><div className="artist-stage-years" role="group" aria-label="Artist festival year">{years.map(value => <button type="button" key={value} aria-pressed={year === value} onClick={() => {stopMedia(); setYear(value); setSelected(null);}}>{value === currentYear ? `This year · ${value}` : value}<span>{artists.filter(artist => artist.enabled && getArtistFestivalYear(artist, currentYear) === value).length || '—'}</span></button>)}</div></div>
      {!active && !loading && <div className="artist-stage-empty-note"><p>{year === currentYear ? `The ${year} lineup will be announced soon. Artist photos and short clips will appear on this screen. Tap More details to discover their videos and music.` : `Artist videos, photos and music from ${year} will appear here.`}</p>{year === currentYear && artists.some(artist => artist.enabled && years.includes(getArtistFestivalYear(artist,currentYear)) && getArtistFestivalYear(artist, currentYear) < currentYear) && <button type="button" onClick={() => setYear(Math.max(...artists.filter(artist => artist.enabled && years.includes(getArtistFestivalYear(artist,currentYear)) && getArtistFestivalYear(artist, currentYear) < currentYear).map(artist => getArtistFestivalYear(artist, currentYear))))}>Meet our past artists<ArrowRightIcon/></button>}</div>}
      {active && !loading && <>

        <div className="artist-stage-lineup"><div className="artist-stage-lineup-label"><span>{year === currentYear ? 'THE LINEUP' : 'PAST ARTISTS'}</span><small>{String(activeIndex + 1).padStart(2, '0')} / {String(lineup.length).padStart(2, '0')}</small></div><div className="artist-stage-roster" role="group" aria-label={`${year} artist lineup`}>{lineup.map((artist, index) => <button type="button" key={artist.id} id={`artist-${artist.id}`} onClick={() => selectArtist(artist)} aria-pressed={artist.id === active.id}><ArtistStageImage src={artist.image} alt=""/><span><small>{getArtistKind(artist)==='band'?'BAND':getArtistKind(artist)==='dj'?'DJ':'ARTIST'} {String(index + 1).padStart(2, '0')}</small><strong>{artist.name}</strong><em>{artist.title}</em></span><ArrowRightIcon/></button>)}</div></div>
      </>}
      {demo && <div className="artist-stage-demo-notice"><span>DESIGN PREVIEW</span>Fictional artists · sample photos, instrumental & video</div>}
    </div>
    {localDetails&&<Suspense fallback={<div role="status" className="artist-stage-opening-profile">Opening artist details…</div>}><ArtistDetails isOpen artist={localDetails} onClose={()=>setLocalDetails(null)}/></Suspense>}
  </section>;
}

function ConcertInfo({date,venue}:{date:string;venue:string}) {
 return <footer className="artist-concert-info" aria-label="Festival information"><span><CalendarIcon/><strong title={date}>{date}</strong></span><span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></svg><strong title={venue}>{venue}</strong></span></footer>;
}
