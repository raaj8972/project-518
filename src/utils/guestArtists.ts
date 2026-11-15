import type { GuestArtist } from '../types/data';
import { recordValue, textValue, textList, finiteValue } from './studioData';

/** Database JSON and older rows can contain null collections despite TypeScript types. */
export function normalizeGuestArtists(value:unknown):GuestArtist[]{
 if(!Array.isArray(value))return [];
 return value.filter(item=>item&&typeof item==='object'&&!Array.isArray(item)).map(item=>{
  const row=recordValue(item),social=recordValue(row.social_links);
  return {...row,name:textValue(row.name),title:textValue(row.title),specialty:textValue(row.specialty),description:textValue(row.description),image:textValue(row.image),achievements:textList(row.achievements),social_links:Object.fromEntries(Object.entries(social).filter(([,value])=>typeof value==='string')),enabled:row.enabled!==false,is_featured:true,order_position:Math.max(1,finiteValue(row.order_position,1))} as GuestArtist;
 });
}
/** Every published artist belongs to Home automatically, including older unfeatured records. */
export function selectHomepageArtists(value:unknown):GuestArtist[]{return normalizeGuestArtists(value).filter(artist=>artist.enabled && artist.name.trim() && artist.image.trim()).sort((a,b)=>Number(a.order_position)-Number(b.order_position));}
