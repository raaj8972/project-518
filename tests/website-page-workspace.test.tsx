// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {expect,it,vi} from 'vitest';
import {getAdminSections} from '../src/constants/adminSections';
import {WEBSITE_PAGES,websitePageForSection,websitePageTools,websitePageOrder} from '../src/constants/websitePages';
import {OwnerAdminLayout} from '../src/components/admin/layout/OwnerAdminLayout';
import type {TabType} from '../src/components/admin/layout/AdminLayout';
it('organizes every visitor page once and nests editing tools under the page they affect',()=>{
 const tabs=getAdminSections(true);const pages=tabs.filter(tab=>tab.group==='WEBSITE'&&!tab.parent);
 expect(new Set(pages.map(tab=>tab.id))).toEqual(new Set(WEBSITE_PAGES.map(page=>page.id)));
 for(const [child,parent] of [['categories','events'],['band','homebound'],['guest-artists','homepage'],['chief-guests','homepage'],['face-indexing','gallery']] as const){expect(tabs.find(tab=>tab.id===child)?.parent).toBe(parent);expect(websitePageForSection(child)?.id).toBe(parent);}
 expect(tabs.some(tab=>tab.id.startsWith('sports'))).toBe(false);
 expect(WEBSITE_PAGES.find(page=>page.id==='homebound')?.path).toBe('/home-bound');
 expect(WEBSITE_PAGES.find(page=>page.id==='rico-family')?.path).toBe('/rico-family');
});
it('mirrors custom public navbar order without losing pages or restoring sports',()=>{
 expect(websitePageOrder(['sponsors','home','sports','home-bound','sponsors'])).toEqual(['sponsors','homepage','homebound','events','schedule','gallery','rico-family']);
 expect(websitePageOrder(null)).toEqual(WEBSITE_PAGES.map(page=>page.id));
});
it('only exposes connected edit tools when all required page grants are present',()=>{
 const events=WEBSITE_PAGES.find(page=>page.id==='events')!;
 expect(websitePageTools(events,new Set(['events'])).map(tool=>tool.label)).toEqual(['Events editor']);
 expect(websitePageTools(events,new Set(['events','hero-media','categories'])).map(tool=>tool.href)).toEqual(['/admin/events','/admin/categories','/admin/events?edit=background']);
 const sponsors=WEBSITE_PAGES.find(page=>page.id==='sponsors')!;
 expect(websitePageTools(sponsors,new Set(['sponsors']))).toHaveLength(1);
 expect(websitePageTools(sponsors,new Set(['sponsors','homepage']))).toHaveLength(1);
});
async function mount(path:string,tab:TabType,options:{admin?:boolean;tabs?:ReturnType<typeof getAdminSections>}={}) {
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 await act(async()=>root.render(<MemoryRouter initialEntries={[path]}><OwnerAdminLayout user={{email:'test@example.com'}} isOwner={!options.admin} isAdmin activeTab={tab} visibleTabs={options.tabs||getAdminSections(true)} setActiveTab={vi.fn()} isSidebarOpen={false} setIsSidebarOpen={()=>{}} onLogout={()=>{}} onNavigateHome={()=>{}} autoLogoutEnabled={false} setAutoLogoutEnabled={()=>{}} isTOTPEnabled><p>Page editor content</p></OwnerAdminLayout></MemoryRouter>));
 return {host,close:async()=>{await act(async()=>root.unmount());host.remove();}};
}
it('keeps Events background editing inside Events with the right public link and selected option',async()=>{
 const {host,close}=await mount('/admin/events?edit=background','events');
 try{expect(host.querySelector('[aria-label="Events page workspace"] h1')?.textContent).toBe('Events');expect(host.querySelector('.owner-website-page-heading a')?.getAttribute('href')).toBe('/events');expect(host.querySelector('.owner-page-tools [aria-current="page"]')?.textContent).toBe('Background media');expect(host.querySelector('.owner-section-tabs')).toBeNull();expect([...host.querySelectorAll('#owner-nav-website .owner-nav-link')].map(node=>node.textContent)).toEqual(WEBSITE_PAGES.map(page=>page.name));}finally{await close();}
});
it('shows the parent page context while opening a nested editor',async()=>{
 const {host,close}=await mount('/admin/band','band');
 try{expect(host.querySelector('.owner-website-page-heading h1')?.textContent).toBe('Home Bound');expect(host.querySelector('.owner-page-tools [aria-current="page"]')?.textContent).toBe('Band profiles');expect(host.querySelector('.owner-website-page-heading a')?.getAttribute('href')).toBe('/home-bound');}finally{await close();}
});
it('uses the same page context for admins and hides ungranted tools',async()=>{
 const {host,close}=await mount('/admin/events','events',{admin:true,tabs:getAdminSections(false).filter(tab=>['events','security'].includes(tab.id))});
 try{expect(host.querySelector('.owner-account strong')?.textContent).toBe('Admin workspace');expect(host.querySelector('.owner-page-tools')).toBeNull();expect(host.textContent).not.toContain('Background media');expect(host.textContent).not.toContain('Chief guests');}finally{await close();}
});
