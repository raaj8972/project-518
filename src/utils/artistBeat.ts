export interface ArtistBeatFrame {
  active: boolean;
  energy: number;
  pulse: number;
  level: number;
  beat: boolean;
}
const clamp = (value:number) => Math.min(1,Math.max(0,value));

/** Average bass-bin power, with the band measured in Hz for the actual device rate. */
export function artistBassEnergy(values:Uint8Array,sampleRate=48000,fftSize=1024):number {
  const first=Math.max(1,Math.ceil(35*fftSize/sampleRate));
  const last=Math.min(values.length-1,Math.floor(230*fftSize/sampleRate));
  let sum=0;
  for(let index=first;index<=last;index++)sum+=(values[index]/255)**2;
  return last>=first?clamp(sum/(last-first+1)):0;
}

/** Detect new bass attacks; a held note is not a stream of artificial beats. */
export class ArtistBeatDetector {
  private average=0;
  private deviation=.015;
  private previousBass=0;
  private previousTime:number|null=null;
  private lastBeat=-Infinity;
  private envelope=0;

  reset(){
    this.average=0;this.deviation=.015;this.previousBass=0;
    this.previousTime=null;this.lastBeat=-Infinity;this.envelope=0;
  }

  sample(bass:number,rms:number,time:number):ArtistBeatFrame {
    bass=clamp(bass);
    const elapsed=this.previousTime===null?16:Math.min(100,Math.max(1,time-this.previousTime));
    const rise=Math.max(0,bass-this.previousBass);
    const excess=bass-this.average;
    const audible=Number.isFinite(rms)&&rms>.0015;
    const beat=audible&&bass>.035&&rise>.018&&excess>Math.max(.025,this.deviation*1.1)&&time-this.lastBeat>=250;
    if(beat){this.lastBeat=time;this.envelope=1;}
    else this.envelope*=Math.exp(-elapsed/135);
    const adaptation=1-Math.exp(-elapsed/650);
    this.deviation+=adaptation*(Math.abs(excess)-this.deviation);
    this.average+=adaptation*excess;
    this.previousBass=bass;this.previousTime=time;
    const level=audible?clamp((20*Math.log10(rms)+60)/48):0;
    const attack=audible?clamp(excess/Math.max(.08,this.deviation*3)):0;
    const pulse=audible?Math.max(this.envelope,attack*.3):0;
    return {active:true,level,pulse,beat,energy:audible?clamp(pulse*.9+level*.1):0};
  }
}

/** Map the analysed frame to when those samples reach the speakers. */
export function artistOutputDelay(context:{currentTime:number;baseLatency?:number;outputLatency?:number;getOutputTimestamp?:()=>{contextTime?:number;performanceTime?:number}},now:number):number {
  try {
    const stamp=context.getOutputTimestamp?.();
    if(stamp&&Number.isFinite(stamp.contextTime)&&Number.isFinite(stamp.performanceTime)&&stamp.performanceTime!>0){
      return Math.min(180,Math.max(0,stamp.performanceTime!+(context.currentTime-stamp.contextTime!)*1000-now));
    }
  }catch{/* Older audio devices may not report output timestamps. */}
  return Math.min(180,Math.max(0,((context.baseLatency||0)+(context.outputLatency||0))*1000));
}
