// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ChatPanel} from '../src/components/shared/ChatPanel';
const mocks=vi.hoisted(()=>({list:vi.fn(),open:vi.fn(),messages:vi.fn(),rpc:vi.fn(),locked:false}));
vi.mock('../src/context/CoreDataContext',()=>({useCoreData:()=>({siteSettings:{chat_locked:mocks.locked}})}));
vi.mock('../src/services/supportChat',()=>({listSupportConversations:mocks.list,openStudentSupport:mocks.open,loadSupportMessages:mocks.messages,supportRpc:mocks.rpc}));
vi.mock('../src/lib/supabase',()=>({supabase:{auth:{getUser:async()=>({data:{user:{id:'student'}}})},channel:()=>{const channel={on:()=>channel,subscribe:()=>channel};return channel;},removeChannel:vi.fn()}}));
let root:Root,host:HTMLDivElement;
const convo={id:'chat-1',student_id:'student',event_id:'event-a',created_at:'2026-11-22T10:00:00Z',label:'Dance support',subtitle:'Event coordinator',last_message:'',last_activity:'2026-11-22T10:00:00Z',unread_count:0};
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;vi.clearAllMocks();mocks.locked=false;mocks.list.mockResolvedValue([convo]);mocks.open.mockResolvedValue('chat-1');mocks.messages.mockResolvedValue([]);mocks.rpc.mockResolvedValue(undefined);vi.stubGlobal('matchMedia',()=>({matches:true}));host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
it('uses the explicit coordinator role with its own event even when styled indigo',async()=>{
 await act(async()=>root.render(<ChatPanel mode="coordinator" themeAccent="indigo" eventId="event-a"/>));
 expect(mocks.list).toHaveBeenCalledWith('coordinator','event-a');
 expect(mocks.list).not.toHaveBeenCalledWith('admin',expect.anything());
 expect(mocks.open).not.toHaveBeenCalled();
 expect(host.textContent).toContain('Dance support');
});
it('opens technical support without an event and preserves a failed message draft for retry',async()=>{
 mocks.list.mockResolvedValue([{...convo,event_id:null,label:'Technical support',subtitle:'Technical team'}]);
 await act(async()=>root.render(<ChatPanel mode="student"/>));
 expect(mocks.open).toHaveBeenCalledWith(undefined);
 const input=host.querySelector<HTMLTextAreaElement>('.support-composer textarea')!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(input,'My QR pass is blank');input.dispatchEvent(new Event('input',{bubbles:true}));});
 mocks.rpc.mockImplementation(async(name:string)=>{if(name==='support_send_message')throw new Error('Connection unavailable');});
 await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Send support message"]')!.click());
 expect(mocks.rpc).toHaveBeenCalledWith('support_send_message',{p_conversation_id:'chat-1',p_mode:'student',p_text:'My QR pass is blank'});
 expect(input.value).toBe('My QR pass is blank');
 expect(host.querySelector('[role="alert"]')?.textContent).toContain('Connection unavailable');
 mocks.rpc.mockImplementation(async(name:string)=>name==='support_send_message'?{id:'message-1',conversation_id:'chat-1',sender_id:'student',sender_role:'student',text:'My QR pass is blank',created_at:'2026-11-22T10:00:00Z',updated_at:'2026-11-22T10:00:00Z',expires_at:'2026-11-27T10:00:00Z',read_at:null}:undefined);
 await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Send support message"]')!.click());
 expect(input.value).toBe('');expect(host.querySelector('.support-message')?.textContent).toContain('My QR pass is blank');
});
it('keeps locked conversations readable and disables sending',async()=>{
 mocks.locked=true;
 await act(async()=>root.render(<ChatPanel mode="student" eventId="event-a"/>));
 expect(host.textContent).toContain('Messaging is temporarily paused');
 expect(host.querySelector('.support-composer')).toBeNull();
 expect(mocks.list).toHaveBeenCalledWith('student','event-a');
});
