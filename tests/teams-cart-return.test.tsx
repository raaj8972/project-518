// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter,Routes,Route,Outlet,useLocation} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {Teams} from '../src/pages/dashboard/Teams';
const mocks=vi.hoisted(()=>({open:vi.fn(),create:vi.fn(),workspace:vi.fn(),findStudent:vi.fn(),invite:vi.fn(),findTeam:vi.fn(),join:vi.fn(),respond:vi.fn()}));
vi.mock('../src/services/studentTeams',()=>({getTeamWorkspace:mocks.workspace,createStudentTeam:mocks.create,findIQMGStudent:mocks.findStudent,inviteIQMGStudent:mocks.invite,findStudentTeam:mocks.findTeam,requestTeamJoin:mocks.join,respondTeamRequest:mocks.respond}));
vi.mock('../src/components/dashboard/TeamGuideOverlay',()=>({default:()=>null,TEAM_GUIDE_STEPS:[]}));
vi.mock('../src/hooks/useDomainRealtime',()=>({useDomainRealtime:vi.fn()}));
vi.mock('../src/context/EventCartContext',()=>({useEventCart:()=>({cartCount:1,openDrawer:mocks.open})}));
vi.mock('react-hot-toast',()=>({toast:{success:vi.fn(),error:vi.fn()}}));
const context={user:{id:'captain'},profile:{full_name:'Captain'},registrations:[],fetchUserRegistrations:vi.fn(),pendingInvitesCount:0,setPendingInvitesCount:vi.fn()};
let root:Root,host:HTMLDivElement;
function Layout(){const location=useLocation();return <><Outlet context={context}/><output data-location>{location.search}</output></>;}
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;vi.clearAllMocks();mocks.workspace.mockResolvedValue({identity:{status:'verified',iqmg_number:'1122'},teams:[],requests:[]});host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
it('opens team creation from the cart and lets the student return without creating anything automatically',async()=>{
 await act(async()=>root.render(<MemoryRouter initialEntries={['/dashboard/teams?from=cart&create=1']} future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Routes><Route element={<Layout/>}><Route path="/dashboard/teams" element={<Teams/>}/></Route></Routes></MemoryRouter>));
 expect(host.textContent).toContain('Your event cart is saved.');expect(host.querySelector('input')).not.toBeNull();expect(host.querySelector('[data-location]')?.textContent).toBe('?from=cart');expect(mocks.create).not.toHaveBeenCalled();
 await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent==='Return to event cart')!.click());expect(mocks.open).toHaveBeenCalledOnce();
});

async function setInput(label:string,value:string){const input=[...host.querySelectorAll<HTMLInputElement>('input')].find(node=>node.closest('label')?.textContent?.startsWith(label))!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});}
async function click(text:string){const button=[...host.querySelectorAll<HTMLButtonElement>('button')].find(node=>node.textContent?.trim()===text)!;expect(button).toBeTruthy();await act(async()=>button.click());}
async function renderTeams(){await act(async()=>root.render(<MemoryRouter initialEntries={['/dashboard/teams']} future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Routes><Route element={<Layout/>}><Route path="/dashboard/teams" element={<Teams/>}/></Route></Routes></MemoryRouter>));}
it('requires an exact IQMG lookup and explicit Send invitation without adding a member',async()=>{
 mocks.workspace.mockResolvedValue({identity:{status:'verified'},teams:[{id:'t1',name:'Crew',owner_id:'captain',team_code:'TEAM-ABC',captain_name:'Captain',members:[]}],requests:[]});mocks.findStudent.mockResolvedValue({id:'friend',full_name:'Verified Friend',batch:'2024',iqmg_number:'003344'});await renderTeams();await setInput('Student IQMG number','003344');await click('Find student');expect(mocks.findStudent).toHaveBeenCalledWith('003344');expect(host.textContent).toContain('Verified Friend');expect(mocks.invite).not.toHaveBeenCalled();await click('Send invitation');expect(mocks.invite).toHaveBeenCalledWith('t1','003344');expect(host.textContent).toContain('The student must accept before joining.');
});
it('looks up a Team ID before sending a request for captain approval',async()=>{
 mocks.findTeam.mockResolvedValue({id:'t2',name:'Dance Crew',team_code:'TEAM-ABC123',captain_name:'Captain B',member_count:2});await renderTeams();await setInput('Team ID','TEAM-ABC123');await click('Find team');expect(mocks.join).not.toHaveBeenCalled();expect(host.textContent).toContain('Captain B');await click('Request to join');expect(mocks.join).toHaveBeenCalledWith('t2');expect(host.textContent).toContain('captain must approve');
});
it('keeps team actions disabled until college IQMG is verified',async()=>{mocks.workspace.mockResolvedValue({identity:{status:'pending',iqmg_number:'1122'},teams:[],requests:[]});await renderTeams();expect(host.textContent).toContain('Verify your college IQMG first');expect([...host.querySelectorAll<HTMLButtonElement>('button')].find(node=>node.textContent?.includes('Create a team'))?.disabled).toBe(true);expect(host.querySelector('a[href="/dashboard/settings"]')).toBeTruthy();});
