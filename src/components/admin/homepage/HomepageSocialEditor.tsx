import { repairDraftShape } from '../../../utils/studioData';
import type { Dispatch,SetStateAction } from 'react';
import type { SocialMediaSettings } from '../../../types/data';
import { StudioField,StudioGroup,StudioToggle } from './StudioControls';
export interface SocialDraft { instagram_url:string;instagram_enabled:boolean;youtube_url:string;youtube_enabled:boolean; }
const EMPTY_SOCIAL: SocialDraft = {instagram_url:'',instagram_enabled:false,youtube_url:'',youtube_enabled:false};
export function makeSocialDraft(source?:SocialMediaSettings|null):SocialDraft {return repairDraftShape(source, EMPTY_SOCIAL);}
export function socialDraftError(form:SocialDraft):string|null {
  for(const platform of ['instagram','youtube'] as const){const value=form[`${platform}_url`].trim();if(!value){if(form[`${platform}_enabled`])return `Add the ${platform === 'instagram' ? 'Instagram' : 'YouTube'} URL or switch its visibility off.`;continue;}
    try{const url=new URL(value);const hostname=url.hostname.toLowerCase();const validHost=platform === 'instagram' ? hostname === 'instagram.com' || hostname.endsWith('.instagram.com') : hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtu.be';if(!['https:','http:'].includes(url.protocol)||!validHost)throw new Error();}catch{return `Enter a valid ${platform === 'instagram' ? 'Instagram' : 'YouTube'} link, including https://.`;}}
  return null;
}
export function HomepageSocialEditor({form,setForm}:{form:SocialDraft;setForm:Dispatch<SetStateAction<SocialDraft>>}){
  return <><div className="studio-auto-notice"><strong>Website social links</strong><p>These are the Instagram and YouTube links shown in the website footer. Background video and trailer/aftermovie controls stay in their own tabs here.</p></div>{(['instagram','youtube'] as const).map(platform=><StudioGroup key={platform} title={platform === 'instagram' ? 'Instagram' : 'YouTube'}><StudioToggle label={`Show ${platform === 'instagram' ? 'Instagram' : 'YouTube'} link`} description="Applies to the website footer after saving." checked={form[`${platform}_enabled`]} onChange={enabled=>setForm(previous=>({...previous,[`${platform}_enabled`]:enabled}))}/><StudioField label={platform === 'instagram' ? 'Instagram profile URL' : 'YouTube channel URL'} type="url" value={form[`${platform}_url`]} onChange={url=>setForm(previous=>({...previous,[`${platform}_url`]:url}))} placeholder={platform === 'instagram' ? 'https://www.instagram.com/your_profile' : 'https://www.youtube.com/@your_channel'} /></StudioGroup>)}</>;
}
