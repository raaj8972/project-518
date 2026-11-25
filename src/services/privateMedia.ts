import { supabase } from '../lib/supabase';
const privateBuckets=new Set(['registration-photos','chat-attachments']);
const cache=new Map<string,{expires:number,url:Promise<string>}>();
supabase.auth.onAuthStateChange(event=>{if(event!=='TOKEN_REFRESHED')cache.clear();});

export function privateStoragePath(raw:string): {bucket:string;path:string}|null {
  try {
    const url=new URL(raw);
    const base=new URL(import.meta.env.VITE_SUPABASE_URL||'https://isfqhascrdzaoebhuohs.supabase.co');
    if(url.origin!==base.origin)return null;
    const match=url.pathname.match(/^\/storage\/v1\/object\/(?:public|authenticated|sign)\/([^/]+)\/(.+)$/);
    if(!match||!privateBuckets.has(match[1]))return null;
    return {bucket:match[1],path:decodeURIComponent(match[2])};
  }catch{return null;}
}
export async function resolvePrivateMediaUrl(raw:string):Promise<string>{
  const parsed=privateStoragePath(raw);if(!parsed)return raw;
  const key=parsed.bucket+'/'+parsed.path;
  const cached=cache.get(key);if(cached&&cached.expires>Date.now())return cached.url;
  const url=(async()=>{
    const {data,error}=await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path,600);
    if(error||!data?.signedUrl)throw new Error('You do not have access to this attachment.');
    return data.signedUrl;
  })();
  const entry={expires:Date.now()+5*60*1000,url};cache.set(key,entry);
  url.catch(()=>{if(cache.get(key)===entry)cache.delete(key);});
  return url;
}
