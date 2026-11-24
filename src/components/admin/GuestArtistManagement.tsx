import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlusIcon, Pencil2Icon, TrashIcon, StarIcon, EyeOpenIcon, EyeNoneIcon, MagnifyingGlassIcon, Cross2Icon, ArrowRightIcon, CalendarIcon, MixIcon, CheckCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useData } from '../../context/DataContext';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { GuestArtistForm } from './GuestArtistForm';
import '../../styles/ArtistStudio.css';
import { BRAND_YEAR } from '../../constants/brand';
import { getArtistFestivalYear } from '../../utils/guestArtists';
import { getArtistKind, artistStageClips } from '../../utils/artistMedia';
import ArtistStageSettingsForm from './ArtistStageSettingsForm';
import { createArtistDemo } from '../../data/artistDemo';
const ArtistStage=lazy(()=>import('../Home/ArtistStage'));


type Filter='all'|'visible'|'hidden';
export function GuestArtistManagement(){
 const {homepageSettings,updateHomepageSettings,guestArtists,addGuestArtist,updateGuestArtist,deleteGuestArtist,toggleGuestArtistEnabled}=useData();
 const progress=useSavingProgress();const {submitForApproval,checkRequiresApproval}=useApprovals();
 const [accessFailed,setAccessFailed]=useState(false);
 const [requiresApproval,setRequiresApproval]=useState(false);const [checkingAccess,setCheckingAccess]=useState(true);
 const [isAdding,setIsAdding]=useState(false);const [editingId,setEditingId]=useState<number|null>(null);const [isSubmitting,setIsSubmitting]=useState(false);const [mediaBusy,setMediaBusy]=useState(false);
 const [query,setQuery]=useState('');const [yearFilter,setYearFilter]=useState('all');const [preview,setPreview]=useState<'closed'|'live'|'demo'>('closed');const currentYear=Number(homepageSettings?.brand_year)||Number(BRAND_YEAR);const demoArtists=useMemo(()=>createArtistDemo(currentYear),[currentYear]);const [filter,setFilter]=useState<Filter>('all');const [feedback,setFeedback]=useState<{error:boolean;text:string}|null>(null);const [saveError,setSaveError]=useState('');const [rowBusy,setRowBusy]=useState<number|null>(null);
 const saving=useRef(false);const rowPending=useRef(false);const dialog=useRef<HTMLDialogElement>(null);const returnFocus=useRef<HTMLElement|null>(null);const modalOpen=isAdding||editingId!==null;const busy=isSubmitting||mediaBusy;
 useBodyScrollLock(modalOpen);
 useEffect(()=>{let active=true;checkRequiresApproval().then(value=>{if(active)setRequiresApproval(value);}).catch(()=>{if(active){setAccessFailed(true);setFeedback({error:true,text:'Artist permissions could not load. Refresh this page to retry.'});}}).finally(()=>{if(active)setCheckingAccess(false);});return()=>{active=false;};},[]);
 const locked=checkingAccess||accessFailed;
 useEffect(()=>{
  if(!modalOpen)return;const element=dialog.current;const previous=returnFocus.current;
  if(element){if(typeof element.showModal==='function')element.showModal();else element.setAttribute('open','');}
  return()=>{if(element?.open)element.close();previous?.focus();};
 },[modalOpen]);
 const close=()=>{if(busy||saving.current)return;setIsAdding(false);setEditingId(null);setSaveError('');};
 const add=()=>{returnFocus.current=document.activeElement as HTMLElement|null;setSaveError('');setEditingId(null);setIsAdding(true);};
 const save=async(data:any)=>{
  if(saving.current||locked||mediaBusy)return;saving.current=true;setIsSubmitting(true);setSaveError('');
  try{
   progress.withSteps(1,'Saving artist…');
   data={...data,is_featured:true};
   if(requiresApproval){const result=await submitForApproval('guest_artist',editingId!==null?'update':'create',data,editingId??undefined);if(!result.success)throw new Error(result.error||'Could not submit the artist for review.');}
   else if(editingId!==null)await updateGuestArtist(editingId,data);else await addGuestArtist(data);
   setIsAdding(false);setEditingId(null);setFeedback({error:false,text:requiresApproval?'Artist submitted for owner review.':'Artist saved. Your lineup is updated.'});
  }catch(error){setSaveError(error instanceof Error?error.message:'Could not save this artist. Your edits are kept.');}
  finally{saving.current=false;setIsSubmitting(false);progress.done();}
 };
 const action=async(id:number,kind:'delete'|'enabled')=>{
  if(rowPending.current||locked)return;const artist=guestArtists.find(item=>item.id===id);if(!artist)return;
  if(kind==='delete'&&!window.confirm(`Delete ${artist.name} from the lineup?`))return;
  rowPending.current=true;setRowBusy(id);setFeedback(null);
  try{
   progress.withSteps(1,'Updating artist…');
   if(requiresApproval){const patch=kind==='delete'?{}:{enabled:!artist.enabled,is_featured:true};const result=await submitForApproval('guest_artist',kind==='delete'?'delete':'update',patch,id);if(!result.success)throw new Error(result.error||'Could not submit this change for review.');}
   else if(kind==='delete')await deleteGuestArtist(id);else await toggleGuestArtistEnabled(id);
   setFeedback({error:false,text:requiresApproval?'Change submitted for owner review.':kind==='delete'?'Artist removed from the lineup.':'Artist visibility updated.'});
  }catch(error){setFeedback({error:true,text:error instanceof Error?error.message:'Could not update this artist. Please retry.'});}
  finally{rowPending.current=false;setRowBusy(null);progress.done();}
 };
 const sorted=[...guestArtists].sort((a,b)=>Number(a.order_position||0)-Number(b.order_position||0));const search=query.trim().toLowerCase();
 const artists=sorted.filter(artist=>(yearFilter==='all'||getArtistFestivalYear(artist,currentYear)===Number(yearFilter))&&(filter==='all'||filter==='visible'&&artist.enabled||filter==='hidden'&&!artist.enabled)&&`${artist.name} ${artist.title} ${artist.specialty}`.toLowerCase().includes(search));
 const editingArtist=editingId!==null?guestArtists.find(artist=>artist.id===editingId):null;
 return <section className="artist-ui artist-studio" aria-label="Artist lineup workspace">
  <header className="artist-page-heading"><div><span className="artist-eyebrow">PEOPLE ON STAGE</span><h2>Artist lineup<span>.</span></h2><p>One stage. Every edition. Set the artists, photos and sounds your visitors will discover.</p></div><div className="artist-heading-actions"><button type="button" className="artist-button artist-button-quiet" onClick={()=>setPreview(preview==='closed'?'demo':'closed')}>{preview==='closed'?'Preview stage':'Close preview'}</button><button type="button" className="artist-button artist-button-primary" onClick={add}><PlusIcon/>Add artist</button></div></header>
  <ArtistStageSettingsForm value={homepageSettings?.artist_stage_settings} currentYear={currentYear} artists={guestArtists} disabled={locked} onSave={async settings=>{if(requiresApproval){const result=await submitForApproval('homepage_setting','update',{artist_stage_settings:settings},1);if(!result.success)throw new Error(result.error||'Could not submit stage settings for review.');}else await updateHomepageSettings({artist_stage_settings:settings});}}/>
  <div className="artist-edition-guide"><CalendarIcon/><div><strong>This year, and the nights before.</strong><span>Select a festival year for every artist. Current artists appear first; previous editions stay in the archive.</span></div><span>{currentYear} EDITION</span></div>
  {preview!=='closed'&&<section className="artist-admin-stage-preview" aria-label="Homepage stage preview"><header><div><strong>See your stage</strong><small>Try the year tabs, photo slideshow, music and video.</small></div><div role="group" aria-label="Stage preview data"><button type="button" aria-pressed={preview==='demo'} onClick={()=>setPreview('demo')}>Sample lineup</button><button type="button" aria-pressed={preview==='live'} onClick={()=>setPreview('live')}>Saved artists</button></div></header><Suspense fallback={<p>Preparing stage preview…</p>}><ArtistStage settings={homepageSettings?.artist_stage_settings} artists={preview==='demo'?demoArtists:guestArtists} currentYear={currentYear} demo={preview==='demo'}/></Suspense></section>}
  <div className="artist-lineup-summary"><span><strong>{guestArtists.length}</strong>Artists</span><span><strong>{guestArtists.filter(artist=>artist.enabled).length}</strong>Public profiles</span><span><strong>{guestArtists.filter(artist=>artist.enabled&&getArtistFestivalYear(artist,currentYear)===currentYear).length}</strong>This year</span><small><span/>Published artists appear in their festival year</small></div>
  {feedback&&<div className={`artist-feedback${feedback.error?'':' is-success'}`} role={feedback.error?'alert':'status'}>{feedback.error?<ExclamationTriangleIcon/>:<CheckCircledIcon/>}<span>{feedback.text}</span><button type="button" aria-label="Dismiss artist message" onClick={()=>setFeedback(null)}><Cross2Icon/></button></div>}
  {guestArtists.length>0?<>
   <div className="artist-roster-toolbar"><label className="artist-year-filter">Festival year<select aria-label="Filter by festival year" value={yearFilter} onChange={event=>setYearFilter(event.target.value)}><option value="all">All editions</option>{[...new Set([currentYear,currentYear-1,currentYear-2,...guestArtists.map(artist=>getArtistFestivalYear(artist,currentYear))])].sort((a,b)=>b-a).map(year=><option key={year} value={year}>{year}{year===currentYear?' · This year':' · Past artists'}</option>)}</select></label><div className="artist-filter-group" role="group" aria-label="Filter artists">{(['all','visible','hidden'] as const).map(value=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value==='all'?'All artists':value==='visible'?'On homepage':'Hidden'}</button>)}</div><label className="artist-search"><MagnifyingGlassIcon/><input type="search" aria-label="Search artists" placeholder="Find an artist or genre…" value={query} onChange={event=>setQuery(event.target.value)}/></label></div>
   <div className="artist-roster">{artists.map(artist=><article className="artist-roster-card" key={artist.id}><div className="artist-roster-portrait">{artist.image?<img src={artist.image} alt={artist.name}/>:<div className="artist-poster-placeholder"><strong>LIVE<br/>ON STAGE.</strong></div>}<span>{String(artist.order_position||1).padStart(2,'0')}</span></div><div className="artist-roster-info"><div className="artist-roster-status"><span className="artist-kind-badge">{getArtistKind(artist).toUpperCase()}</span><b className="artist-year-badge">{getArtistFestivalYear(artist,currentYear)}</b><span className={artist.enabled?'is-public':''}>{artist.enabled?'Public':'Hidden'}</span>{artist.enabled&&<span><StarIcon/>{getArtistFestivalYear(artist,currentYear)===currentYear?'This year':'Past artist'}</span>}</div><h3>{artist.name}</h3><p>{artist.title}</p><small>{artist.specialty}</small><div className="artist-roster-media"><span>{artist.stage_media_mode==='clips'?`${artistStageClips(artist).length} clips`:`${artist.gallery_images?.filter(Boolean).length||1} photos`}</span><span>{artist.detail_music_url?'Song ready':'No song yet'}</span><span>{artist.youtube_url||artist.video_url?'Video ready':'No video yet'}</span></div>{artist.performance_at&&<div className="artist-performance"><CalendarIcon/>{new Date(artist.performance_at).toLocaleDateString(undefined,{day:'numeric',month:'short'})}{artist.venue&&` · ${artist.venue}`}</div>}<div className="artist-card-actions"><button type="button" className="artist-edit-button" onClick={()=>{returnFocus.current=document.activeElement as HTMLElement|null;setSaveError('');setIsAdding(false);setEditingId(artist.id);}}><Pencil2Icon/>Edit profile</button><button type="button" className="artist-icon-button" disabled={rowBusy!==null||locked} aria-label={`${artist.enabled?'Hide':'Show'} ${artist.name}`} aria-pressed={artist.enabled} onClick={()=>void action(artist.id,'enabled')}>{artist.enabled?<EyeOpenIcon/>:<EyeNoneIcon/>}</button><button type="button" className="artist-icon-button artist-delete" disabled={rowBusy!==null||locked} aria-label={`Delete ${artist.name}`} onClick={()=>void action(artist.id,'delete')}><TrashIcon/></button></div></div></article>)}</div>
   {!artists.length&&<div className="artist-no-results"><MagnifyingGlassIcon/><h3>No artists match this view</h3><p>Try a different name or clear the filters.</p><button type="button" className="artist-text-button" onClick={()=>{setQuery('');setFilter('all');setYearFilter('all');}}>Clear search & filters</button></div>}
  </>:<div className="artist-empty"><div className="artist-empty-poster" aria-hidden="true"><span>YOUR FESTIVAL / ON STAGE</span><strong>THE<br/>LINEUP<br/>STARTS<br/>HERE.</strong><div className="artist-stage-bars">{Array.from({length:12},(_,index)=><i key={index} style={{height:`${24+(index*17)%65}%`}}/>)}</div><small>Artist announcements coming soon</small></div><div className="artist-empty-content"><span className="artist-eyebrow">READY FOR YOUR FIRST ARTIST</span><h3>Give your lineup<br/>a face.</h3><p>Add a profile once. Its portrait, bio and performance details stay together here.</p><ol><li><span>01</span><div><strong>Introduce the artist</strong><small>Name, role and a short bio</small></div></li><li><span>02</span><div><strong>Add the visual</strong><small>Portrait, poster or performance clip</small></div></li><li><span>03</span><div><strong>Set the performance</strong><small>Date and venue, when you’re ready</small></div></li></ol><button type="button" className="artist-button artist-button-primary" onClick={add}>Create artist profile<ArrowRightIcon/></button><small>Only artist details and a portrait are required.</small></div></div>}
  {modalOpen&&createPortal(<dialog ref={dialog} className="artist-ui artist-dialog" aria-labelledby="artist-dialog-title" onCancel={event=>{event.preventDefault();close();}} onClick={event=>{if(event.target===event.currentTarget)close();}}><div className="artist-dialog-shell"><header className="artist-dialog-header"><div className="artist-dialog-mark"><MixIcon/></div><div><span className="artist-eyebrow">{isAdding?'ADD TO THE LINEUP':'UPDATE ARTIST PROFILE'}</span><h2 id="artist-dialog-title">{isAdding?'Create an artist':editingArtist?.name||'Edit artist'}</h2></div><button type="button" className="artist-icon-button" aria-label="Close artist editor" disabled={busy} onClick={close}><Cross2Icon/></button></header><GuestArtistForm key={editingId??'new'} initialData={editingArtist} onSubmit={save} onCancel={close} isSubmitting={isSubmitting||locked} onProcessingChange={setMediaBusy} submitError={saveError}/></div></dialog>,document.body)}
 </section>;
}
