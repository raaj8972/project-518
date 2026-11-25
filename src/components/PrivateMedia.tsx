import { useEffect, useState, type ImgHTMLAttributes, type AnchorHTMLAttributes } from 'react';
import { privateStoragePath, resolvePrivateMediaUrl } from '../services/privateMedia';
function usePrivateMedia(raw:string){
 const [resolved,setResolved]=useState<{raw:string;url:string}|null>(null);
 useEffect(()=>{let active=true;const refresh=()=>resolvePrivateMediaUrl(raw).then(url=>{if(active)setResolved({raw,url});}).catch(()=>{if(active)setResolved({raw,url:''});});void refresh();const timer=privateStoragePath(raw)?setInterval(()=>void refresh(),5*60*1000):undefined;return()=>{active=false;clearInterval(timer);};},[raw]);
 return resolved?.raw===raw?resolved.url:privateStoragePath(raw)?'':raw;
}
export function PrivateMediaImage({src='',alt='',...props}:ImgHTMLAttributes<HTMLImageElement>){
 const url=usePrivateMedia(src);return <img {...props} src={url||undefined} alt={alt} referrerPolicy="no-referrer"/>;
}
export function PrivateMediaLink({href='',children,...props}:AnchorHTMLAttributes<HTMLAnchorElement>){
 const url=usePrivateMedia(href);return <a {...props} href={url||undefined} aria-disabled={!url} referrerPolicy="no-referrer">{children}</a>;
}
