import type {GuestArtist} from '../types/data';
export interface ArtistStageSettings {visible_years:number[];date_label:string;venue_label:string;lights_enabled:boolean;beat_sync:boolean;}
export function readArtistStageSettings(value:unknown,currentYear:number,artists:Partial<GuestArtist>[]=[]):ArtistStageSettings {
 const row=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
 const configured=Array.isArray(row.visible_years)?row.visible_years:null;
 const candidates=configured||[currentYear,...artists.filter(artist=>artist.enabled!==false).map(artist=>Number(artist.festival_year)||currentYear)];
 const years=[...new Set(candidates.map(Number).filter(year=>Number.isInteger(year)&&year>=2000&&year<=2100))].sort((a,b)=>b-a).slice(0,12);
 return {visible_years:years.length?years:[currentYear],date_label:typeof row.date_label==='string'&&row.date_label.trim()?row.date_label.trim().slice(0,60):`NOV ${currentYear}`,venue_label:typeof row.venue_label==='string'&&row.venue_label.trim()?row.venue_label.trim().slice(0,120):'IQ CITY MC, DURGAPUR',lights_enabled:row.lights_enabled!==false,beat_sync:row.beat_sync!==false};
}
export function artistLightColor(artist:Partial<GuestArtist>){
 if(/^#[\da-f]{6}$/i.test(artist.stage_light_color||''))return artist.stage_light_color!;
 return ['#dfab64','#9b8bdf','#54cbb0','#de7995'][Math.abs(Number(artist.id)||0)%4];
}

export function artistLightHue(artist:Partial<GuestArtist>){
 const color=artistLightColor(artist).slice(1);const [r,g,b]=[0,2,4].map(index=>parseInt(color.slice(index,index+2),16)/255);const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;let hue=0;if(delta){if(max===r)hue=((g-b)/delta)%6;else if(max===g)hue=(b-r)/delta+2;else hue=(r-g)/delta+4;hue*=60;}return (hue+360)%360-32;
}
