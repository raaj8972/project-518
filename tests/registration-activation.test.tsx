// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {useRegistrationMutations} from '../src/hooks/useRegistrationMutations';
const mocks=vi.hoisted(()=>({update:vi.fn(),bulk:vi.fn(),push:vi.fn()}));
vi.mock('../src/components/ToastProvider',()=>({useToast:()=>({push:mocks.push})}));
vi.mock('../src/lib/dualDb',()=>({dualUpdate:mocks.update,dualBulkUpdate:mocks.bulk,dualRead:async()=>({data:[]}),dualDelete:vi.fn(),dualInsert:vi.fn(),dualBulkDelete:vi.fn()}));
let root:Root,host:HTMLDivElement;
function Panel(){const actions=useRegistrationMutations();return <><button onClick={()=>void actions.updateStatus('entry','approved')}>Approve</button><button onClick={()=>void actions.updateStatus('entry','rejected')}>Reject</button><button onClick={()=>void actions.bulkApprove(['entry'])}>Approve selected</button><button onClick={()=>void actions.bulkReject(['entry'])}>Reject selected</button></>;}
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;vi.clearAllMocks();mocks.update.mockResolvedValue({});mocks.bulk.mockResolvedValue({});host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
async function click(text:string){await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent===text)!.click());}
it('activates an approved entry and deactivates a rejected entry for participant-only tools',async()=>{
 await act(async()=>root.render(<Panel/>));await click('Approve');expect(mocks.update).toHaveBeenCalledWith('registrations','entry',{status:'approved',is_active:true});
 await click('Reject');expect(mocks.update).toHaveBeenLastCalledWith('registrations','entry',{status:'rejected',is_active:false});
});
it('keeps bulk approval and rejection consistent with individual registration access',async()=>{
 await act(async()=>root.render(<Panel/>));await click('Approve selected');expect(mocks.bulk).toHaveBeenCalledWith('registrations',['entry'],{status:'approved',is_active:true});
 await click('Reject selected');expect(mocks.bulk).toHaveBeenCalledWith('registrations',['entry'],{status:'rejected',is_active:false});
});
