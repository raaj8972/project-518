// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PersonnelProvider,usePersonnelData} from '../src/context/PersonnelContext';
const mocks=vi.hoisted(()=>({handlers:new Map<string,()=>void>(),invalidate:vi.fn(),server:[] as any[],cache:[] as any[]}));
vi.mock('../src/context/CoreDataContext',()=>({useCoreData:()=>({refreshTrigger:0})}));
vi.mock('../src/context/AuthContext',()=>({useAuth:()=>({user:null})}));
vi.mock('../src/lib/dualDb',()=>({dualInsert:vi.fn(),dualUpdate:vi.fn(),dualDelete:vi.fn(),invalidateTableCache:mocks.invalidate}));
vi.mock('../src/utils/dataUtils',()=>({fetchSupabaseBatch:async(table:string)=>({data:table==='guest_artists'?mocks.cache:[],error:null})}));
vi.mock('../src/lib/supabase',()=>({supabase:{channel:()=>{const channel={on:(_event:string,filter:any,callback:()=>void)=>{mocks.handlers.set(filter.table,callback);return channel;},subscribe:()=>channel};return channel;},removeChannel:vi.fn()}}));
let host:HTMLDivElement,root:ReturnType<typeof createRoot>;
function Probe(){return <output>{usePersonnelData().guestArtists.length}</output>;}
afterEach(async()=>{await act(async()=>root?.unmount());host?.remove();vi.useRealTimers();vi.restoreAllMocks();mocks.handlers.clear();});
it('refreshes an already-open public lineup when its artist becomes hidden',async()=>{
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;vi.useFakeTimers();vi.spyOn(console,'log').mockImplementation(()=>{});
 mocks.server=[{id:1,name:'Visible performer',image:'portrait.webp',enabled:true}];mocks.cache=mocks.server;mocks.invalidate.mockReset().mockImplementation(table=>{if(table==='guest_artists')mocks.cache=mocks.server;});host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<PersonnelProvider><Probe/></PersonnelProvider>));expect(host.textContent).toBe('1');mocks.server=[];
 expect(mocks.handlers.has('homepage_settings')).toBe(true);await act(async()=>{mocks.handlers.get('homepage_settings')!();await vi.advanceTimersByTimeAsync(200);});expect(mocks.invalidate).toHaveBeenCalledWith('guest_artists');expect(host.textContent).toBe('0');
});
