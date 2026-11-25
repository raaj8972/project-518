// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Notifications from '../src/pages/dashboard/Notifications';
const mocks=vi.hoisted(()=>({tools:{inbox:[
  {id:'1',kind:'registration',title:'Band entry approved',body:'Your entry is approved.',href:'/dashboard/events?view=registrations',created_at:'2026-11-22T12:00:00Z',read_at:null},
  {id:'2',kind:'venue',title:'Venue changed',body:'Use the auditorium.',href:'/dashboard/events?view=registrations',created_at:'2026-11-22T11:00:00Z',read_at:'2026-11-22T11:30:00Z'},
],unread:1,ready:true,error:null,busy:null,reminderMinutes:30,markRead:vi.fn(),updateReminders:vi.fn(),refresh:vi.fn()}}));
vi.mock('../src/context/StudentEventToolsContext',()=>({useStudentEventTools:()=>mocks.tools}));
vi.mock('../src/context/StudentAuthContext',()=>({useStudentAuth:()=>({user:{id:'fixture-student'}})}));
vi.mock('../src/services/studentEventTools',()=>({loadMoreStudentNotices:vi.fn()}));
let root:Root;let host:HTMLDivElement;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;vi.clearAllMocks();host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
it('filters unread notifications, links to real entries, marks read and saves reminder settings',async()=>{
  await act(async()=>root.render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Notifications/></MemoryRouter>));
  expect(host.textContent).toContain('1 unread');
  expect(host.querySelector('a')?.getAttribute('href')).toBe('/dashboard/events?view=registrations');
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Unread')!.click());
  expect(host.textContent).toContain('Band entry approved');
  expect(host.textContent).not.toContain('Use the auditorium');
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Mark as read')!.click());
  expect(mocks.tools.markRead).toHaveBeenCalledWith(['1']);
  const select=host.querySelector('select')!;
  await act(async()=>{select.value='15';select.dispatchEvent(new Event('change',{bubbles:true}));});
  expect(mocks.tools.updateReminders).toHaveBeenCalledWith(15);
});
