import type { GuestArtist } from '../types/data';
import { recordValue, textValue, textList, finiteValue } from './studioData';
import { BRAND_YEAR } from '../constants/brand';
import { getArtistKind, artistStageClips, normalizeArtistSongs, spotifyResource } from './artistMedia';

export function getArtistFestivalYear(artist:Partial<GuestArtist>,fallbackYear=Number(BRAND_YEAR)):number {
 const year=Number(artist.festival_year);
 if(Number.isInteger(year)&&year>=2000&&year<=2100)return year;
 if(artist.performance_at){const date=new Date(artist.performance_at);if(!isNaN(date.getTime()))return Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Kolkata'}).format(date));}
 return fallbackYear;
}

/** Database JSON and older rows can contain null collections despite TypeScript types. */
export function normalizeGuestArtists(value:unknown):GuestArtist[]{
 if(!Array.isArray(value))return [];
 return value.filter(item=>item&&typeof item==='object'&&!Array.isArray(item)).map(item=>{
  const row=recordValue(item),social=recordValue(row.social_links);
  return {...row,desktop_gallery_images:textList(row.desktop_gallery_images).slice(0,3),desktop_stage_clip_urls:textList(row.desktop_stage_clip_urls).slice(0,3),stage_light_color:textValue(row.stage_light_color),name:textValue(row.name),title:textValue(row.title),specialty:textValue(row.specialty),description:textValue(row.description),image:textValue(row.image),festival_year:getArtistFestivalYear(row as Partial<GuestArtist>),gallery_images:[...new Set(textList(row.gallery_images).map(value=>value.trim()).filter(Boolean))].slice(0,3),track_title:textValue(row.track_title),artist_kind:getArtistKind(row as Partial<GuestArtist>),stage_media_mode:row.stage_media_mode==='clips'?'clips':'photos',stage_clip_urls:artistStageClips(row as Partial<GuestArtist>),stage_clip_seconds:row.stage_clip_seconds===60?60:30,spotify_collection_url:spotifyResource(row.spotify_collection_url)?.url||'',featured_songs:normalizeArtistSongs(row.featured_songs),achievements:textList(row.achievements),social_links:Object.fromEntries(Object.entries(social).filter(([,value])=>typeof value==='string')),enabled:row.enabled!==false,is_featured:true,order_position:Math.max(1,finiteValue(row.order_position,1))} as GuestArtist;
 });
}
/** Every published artist belongs to Home automatically, including older unfeatured records. */
export function selectHomepageArtists(value:unknown):GuestArtist[]{return normalizeGuestArtists(value).filter(artist=>artist.enabled && artist.name.trim() && artist.image.trim()).sort((a,b)=>Number(a.order_position)-Number(b.order_position));}
