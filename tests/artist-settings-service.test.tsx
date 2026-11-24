// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {CoreDataProvider,useCoreData} from '../src/context/CoreDataContext';
const mocks=vi.hoisted(()=>({read:vi.fn(),upsert:vi.fn(),update:vi.fn(),invalidate:vi.fn(),rpc:vi.fn(),model:{} as any}));
vi.mock('../src/lib/dualDb',()=>({dualRead:mocks.read,dualUpsert:mocks.upsert,dualUpdate:mocks.update,dualInsert:vi.fn(),dualDelete:vi.fn(),invalidateTableCache:mocks.invalidate}));
vi.mock('../src/lib/supabase',()=>({SUPABASE_HOST:'fixture',supabase:{rpc:mocks.rpc,channel:()=>{const channel={on:()=>channel,subscribe:()=>channel};return channel;},removeChannel:vi.fn()}}));
vi.mock('../src/context/AuthContext',()=>({useAuth:()=>({user:null})}));
vi.mock('../src/services/publicSecuritySettings',()=>({getPublicSecuritySettings:async()=>null}));
vi.mock('../src/utils/preloadBrand',()=>({preloadBrandAssets:vi.fn()}));
let host:HTMLDivElement,root:ReturnType<typeof createRoot>,api:ReturnType<typeof useCoreData>;
const settings={visible_years:[2026,2024],date_label:'NOV 2026',venue_label:'Main stage',lights_enabled:true,beat_sync:true};
function Probe(){api=useCoreData();return <output>{api.homepageSettings?.artist_stage_settings?.venue_label}</output>;}
beforeEach(()=>{
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;mocks.model={id:1,brand_year:2026,hero_title:'Original homepage',artist_stage_settings:{}};
 mocks.read.mockReset().mockImplementation(async({table})=>({data:table==='homepage_settings'?mocks.model:null}));mocks.rpc.mockReset().mockImplementation(async(_name,{p_settings})=>{mocks.model={...mocks.model,artist_stage_settings:p_settings};return {data:p_settings,error:null};});mocks.upsert.mockReset();mocks.update.mockReset();mocks.invalidate.mockReset();host=document.createElement('div');document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
it('persists artist stage settings through the scoped RPC and refreshes the saved preview',async()=>{
 await act(async()=>root.render(<CoreDataProvider pathname="/artists"><Probe/></CoreDataProvider>));await act(async()=>api.updateHomepageSettings({artist_stage_settings:settings}));expect(mocks.rpc).toHaveBeenCalledWith('save_artist_stage_settings',{p_settings:settings});expect(mocks.upsert).not.toHaveBeenCalled();expect(mocks.update).not.toHaveBeenCalled();expect(mocks.invalidate).toHaveBeenCalledWith('homepage_settings');expect(host.textContent).toBe('Main stage');expect(mocks.model.hero_title).toBe('Original homepage');
});
it('surfaces access errors without falling back to a broad homepage write',async()=>{
 await act(async()=>root.render(<CoreDataProvider pathname="/artists"><Probe/></CoreDataProvider>));mocks.rpc.mockResolvedValueOnce({error:{message:'Artist management access required'}});await expect(act(async()=>api.updateHomepageSettings({artist_stage_settings:settings}))).rejects.toThrow('Artist management access required');expect(mocks.upsert).not.toHaveBeenCalled();expect(mocks.update).not.toHaveBeenCalled();expect(mocks.invalidate).not.toHaveBeenCalled();expect(mocks.model.artist_stage_settings).toEqual({});
});
