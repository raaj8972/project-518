import {useEffect,type RefObject} from 'react';
import {ArtistBeatDetector,artistBassEnergy,artistOutputDelay,type ArtistBeatFrame} from '../utils/artistBeat';
export {artistBassEnergy} from '../utils/artistBeat';
let context:AudioContext|null=null;
const graphs=new WeakMap<HTMLMediaElement,{source:MediaElementAudioSourceNode;analyser:AnalyserNode}>();

export function prepareArtistAudio(){
  const Constructor=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!Constructor)return;
  try{context ||= new Constructor({latencyHint:'interactive'});void context.resume().catch(()=>{});}catch{/* Native audio can still play without analysis. */}
}

export function useArtistAudioBeat(ref:RefObject<HTMLAudioElement>,enabled=true){
  useEffect(()=>{
    const media=ref.current;if(!media||!enabled)return;
    let frame=0,active=false,generation=0;
    const detector=new ArtistBeatDetector();
    const pending:Array<{at:number;value:ArtistBeatFrame}>=[];
    const emit=(value:ArtistBeatFrame)=>window.dispatchEvent(new CustomEvent('rico:artist-energy',{detail:value}));
    const stop=()=>{
      generation++;active=false;window.cancelAnimationFrame?.(frame);pending.length=0;detector.reset();
      emit({active:false,energy:0,pulse:0,level:0,beat:false});
    };
    const start=()=>{
      stop();
      if(document.hidden||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
      prepareArtistAudio();if(!context)return;
      const current=context,run=generation;
      try{
        let graph=graphs.get(media);
        if(!graph){graph={source:current.createMediaElementSource(media),analyser:current.createAnalyser()};graphs.set(media,graph);}
        const {source,analyser}=graph;
        analyser.fftSize=1024;analyser.minDecibels=-85;analyser.maxDecibels=-10;analyser.smoothingTimeConstant=.12;
        source.disconnect();analyser.disconnect();source.connect(analyser);analyser.connect(current.destination);
        const frequencies=new Uint8Array(analyser.frequencyBinCount),waveform=new Float32Array(analyser.fftSize);
        active=true;let previous=-Infinity;
        emit({active:true,energy:0,pulse:0,level:0,beat:false});
        const tick=(time:number)=>{
          if(!active||run!==generation)return;
          if(current.state==='running'&&time-previous>=16){
            analyser.getByteFrequencyData(frequencies);analyser.getFloatTimeDomainData(waveform);
            let squares=0;for(const value of waveform)squares+=value*value;
            const value=detector.sample(artistBassEnergy(frequencies,current.sampleRate,analyser.fftSize),Math.sqrt(squares/waveform.length),time);
            pending.push({at:time+artistOutputDelay(current,time),value});previous=time;
          }
          // Preserve onsets even when several queued frames become audible together.
          let latest:ArtistBeatFrame|undefined,beat=false;
          while(pending[0]?.at<=time){latest=pending.shift()!.value;beat ||= latest.beat;}
          if(latest)emit({...latest,beat});
          frame=requestAnimationFrame(tick);
        };
        frame=requestAnimationFrame(tick);
      }catch{stop();}
    };
    const resumeAfterSeek=()=>{if(!media.paused)start();};
    const visibility=()=>{if(document.hidden)stop();else if(!media.paused)start();};
    media.addEventListener('play',start);media.addEventListener('pause',stop);media.addEventListener('ended',stop);
    media.addEventListener('waiting',stop);media.addEventListener('seeking',stop);media.addEventListener('playing',start);media.addEventListener('seeked',resumeAfterSeek);
    document.addEventListener('visibilitychange',visibility);
    if(!media.paused)start();
    return()=>{
      stop();const graph=graphs.get(media);graph?.source.disconnect();graph?.analyser.disconnect();
      if(graph&&context)graph.source.connect(context.destination);
      media.removeEventListener('play',start);media.removeEventListener('pause',stop);media.removeEventListener('ended',stop);
      media.removeEventListener('waiting',stop);media.removeEventListener('seeking',stop);media.removeEventListener('playing',start);media.removeEventListener('seeked',resumeAfterSeek);
      document.removeEventListener('visibilitychange',visibility);
    };
  },[ref,enabled]);
}
