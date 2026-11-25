// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter, Routes, Route, Outlet} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import StudentDashboardTour from '../src/components/dashboard/StudentDashboardTour';
import Guide from '../src/pages/dashboard/Guide';
const mocks=vi.hoisted(()=>({seen:vi.fn(),save:vi.fn()}));
vi.mock('../src/services/studentRewards',()=>({hasSeenStudentTour:mocks.seen,saveStudentTour:mocks.save,studentTourKey:(id:string)=>`rico_student_tour_v1:${id}`}));
let root:Root,host:HTMLDivElement;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;localStorage.clear();vi.clearAllMocks();mocks.seen.mockResolvedValue(false);mocks.save.mockResolvedValue(undefined);HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();localStorage.clear();document.body.style.overflow='';});
async function tour(user='first',path='/dashboard'){await act(async()=>root.render(<MemoryRouter key={user+path} initialEntries={[path]} future={{v7_startTransition:true,v7_relativeSplatPath:true}}><StudentDashboardTour userId={user}/></MemoryRouter>));}
async function click(label:string){const button=[...host.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent?.trim()===label)!;expect(button,label).toBeTruthy();await act(async()=>button.click());}
it('shows a first-login overview, supports Back/Next, and persists Skip without repeating',async()=>{
 await tour();expect(host.querySelector('dialog[open]')).not.toBeNull();expect(host.textContent).toContain('Your festival, in one place');expect(document.body.style.overflow).toBe('hidden');
 await click('Next');expect(host.textContent).toContain('Find your event and your crew');await click('Back');expect(host.textContent).toContain('Your festival, in one place');await click('Skip tour');
 expect(mocks.save).toHaveBeenCalledWith('first','skipped');expect(localStorage.getItem('rico_student_tour_v1:first')).toBe('skipped');expect(host.querySelector('dialog')).toBeNull();expect(document.body.style.overflow).not.toBe('hidden');
 await act(async()=>root.render(null));await tour();expect(host.querySelector('dialog')).toBeNull();
});
it('finishes all seven steps, supports Escape, and separates different accounts',async()=>{
 await tour();for(let i=0;i<6;i++)await click('Next');expect(host.textContent).toContain('Make this space yours');await click('Finish tour');expect(mocks.save).toHaveBeenCalledWith('first','completed');
 await tour('second');expect(host.querySelector('dialog[open]')).not.toBeNull();await act(async()=>host.querySelector('dialog')!.dispatchEvent(new Event('cancel',{cancelable:true})));expect(mocks.save).toHaveBeenCalledWith('second','skipped');
});
it('honours the server preference on a new device and allows a manual replay',async()=>{
 mocks.seen.mockResolvedValue(true);await tour();expect(host.querySelector('dialog')).toBeNull();await tour('first','/dashboard?tour=1');expect(host.querySelector('dialog[open]')).not.toBeNull();expect(host.textContent).toContain('Skip tour');
});
it('explains the actual earning rules, Elite requirement, and all main dashboard destinations',async()=>{
 await act(async()=>root.render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Guide/></MemoryRouter>));
 expect(host.textContent).toContain('1,000 XP + 2 verified events');expect(host.textContent).toContain('Refreshing or signing in again does not add extra XP');expect(host.textContent).toContain('highest recorded placement');expect(host.textContent).toContain('best three event scores');expect(host.querySelector('a[href="/dashboard?tour=1"]')).not.toBeNull();expect(host.querySelector('a[href="/dashboard/messages"]')).not.toBeNull();
});
it('shows the remaining event requirement when XP is enough but Elite is still locked',async()=>{
 await act(async()=>root.render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Routes><Route element={<Outlet context={{xpData:{total_xp:1100,tier:'gold',verified_events:1}}}/>}><Route index element={<Guide/>}/></Route></Routes></MemoryRouter>));
 expect(host.textContent).toContain('1,100 XP');expect(host.textContent).toContain('Gold');expect(host.textContent).toContain('0 more XP and 1 more verified event.');expect(host.textContent).not.toContain('Elite unlocked');
});
