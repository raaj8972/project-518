// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import EventWhatsAppGroup from '../src/components/shared/EventWhatsAppGroup';
import { EventDetailsModal } from '../src/components/Events/EventDetailsModal';
const mocks=vi.hoisted(()=>({user:{id:'student'} as {id:string}|null, get:vi.fn(), callbacks:new Map<string,()=>void>()}));
vi.mock('../src/context/StudentAuthContext',()=>({useStudentAuth:()=>({user:mocks.user})}));
vi.mock('../src/services/eventWhatsAppGroups',()=>({getEventWhatsAppGroup:mocks.get}));
vi.mock('../src/hooks/useFestivalDialog',()=>({useFestivalDialog:()=>({current:null})}));
vi.mock('../src/lib/supabase',()=>({supabase:{
 channel:()=>{const channel={on:(_kind:unknown,filter:{table:string},callback:()=>void)=>{mocks.callbacks.set(filter.table,callback);return channel;},subscribe:()=>channel};return channel;},removeChannel:vi.fn(),
}}));
let root:Root,host:HTMLDivElement;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;mocks.user={id:'student'};mocks.get.mockReset();mocks.get.mockResolvedValue(null);mocks.callbacks.clear();host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
async function render(eligible=true){await act(async()=>root.render(<EventWhatsAppGroup eventId="dance" eligible={eligible}/>));}
it('shows no URL before registration, when anonymous, or while waiting for coordinator approval',async()=>{
 await render(false);expect(mocks.get).not.toHaveBeenCalled();expect(host.textContent).toContain('after coordinator approval');expect(host.querySelector('a')).toBeNull();
 await render(true);expect(mocks.get).toHaveBeenCalledWith('dance');expect(host.querySelector('a')).toBeNull();
 mocks.user=null;await render(true);expect(host.querySelector('a')).toBeNull();
});
it('unlocks the protected link after approval and removes it after access is revoked',async()=>{
 await render();expect(host.querySelector('a')).toBeNull();
 mocks.get.mockResolvedValue('https://chat.whatsapp.com/ApprovedInvite');
 await act(async()=>mocks.callbacks.get('registrations')!());expect(host.querySelector('a')?.getAttribute('href')).toBe('https://chat.whatsapp.com/ApprovedInvite');
 mocks.get.mockResolvedValue(null);await act(async()=>mocks.callbacks.get('registrations')!());expect(host.querySelector('a')).toBeNull();
});
it('never reuses a former account’s in-flight group link and fails closed on errors',async()=>{
 let resolve!:(value:string)=>void;mocks.get.mockReturnValueOnce(new Promise<string>(done=>{resolve=done;}));await render();
 mocks.user={id:'another-student'};mocks.get.mockResolvedValue(null);await render();await act(async()=>resolve('https://chat.whatsapp.com/OldAccountInvite'));expect(host.querySelector('a')).toBeNull();
 mocks.get.mockRejectedValue(new Error('Network unavailable'));await act(async()=>mocks.callbacks.get('event_whatsapp_groups')!());expect(host.querySelector('[role="alert"]')).not.toBeNull();expect(host.querySelector('a')).toBeNull();
});
it('ignores legacy invite URLs on public event objects instead of rendering them',async()=>{
 await act(async()=>root.render(<EventDetailsModal event={{id:'dance',title:'Dance',category:'Cultural',date:'2026-11-23',whatsapp_group_link:'https://chat.whatsapp.com/LegacyPublicInvite'}} coordinators={[]} eventWinners={[]} origin={{x:'50%',y:'50%'}} onClose={()=>{}} onOpenRules={()=>{}} onRegister={()=>{}} isRegistered={false} isPaymentPending={false} isOwner={false} updateEvent={async()=>{}}/>));
 expect(document.querySelector('.arena-details')?.textContent).toContain('after coordinator approval');expect(document.querySelector('a[href*="LegacyPublicInvite"]')).toBeNull();expect(mocks.get).not.toHaveBeenCalled();
});
