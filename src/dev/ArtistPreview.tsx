import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import {ArtistAudioMonitor} from './ArtistAudioMonitor';
import ArtistStage from '../components/Home/ArtistStage';
import ArtistDraftPreview from '../components/admin/ArtistDraftPreview';
import '../styles/ArtistStudio.css';
import { createArtistDemo } from '../data/artistDemo';
import { BRAND_YEAR } from '../constants/brand';

function Preview() {
  const params = new URLSearchParams(window.location.search);
  const canvas = params.has('canvas');
  const [empty, setEmpty] = useState(false);
  const [shortClips,setShortClips]=useState(params.has('clips'));
  const [viewport, setViewport] = useState(Number(params.get('width')) || 1672);
  const [available, setAvailable] = useState(window.innerWidth - 32);
  const [frameHeight, setFrameHeight] = useState(1600);
  const [metrics, setMetrics] = useState({width: viewport, overflow: false});
  const wrapper = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const frameObserver = useRef<ResizeObserver>();
  const year = Number(BRAND_YEAR);
  const artists = useMemo(() => createArtistDemo(year).map(artist=>shortClips?{...artist,stage_media_mode:'clips' as const,stage_clip_urls:['/media/cinematic/ricorrenza-mobile-v2.mp4'],desktop_stage_clip_urls:['/media/cinematic/ricorrenza-desktop-v2.mp4']}:artist), [year,shortClips]);
  const [draft,setDraft]=useState(()=>createArtistDemo(year)[1]);
  const onlyPast = empty || params.has('empty');
  const scale = Math.min(1, Math.max(260, available) / viewport);
  useEffect(() => {
    const resize = new ResizeObserver(entries => setAvailable(entries[0].contentRect.width));
    if (wrapper.current) resize.observe(wrapper.current);
    return () => {resize.disconnect(); frameObserver.current?.disconnect();};
  }, []);
  const measure = () => {
    const document = frame.current?.contentDocument;
    const window = frame.current?.contentWindow;
    if (!document || !window) return;
    const update = () => {
      setFrameHeight(Math.max(1000, document.body.scrollHeight));
      setMetrics({width:window.innerWidth,overflow:document.documentElement.scrollWidth > window.innerWidth + 1});
    };
    frameObserver.current?.disconnect();
    frameObserver.current = new ResizeObserver(update);
    frameObserver.current.observe(document.body);
    update();
  };
  if(params.has('draftPreview')&&canvas)return <main className="artist-ui" style={{maxWidth:1100,margin:'24px auto',padding:20,borderRadius:18,background:'#f5f8f8'}}><header style={{marginBottom:20}}><h1 style={{fontSize:24}}>Artist editor · draft preview</h1><p>Local sample only. These controls do not save or upload anything.</p></header><div className="artist-editor-body" data-mobile-view="preview" style={{overflow:'visible'}}><div className="artist-editor-scroll"><div className="artist-field"><label htmlFor="draft-name">Artist name</label><input id="draft-name" value={draft.name} onChange={event=>setDraft({...draft,name:event.target.value})}/></div><div className="artist-field" style={{marginTop:20}}><label htmlFor="draft-bio">Full artist story</label><textarea id="draft-bio" rows={8} value={draft.description} onChange={event=>setDraft({...draft,description:event.target.value})}/></div></div><aside className="artist-live-preview" aria-label="Artist live preview"><ArtistDraftPreview artist={draft} busy={false}/></aside></div></main>;
  if (canvas) return <>{params.has('audioDebug')&&<ArtistAudioMonitor relay/>}<ArtistStage artists={onlyPast ? artists.filter(artist => artist.festival_year !== year) : artists} demo currentYear={year}/></>;
  return <>
    {params.has('audioDebug')&&<ArtistAudioMonitor/>}
    <header style={{padding:'18px 20px',display:'flex',gap:14,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',borderBottom:'1px solid #53613e',color:'#e2d3ae',fontFamily:'Geist Variable,sans-serif',fontSize:11}}>
      <span style={{letterSpacing:2}}>RICORRENZA / STAGE PREVIEW</span>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button style={buttonStyle} onClick={()=>setShortClips(!shortClips)}>{shortClips?'Show photo slideshow':'Preview clips (sample footage)'}</button><button style={buttonStyle} onClick={() => setEmpty(!empty)}>{empty ? 'Show this year’s lineup' : 'Preview unannounced lineup'}</button><button style={buttonStyle} onClick={() => setViewport(viewport < 768 ? 1672 : 390)}>{viewport < 768 ? 'Desktop view' : 'Phone view'}</button></div>
      <div style={{display:'flex',width:'100%',gap:7,alignItems:'center',flexWrap:'wrap'}}>{[320,375,390,430,1672,2560].map(width => <button key={width} style={{...buttonStyle,borderColor:viewport === width ? '#e5bb74' : '#514c36',color:viewport === width ? '#ffe8b9' : '#a3ad96'}} aria-pressed={viewport === width} onClick={() => setViewport(width)}>{width}px</button>)}<output aria-label="Preview viewport measurement" style={{marginLeft:'auto',fontSize:9,color:metrics.overflow?'#e2a58e':'#a5be93'}}>{metrics.width}px · {metrics.overflow ? 'Horizontal overflow' : 'Fits viewport'}</output></div>
    </header>
    <div ref={wrapper} style={{margin:'20px 16px',display:'flex',justifyContent:'center'}}><div style={{position:'relative',width:viewport*scale,height:frameHeight*scale,flexShrink:0}}><iframe key={`${viewport}-${empty}-${shortClips}`} ref={frame} onLoad={measure} title={viewport < 768 ? 'Phone artist stage preview' : 'Desktop artist stage preview'} src={`/artists-preview.html?canvas=1${params.has('draftPreview')?'&draftPreview=1':''}${empty ? '&empty=1' : ''}${shortClips?'&clips=1':''}${params.has('audioDebug')?'&audioDebug=1':''}`} style={{position:'absolute',top:0,left:0,width:viewport,maxWidth:'none',height:frameHeight,border:'1px solid #71623d',borderRadius:viewport < 768 ? 18 : 2,background:'#040c0a',transform:`scale(${scale})`,transformOrigin:'top left'}}/></div></div>
  </>;
}
const buttonStyle = {background:'#131d13',color:'#e2d3ae',border:'1px solid #71623d',borderRadius:3,padding:'9px 12px',fontSize:10,cursor:'pointer'};
createRoot(document.getElementById('root')!).render(<StrictMode><Preview/></StrictMode>);
