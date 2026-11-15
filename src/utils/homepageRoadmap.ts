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
];
export const isHomepageRoadmapVisible = (setting: unknown) => setting !== false;
export interface RoadmapItemDraft { key:string; id?:number; year:number; title:string; points:string[]; side:'auto'|'left'|'right'; enabled:boolean; order_position:number; }
export type RoadmapEdits = Record<string,RoadmapItemDraft>;
export function normalizeRoadmapEdits(value: unknown): RoadmapEdits {
  return Object.fromEntries(Object.entries(recordValue(value)).flatMap(([key,candidate]) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return [];
    const row = recordValue(candidate);
    const item: RoadmapItemDraft = {key,year:finiteValue(row.year,0),title:textValue(row.title),points:textList(row.points),side:row.side === 'left' || row.side === 'right' ? row.side : 'auto',enabled:row.enabled !== false,order_position:finiteValue(row.order_position,0),...(typeof row.id === 'number' && Number.isFinite(row.id) ? {id:row.id} : {})};
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
  return source.map(record => ({year:String(record.year),lines:[...(record.title ? [record.title] : []),...(record.points || [])],side:record.side || 'auto'}));
}
/** SVG-geometry fallback for browsers that cannot measure a path yet. */
export function roadGeometry(width:number,height:number,segments:number,pad:number) {
  const points = [{x:pad,y:0},...Array.from({length:segments},(_,index)=>({x:(index+1)%2 === 0 ? pad : width-pad,y:(index+1)/segments*height})),{x:segments%2 !== 0 ? pad : width-pad,y:height+200}];
  const lengths = points.slice(1).map((point,index)=>Math.hypot(point.x-points[index].x,point.y-points[index].y));
  const total = lengths.reduce((sum,value)=>sum+value,0);
  const pointAt = (distance:number) => { let left=Math.max(0,Math.min(total,distance)); for(let index=0;index<lengths.length;index++){ if(left<=lengths[index]) {const ratio=lengths[index] ? left/lengths[index] : 0;return {x:points[index].x+(points[index+1].x-points[index].x)*ratio,y:points[index].y+(points[index+1].y-points[index].y)*ratio};}left-=lengths[index];}return points[points.length-1]; };
  return {total,pointAt};
}
