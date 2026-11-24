import {readFile} from 'node:fs/promises';
import {expect,it} from 'vitest';
import {ArtistBeatDetector,artistBassEnergy,artistOutputDelay} from '../src/utils/artistBeat';
it('flashes on a new bass attack and lets the pulse decay during a sustained note',()=>{
 const detector=new ArtistBeatDetector();const attack=detector.sample(.6,.1,0);expect(attack.beat).toBe(true);expect(attack.pulse).toBe(1);
 let last=attack;for(let time=16;time<=800;time+=16){last=detector.sample(.6,.1,time);expect(last.beat).toBe(false);}expect(last.energy).toBeLessThan(.2);
 detector.sample(.01,.01,1000);const next=detector.sample(.75,.15,1100);expect(next.beat).toBe(true);expect(next.energy).toBeGreaterThan(.9);
});
it('does not invent beats during silence and clears a previous pulse',()=>{const detector=new ArtistBeatDetector();detector.sample(.7,.1,0);const quiet=detector.sample(0,0,100);expect(quiet).toMatchObject({energy:0,pulse:0,beat:false,level:0});});
it('measures the same bass band at different device sample rates',()=>{
 for(const rate of [22050,44100,48000]){const bins=new Uint8Array(512);bins[Math.round(100*1024/rate)]=255;expect(artistBassEnergy(bins,rate,1024)).toBeGreaterThan(0);const high=new Uint8Array(512);high[Math.round(2000*1024/rate)]=255;expect(artistBassEnergy(high,rate,1024)).toBe(0);}
});
it('accounts for when analysed samples reach the speakers',()=>{
 expect(artistOutputDelay({currentTime:1.08,getOutputTimestamp:()=>({contextTime:1,performanceTime:990})},1000)).toBeCloseTo(70);
 expect(artistOutputDelay({currentTime:1,baseLatency:.015,outputLatency:.025},1000)).toBe(40);
 expect(artistOutputDelay({currentTime:1,baseLatency:100},1000)).toBe(180);
});
it('follows the audible half-second drum attacks in the actual stage demo recording',async()=>{
 const fixture=JSON.parse(await readFile(new URL('./fixtures/artist-beat-signal.json',import.meta.url),'utf8')) as {sampleRate:number;fftSize:number;frames:Array<{time:number;rms:number;bins:number[]}>};
 const detector=new ArtistBeatDetector();const beats:number[]=[];const pulseValues:number[]=[];
 for(const frame of fixture.frames){const response=detector.sample(artistBassEnergy(new Uint8Array(frame.bins),fixture.sampleRate,fixture.fftSize),frame.rms,frame.time);if(response.beat)beats.push(frame.time);pulseValues.push(response.energy);}
 const drumTimes=Array.from({length:30},(_,index)=>1000+index*500);
 const matched=drumTimes.filter(time=>beats.some(beat=>Math.abs(beat-time)<75));
 expect(matched.length).toBeGreaterThanOrEqual(28);expect(beats.length).toBeLessThan(50);expect(Math.max(...pulseValues)-Math.min(...pulseValues)).toBeGreaterThan(.7);
});
