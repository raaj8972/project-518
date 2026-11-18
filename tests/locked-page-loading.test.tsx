// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {beforeEach, afterEach, it, expect, vi} from 'vitest';
import LockedPageGuard from '../src/components/LockedPageGuard';
const mocks=vi.hoisted(()=>({settings:{} as any, admin:false, load:vi.fn(), settled:vi.fn()}));
vi.mock('../src/context/DataContext',()=>({useData:()=>({siteSettings:mocks.settings,isAdmin:()=>mocks.admin})}));
vi.mock('../src/components/ui/festival/FestivalSceneReadiness',()=>({useFestivalSceneReadiness:()=>({setSettled:mocks.settled})}));
vi.mock('../src/components/ui/FestivalLoadingPreview',()=>({FestivalLoadingPreview:()=> <p>Loading festival</p>}));
vi.mock('../src/pages/ComingSoon',()=>{mocks.load();return {default:({previewSettings}:any)=><p>{previewSettings.coming_soon_title}</p>};});
let host:HTMLDivElement, root:Root;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-17T12:00:00Z'));mocks.settings={};mocks.admin=false;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.useRealTimers();});
async function render(){await act(async()=>root.render(<LockedPageGuard pageKey="home"><h1>Existing homepage</h1></LockedPageGuard>));}
it('keeps the unlocked page free of maintenance code and ticking intervals',async()=>{
 await render();expect(host.textContent).toBe('Existing homepage');expect(mocks.load).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
});
it('loads the same maintenance screen only when needed and still auto-unlocks',async()=>{
 mocks.settings={locked_pages:{home:true},locked_pages_until:{home:new Date(Date.now()+2000).toISOString()}};
 await render();expect(host.textContent).toBe('Under Maintenance');expect(mocks.load).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(1);
 await act(async()=>vi.advanceTimersByTime(1000));expect(host.textContent).toBe('Under Maintenance');
 await act(async()=>vi.advanceTimersByTime(1000));expect(host.textContent).toBe('Existing homepage');expect(vi.getTimerCount()).toBe(0);
});
it('preserves permanent locks and administrator bypass without idle timers',async()=>{
 mocks.settings={locked_pages:{home:true}};await render();expect(host.textContent).toBe('Under Maintenance');expect(vi.getTimerCount()).toBe(0);
 mocks.admin=true;await render();expect(host.textContent).toContain('Admin Bypass Active');expect(host.querySelector('h1')?.textContent).toBe('Existing homepage');
});
