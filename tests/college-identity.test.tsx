// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import CollegeIdentityCard from '../src/components/dashboard/CollegeIdentityCard';
const mocks=vi.hoisted(()=>({get:vi.fn(),claim:vi.fn(),refresh:undefined as undefined|(()=>Promise<unknown>)}));
vi.mock('../src/services/studentTeams',()=>({getCollegeIdentity:mocks.get,claimCollegeIdentity:mocks.claim}));
vi.mock('../src/hooks/useDomainRealtime',()=>({useDomainRealtime:(_name:string,_enabled:boolean,_tables:string[],refresh:()=>Promise<unknown>)=>{mocks.refresh=refresh;}}));
let host:HTMLDivElement,root:Root;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;vi.clearAllMocks();mocks.get.mockResolvedValue(null);host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
async function render(){await act(async()=>root.render(<CollegeIdentityCard userId="student"/>));}
it('shows duplicate claim guidance without replacing the saved college number',async()=>{await render();const input=host.querySelector('input')!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'1122');input.dispatchEvent(new Event('input',{bubbles:true}));});mocks.claim.mockRejectedValue(new Error('This IQMG number is already in use. Ask admin to correct it using the college roster.'));await act(async()=>host.querySelector('button')!.click());expect(mocks.claim).toHaveBeenCalledWith('1122');expect(host.querySelector('[role=alert]')?.textContent).toContain('college roster');expect(input.disabled).toBe(false);});
it('automatically displays an administrator roster correction and locks the verified number',async()=>{mocks.get.mockResolvedValue({iqmg_number:'1122',status:'pending'});await render();expect(host.textContent).toContain('waiting for college roster');mocks.get.mockResolvedValue({iqmg_number:'003344',status:'verified',note:'Verified against the college PDF roster'});await act(async()=>{await mocks.refresh!();});expect(host.querySelector('input')?.value).toBe('003344');expect(host.querySelector('input')?.disabled).toBe(true);expect(host.querySelector('button')).toBeNull();});
