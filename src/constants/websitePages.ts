import { SITE_FEATURES } from './siteFeatures';
import type { TabType } from '../components/admin/layout/AdminLayout';
export interface WebsitePage { id:TabType; name:string; path:string; description:string; }
export const WEBSITE_PAGES:WebsitePage[] = [
  {id:'homepage',name:'Home',path:'/',description:'Hero text, branding, About, Chronicles and footer links.'},
  {id:'events',name:'Events',path:'/events',description:'Event details, registration information, and event categories.'},
  {id:'schedule',name:'Schedule',path:'/schedule',description:'Festival dates, times, venues and the public programme.'},
  {id:'gallery',name:'Gallery',path:'/gallery',description:'Photos, albums and gallery discovery.'},
  {id:'homebound',name:'Home Bound',path:'/home-bound',description:'Page text, stage photos, band profiles, categories and the band’s journey.'},
  {id:'rico-family',name:'Rico Family',path:'/rico-family',description:'Faculty, council, committees, heads and team profiles.'},
  {id:'sponsors',name:'Sponsors',path:'/sponsors',description:'Sponsor records and the shared Home / Sponsors logo showcase.'},
];
export const WEBSITE_CHILDREN:Partial<Record<TabType,TabType>> = {
  'hero-media':'homepage',about:'homepage',social:'homepage',roadmap:'homepage','guest-artists':'homepage','chief-guests':'homepage',categories:'events',band:'homebound',
};
export function websitePageForSection(id:TabType) {return WEBSITE_PAGES.find(page=>page.id===(WEBSITE_CHILDREN[id] || id));}
export interface PageTool { label:string; href:string; grants:TabType[]; }
export function websitePageTools(page:WebsitePage, available:ReadonlySet<string>):PageTool[] {
  const tools:PageTool[]=[{label:page.id==='homepage'?'Page editor':page.id==='homebound'?'Page settings':`${page.name} editor`,href:`/admin/${page.id}`,grants:[page.id]}];
  if(page.id==='homepage') tools.push({label:'Artists',href:'/admin/guest-artists',grants:['guest-artists']},...(SITE_FEATURES.chiefGuests ? [{label:'Chief guests',href:'/admin/chief-guests',grants:['chief-guests'] as TabType[]}] : []));
  if(page.id==='events') tools.push({label:'Categories',href:'/admin/categories',grants:['categories']});
  if(page.id==='homebound') tools.push({label:'Band profiles',href:'/admin/band',grants:['band']});
  return tools.filter(tool=>tool.grants.every(grant=>available.has(grant)));
}

/** Mirror the visitor menu's configured order, keeping every editable page reachable. */
export function websitePageOrder(value:unknown):TabType[] {
  const aliases:Record<string,TabType>={home:'homepage','home-bound':'homebound'};
  const custom=Array.isArray(value)?value.filter((id):id is string=>typeof id==='string').map(id=>aliases[id] || id):[];
  return [...new Set([...custom,...WEBSITE_PAGES.map(page=>page.id)])].filter((id):id is TabType=>WEBSITE_PAGES.some(page=>page.id===id));
}
