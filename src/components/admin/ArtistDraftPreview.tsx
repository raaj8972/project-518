import {useState} from 'react';
import type {GuestArtist} from '../../types/data';
import ArtistStageVisual from '../Home/ArtistStageVisual';
import GuestArtistDetailModal from '../GuestArtistDetailModal';
import {artistPhotos,artistStageClips} from '../../utils/artistMedia';
import '../../styles/ArtistStage.css';
import '../../styles/ArtistRecordCard.css';

/** Uses the public components with the unsaved form draft. Never publishes data. */
export default function ArtistDraftPreview({artist,busy}:{artist:GuestArtist;busy:boolean}){
 const [view,setView]=useState<'card'|'about'>('card');
 const [viewport,setViewport]=useState<'phone'|'desktop'>('phone');
 const [motion,setMotion]=useState(true);
 const mediaKey=[viewport,artist.stage_media_mode,artistPhotos(artist).join('|'),artistStageClips(artist).join('|'),artist.desktop_gallery_images?.join('|'),artist.desktop_stage_clip_urls?.join('|'),artist.detail_music_url].join('-');
 return <>
  <div className="artist-draft-preview-controls">
   <div role="group" aria-label="Live preview content"><button type="button" aria-pressed={view==='card'} onClick={()=>setView('card')}>Card preview</button><button type="button" aria-pressed={view==='about'} onClick={()=>setView('about')}>About preview</button></div>
   {view==='card'&&<div role="group" aria-label="Preview media format"><button type="button" aria-pressed={viewport==='phone'} onClick={()=>setViewport('phone')}>Phone media</button><button type="button" aria-pressed={viewport==='desktop'} onClick={()=>setViewport('desktop')}>Desktop media</button></div>}
  </div>
  <p className="artist-draft-visibility">{artist.enabled?'Will appear in the public lineup after saving.':'Hidden profile · this preview is only for you.'}</p>
  {view==='card'?<>
   <div className="artist-stage artist-draft-stage" data-artist-kind={artist.artist_kind} data-preview-viewport={viewport}>
    <div className="artist-concert-screens"><ArtistStageVisual key={mediaKey} artist={artist} viewport={viewport} suspended={busy} motionPaused={!motion} beatSync={false} onDetails={()=>setView('about')}/></div>
   </div>
   <button type="button" className="artist-draft-motion" aria-pressed={!motion} onClick={()=>setMotion(!motion)}>{motion?'Pause preview motion':'Resume preview motion'}</button>
  </>:<GuestArtistDetailModal inline isOpen artist={artist} onClose={()=>setView('card')}/>}
 </>;
}
