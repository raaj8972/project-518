import { recordValue, textValue, textList, finiteValue } from './studioData';
import type { RoadmapMilestone } from '../types/data';
import { BRAND_YEAR } from '../constants/brand';

/** The site's existing built-in history, shared by the public roadmap and studio. */
export const DEFAULT_ROADMAP = [
  { year:2015,title:'',points:['Biggest ever in History of RICORRENZA','Radiant Glow Bands','National Artists','Indo Western Band'],side:'right' as const },
  { year:2017,title:'',points:['20+ events','500+ participants','3 days of cultural extravaganza'],side:'left' as const },
  { year:2019,title:'',points:['Bollywood Artist Mohammad Irfan','Bengals Favourite Anupam Roy','Waves in Town Band','10000+ Footfall'],side:'right' as const },
  { year:2022,title:'',points:['Develop branding & marketing campaigns','1000+ Footfall','DJ Night','Guest Artists'],side:'left' as const },
  { year:2023,title:'',points:['Bollywood Artist Amit Mishra','Ehsaas India Band','DJ Nights','College Band Homeground'],side:'right' as const },
  { year:Number(BRAND_YEAR),title:'',points:['Commencement of Ricorrenza'],side:'left' as const },
].map(item => ({...item,images:[] as string[]}));
export const isHomepageRoadmapVisible = (setting: unknown) => setting !== false;
export interface RoadmapItemDraft { key:string; id?:number; year:number; title:string; points:string[]; images:string[]; side:'auto'|'left'|'right'; enabled:boolean; order_position:number; }
export type RoadmapEdits = Record<string,RoadmapItemDraft>;
/** Suggest a new edition without changing existing years or inventing public milestones. */
export function nextRoadmapYear(records:ReadonlyArray<{year:number}>,currentYear=new Date().getFullYear()):number|null {
  const used=new Set(records.map(record=>record.year).filter(year=>Number.isInteger(year)&&year>=1900&&year<=3000));
  const next=Math.max(currentYear,...[...used].map(year=>year+1));
  if(next<=3000)return next;
  for(let year=currentYear;year<=3000;year++)if(!used.has(year))return year;
  for(let year=1900;year<currentYear;year++)if(!used.has(year))return year;
  return null;
}
export function normalizeRoadmapImages(value:unknown):string[] {
  return [...new Set(textList(value).map(url=>url.trim()).filter(url=>{
    if(!/^https?:\/\//i.test(url)&&!/^\/(?!\/)/.test(url))return false;
    try{return ['http:','https:'].includes(new URL(url,'https://ricorrenza.local').protocol);}catch{return false;}
  }))];
}
export function normalizeRoadmapEdits(value: unknown): RoadmapEdits {
  return Object.fromEntries(Object.entries(recordValue(value)).flatMap(([key,candidate]) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return [];
    const row = recordValue(candidate);
    const item: RoadmapItemDraft = {key,year:finiteValue(row.year,0),title:textValue(row.title),points:textList(row.points),images:normalizeRoadmapImages(row.images),side:row.side === 'left' || row.side === 'right' ? row.side : 'auto',enabled:row.enabled !== false,order_position:finiteValue(row.order_position,0),...(typeof row.id === 'number' && Number.isFinite(row.id) ? {id:row.id} : {})};
    return [[key,item]];
  }));
}
export function roadmapRecords(records: RoadmapMilestone[]): RoadmapItemDraft[] {
  return Object.values(normalizeRoadmapEdits(Object.fromEntries((Array.isArray(records) ? records : []).filter(record => record && typeof record === 'object').map(record => [`milestone-${record.id}`,record]))));
}
export function mergeRoadmapDrafts(records:RoadmapMilestone[],edits:RoadmapEdits): RoadmapItemDraft[] {
  return [...roadmapRecords(records).filter(record => !edits[record.key]),...Object.values(edits)].sort((a,b)=>a.order_position-b.order_position || a.year-b.year);
}
/** Milestones never depend on the car/visibility observer to become readable. */
export function publicRoadmapMilestones(records:RoadmapMilestone[]) {
  const normalized = roadmapRecords(records);
  const source = normalized.length ? normalized.filter(record => record.enabled !== false).sort((a,b)=>a.order_position-b.order_position) : DEFAULT_ROADMAP;
  return source.map(record => ({key:'key' in record ? record.key : `year-${record.year}`,year:String(record.year),title:record.title,points:record.points,images:record.images,lines:[...(record.title ? [record.title] : []),...(record.points || [])],side:record.side || 'auto'}));
}
/** SVG-geometry fallback for browsers that cannot measure a path yet. */
export function roadGeometry(width:number,height:number,segments:number,pad:number) {
  const points = [{x:pad,y:0},...Array.from({length:segments},(_,index)=>({x:(index+1)%2 === 0 ? pad : width-pad,y:(index+1)/segments*height})),{x:segments%2 !== 0 ? pad : width-pad,y:height+200}];
  const lengths = points.slice(1).map((point,index)=>Math.hypot(point.x-points[index].x,point.y-points[index].y));
  const total = lengths.reduce((sum,value)=>sum+value,0);
  const pointAt = (distance:number) => { let left=Math.max(0,Math.min(total,distance)); for(let index=0;index<lengths.length;index++){ if(left<=lengths[index]) {const ratio=lengths[index] ? left/lengths[index] : 0;return {x:points[index].x+(points[index+1].x-points[index].x)*ratio,y:points[index].y+(points[index+1].y-points[index].y)*ratio};}left-=lengths[index];}return points[points.length-1]; };
  return {total,pointAt};
}
