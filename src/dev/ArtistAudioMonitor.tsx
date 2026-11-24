import {useEffect,useState} from 'react';
import type {ArtistBeatFrame} from '../utils/artistBeat';

/** Local preview diagnostics; this entry is excluded from production. */
export function ArtistAudioMonitor({relay=false}:{relay?:boolean}){
 const [signal,setSignal]=useState({active:false,level:0,pulse:0,beats:0});
 useEffect(()=>{
  let beats=0,last=0;
  const audio=(event:Event)=>{
   const value=(event as CustomEvent<ArtistBeatFrame>).detail;
   if(!value?.active)beats=0;else if(value.beat)beats++;
   const now=performance.now();
   if(now-last<100&&value.active&&!value.beat)return;
   last=now;window.parent.postMessage({type:'rico-audio-diagnostics',...value,beats},window.location.origin);
  };
  const message=(event:MessageEvent)=>{if(event.origin===window.location.origin&&event.data?.type==='rico-audio-diagnostics')setSignal(event.data);};
  if(relay)window.addEventListener('rico:artist-energy',audio);else window.addEventListener('message',message);
  return()=>{window.removeEventListener('rico:artist-energy',audio);window.removeEventListener('message',message);};
 },[relay]);
 if(relay)return null;
 return <output aria-label="Audio sync diagnostics" style={{position:'fixed',bottom:12,left:12,zIndex:3000,padding:'12px 16px',border:'1px solid #9a8a55',borderRadius:5,color:'#e5d3a4',background:'#08120ef5',font:'12px Arial,sans-serif',pointerEvents:'none'}}>Audio {signal.active?'playing':'stopped'} · Beats {signal.beats} · Signal {Math.round(signal.level*100)}% · Pulse {Math.round(signal.pulse*100)}%</output>;
}
