// @vitest-environment jsdom
import React,{act,useEffect} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ManagementProvider,useManagementData} from '../src/context/ManagementContext';
vi.mock('../src/context/CoreDataContext',()=>({useCoreData:()=>({refreshTrigger:0})}));
vi.mock('../src/context/AuthContext',()=>({useAuth:()=>({user:{id:'fixture-owner',user_metadata:{role:'owner'}},getValidToken:vi.fn()})}));
vi.mock('../src/hooks/useDomainRealtime',()=>({useDomainRealtime:vi.fn()}));
vi.mock('../src/lib/supabase',()=>({supabase:{}}));
vi.mock('../src/lib/dualDb',()=>({dualRead:vi.fn().mockResolvedValue({data:[]}),dualInsert:vi.fn(),dualUpdate:vi.fn(),dualDelete:vi.fn(),dualUpsert:vi.fn()}));
vi.mock('../src/utils/dataUtils',()=>({fetchAllRegistrations:vi.fn().mockResolvedValue({data:[]}),fetchSupabaseBatch:vi.fn().mockResolvedValue({data:[]})}));
vi.mock('../src/lib/adminService',()=>({AdminService:{getAllAdmins:vi.fn().mockResolvedValue([])}}));
let container:HTMLDivElement;let root:Root;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;container=document.createElement('div');document.body.append(container);root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();});
it('keeps the refresh callback stable across loading and data renders so account effects run once',async()=>{
  const callbacks=new Set<unknown>();const refreshed=vi.fn();
  function AccountConsumer(){const {refreshAdminUsers,loading}=useManagementData();callbacks.add(refreshAdminUsers);useEffect(()=>{refreshed();if(refreshed.mock.calls.length<4)void refreshAdminUsers();},[refreshAdminUsers]);return <p>{loading?'Loading':'Ready'}</p>;}
  await act(async()=>root.render(<ManagementProvider><AccountConsumer/></ManagementProvider>));
  expect(callbacks.size).toBe(1);expect(refreshed).toHaveBeenCalledTimes(1);expect(container.textContent).toBe('Ready');
});
