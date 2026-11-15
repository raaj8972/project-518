// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {CRLogin} from '../src/pages/CRLogin';
const mocks=vi.hoisted(()=>({settings:{registration_participant_types:['2021-2022']} as any,verify:vi.fn(),navigate:vi.fn(),toast:vi.fn(),fetch:vi.fn()}));
vi.mock('../src/lib/supabase',()=>({supabase:{auth:{verifyOtp:mocks.verify}}}));
vi.mock('../src/context/CoreDataContext',()=>({useCoreData:()=>({siteSettings:mocks.settings,loading:false})}));
vi.mock('react-hot-toast',()=>({toast:{error:mocks.toast,success:mocks.toast}}));
vi.mock('react-router-dom',async original=>({...await original<typeof import('react-router-dom')>(),useNavigate:()=>mocks.navigate}));
let container:HTMLDivElement,root:Root;
beforeEach(()=>{vi.clearAllMocks();sessionStorage.clear();(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;mocks.settings={registration_participant_types:['2021-2022']};mocks.verify.mockResolvedValue({error:null});mocks.fetch.mockResolvedValue({ok:true,json:async()=>({token_hash:'once'})});vi.stubGlobal('fetch',mocks.fetch);container=document.createElement('div');document.body.append(container);root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();});
const mount=async()=>act(async()=>root.render(<MemoryRouter><CRLogin/></MemoryRouter>));
it('uses the configured full academic batch and PIN without email fields',async()=>{
 await mount();expect(container.querySelector('input[type=email]')).toBeNull();expect(container.querySelector('select')?.textContent).toContain('2021-2022');
 await act(async()=>{const select=container.querySelector('select')!;Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value')!.set!.call(select,'2021-2022');select.dispatchEvent(new Event('change',{bubbles:true}));const input=container.querySelector('input')!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'4826');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await act(async()=>container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 expect(mocks.fetch).toHaveBeenCalledWith('/api/cr-login',expect.objectContaining({body:JSON.stringify({batch:'2021-2022',password:'4826'})}));expect(mocks.verify).toHaveBeenCalledWith({token_hash:'once',type:'magiclink'});expect(JSON.parse(sessionStorage.getItem('cr_session')!).batch).toBe('2021-2022');expect(mocks.navigate).toHaveBeenCalledWith('/cr/dashboard');
});
it('uses the same secondary batch settings as student registration',async()=>{mocks.settings={registration_participant_types:[],batch_options:['2022-2023','2023-2024']};await mount();expect([...container.querySelectorAll('option')].map(option=>option.value)).toEqual(['','2022-2023','2023-2024']);expect(mocks.toast).not.toHaveBeenCalled();});
