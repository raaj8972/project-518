// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {PortalPasswordReveal} from '../src/components/admin/PortalPasswordReveal';
const mocks=vi.hoisted(()=>({token:vi.fn(),fetch:vi.fn()}));
vi.mock('../src/context/AuthContext',()=>({useAuth:()=>({getValidToken:mocks.token})}));
let root:Root,container:HTMLDivElement;
beforeEach(()=>{vi.clearAllMocks();(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});mocks.token.mockResolvedValue('fixture-token');mocks.fetch.mockResolvedValue({ok:true,json:async()=>({password:'fixture-secret'})});vi.stubGlobal('fetch',mocks.fetch);container=document.createElement('div');document.body.append(container);root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();});
it.each(['council','cr','security'] as const)('loads %s passwords only on Show and clears them when the section closes',async portal=>{
 await act(async()=>root.render(<PortalPasswordReveal portal={portal} identity="account"/>));expect(mocks.fetch).not.toHaveBeenCalled();expect(container.textContent).not.toContain('fixture-secret');
 await act(async()=>container.querySelector('button')!.click());expect(container.textContent).toContain('fixture-secret');expect(mocks.fetch).toHaveBeenCalledWith('/api/portal-passwords',expect.objectContaining({body:JSON.stringify({action:'reveal',portal,id:'account'}),headers:expect.objectContaining({Authorization:'Bearer fixture-token'})}));
 await act(async()=>root.render(<PortalPasswordReveal portal={portal} identity="account" active={false}/>));expect(container.textContent).not.toContain('fixture-secret');expect(container.querySelector('button')!.disabled).toBe(true);
});
it('ignores a pending reveal after the section closes',async()=>{
 let resolve:any;mocks.fetch.mockReturnValue(new Promise(done=>{resolve=done;}));
 await act(async()=>root.render(<PortalPasswordReveal portal="cr" identity="account"/>));
 await act(async()=>container.querySelector('button')!.click());
 await act(async()=>root.render(<PortalPasswordReveal portal="cr" identity="account" active={false}/>));
 await act(async()=>resolve({ok:true,json:async()=>({password:'fixture-secret'})}));expect(container.textContent).not.toContain('fixture-secret');
});
