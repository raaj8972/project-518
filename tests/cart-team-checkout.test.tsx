// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter,useLocation} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {CartDrawer} from '../src/components/CartDrawer';
const mocks=vi.hoisted(()=>({items:[] as any[],groups:[] as any[],members:[] as any[],event:{} as any,failGroups:false,from:vi.fn(),rpc:vi.fn(),close:vi.fn(),clear:vi.fn(),remove:vi.fn(),complete:true,check:vi.fn(),addToCart:vi.fn(),refresh:undefined as (()=>Promise<unknown>)|undefined}));
vi.mock('../src/context/EventCartContext',()=>({useEventCart:()=>({cartItems:mocks.items,cartCount:mocks.items.length,isDrawerOpen:true,closeDrawer:mocks.close,clearCart:mocks.clear,removeFromCart:mocks.remove,addToCart:mocks.addToCart})}));
vi.mock('../src/context/StudentAuthContext',()=>({useStudentAuth:()=>({user:{id:'captain',email:'captain@example.test'},profile:{full_name:'Team Captain',is_approved:true},isProfileComplete:mocks.complete})}));
vi.mock('../src/hooks/useScheduleClashCheck',()=>({useScheduleClashCheck:()=>({check:mocks.check,reset:vi.fn(),notice:null})}));
vi.mock('../src/hooks/useDomainRealtime',()=>({useDomainRealtime:(_name:unknown,_enabled:unknown,_tables:unknown,refresh:()=>Promise<unknown>)=>{mocks.refresh=refresh;}}));
vi.mock('../src/hooks/useFestivalDialog',()=>({useFestivalDialog:()=>({current:null})}));
vi.mock('../src/lib/supabase',()=>({supabase:{from:mocks.from,rpc:mocks.rpc}}));
vi.mock('qrcode.react',()=>({QRCodeSVG:()=> <svg data-payment-qr/>}));
vi.mock('react-hot-toast',()=>({toast:{error:vi.fn(),success:vi.fn()}}));
function builder(table:string){
 const fields:string[]=[];
 const query:any={select(value:string){fields.push(value);return query;},eq(){return query;},in(){return query;},then(resolve:any){
  const data=table==='events'?[mocks.event]:table==='profiles'?[{id:'captain',full_name:'Captain'},{id:'member',full_name:'Member'}]:table==='student_groups'?mocks.groups:fields.some(value=>value.includes('student_groups('))?[]:mocks.members;
  return Promise.resolve({data,error:mocks.failGroups&&table==='student_groups'?new Error('Offline'):null}).then(resolve);
 }};return query;
}
let root:Root,host:HTMLDivElement;
function Page(){return <><CartDrawer/><Location/></>;}
function Location(){return <output data-location>{useLocation().pathname+useLocation().search}</output>;}
async function render(){await act(async()=>root.render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Page/></MemoryRouter>));}
function button(label:string){return [...document.querySelectorAll<HTMLButtonElement>('.event-cart-drawer button')].find(button=>button.textContent?.trim()===label)!;}
beforeEach(()=>{
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;vi.clearAllMocks();mocks.groups=[];mocks.members=[];mocks.failGroups=false;mocks.complete=true;mocks.check.mockResolvedValue(true);
 mocks.items=[{id:'dance',title:'Group Dance',isTeam:true,min_team:2,max_team:3}];mocks.event={id:'dance',title:'Group Dance',registration_open:true,registration_default_mode:'team',team_min_members:2,team_max_members:3,payment_enabled:false};mocks.from.mockImplementation(builder);mocks.rpc.mockResolvedValue({data:{},error:null});host=document.createElement('div');document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
it('blocks missing-team checkout and opens Create team without losing the cart',async()=>{
 await render();expect(button('Register for 1 event').disabled).toBe(true);expect(button('Create a team')).toBeTruthy();
 await act(async()=>button('Create a team').click());expect(host.querySelector('[data-location]')?.textContent).toBe('/dashboard/teams?from=cart&create=1');expect(mocks.close).toHaveBeenCalled();expect(mocks.clear).not.toHaveBeenCalled();expect(mocks.remove).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled();
});
it('counts distinct accepted participants and becomes ready when invitations are accepted',async()=>{
 mocks.groups=[{id:'team',owner_id:'captain',name:'Crew'}];mocks.members=[{user_id:'captain',status:'accepted'},{user_id:'member',status:'pending'}];
 await render();expect(button('Register for 1 event').disabled).toBe(true);expect(document.querySelector('.event-cart-drawer')?.textContent).toContain('Team has 1 accepted participant');
 mocks.members=[{user_id:'captain',status:'accepted'},{user_id:'member',status:'accepted'},{user_id:'member',status:'accepted'}];await act(async()=>{await mocks.refresh!();});expect(document.querySelector('.event-cart-drawer')?.textContent).toContain('Team ready · 2 accepted participants');expect(button('Register for 1 event').disabled).toBe(false);
});
it('checks current team requirements before showing payment instructions or writing registration',async()=>{
 mocks.groups=[{id:'team',owner_id:'captain',name:'Crew'}];mocks.members=[{user_id:'member',status:'accepted'}];
 Object.assign(mocks.items[0],{payment_enabled:true,payment_amount:100,coordinator_upi_id:'event@example'});Object.assign(mocks.event,{team_min_members:3,payment_enabled:true,payment_amount:100,coordinator_upi_id:'event@example'});
 await render();expect(button('Continue to payment').disabled).toBe(false);await act(async()=>button('Continue to payment').click());
 expect(document.querySelector('.event-cart-drawer [role="alert"]')?.textContent).toContain('needs 3 accepted participants');expect(document.querySelector('[data-payment-qr]')).toBeNull();expect(mocks.rpc).not.toHaveBeenCalled();
});
it('shows group read failures with Retry rather than claiming no team exists',async()=>{
 mocks.failGroups=true;await render();expect(document.querySelector('.event-cart-drawer')?.textContent).toContain('Your teams could not load');expect(document.querySelector('.event-cart-drawer')?.textContent).not.toContain('Create a team to continue');expect(button('Register for 1 event').disabled).toBe(true);
 mocks.failGroups=false;await act(async()=>button('Try again').click());expect(button('Create a team')).toBeTruthy();
});
it('registers a valid team with deduplicated accepted members',async()=>{
 mocks.groups=[{id:'team',owner_id:'captain',name:'Crew'}];mocks.members=[{user_id:'captain',status:'accepted'},{user_id:'member',status:'accepted'},{user_id:'ignored',status:'pending'}];await render();
 await act(async()=>button('Register for 1 event').click());expect(mocks.rpc).toHaveBeenCalledWith('checkout_student_event',expect.objectContaining({p_event_id:'dance',p_user_ids:['captain','member'],p_team_name:'Crew',p_utr:null}));expect(mocks.remove).toHaveBeenCalledWith('dance');
});
it('shows payment only for a ready team and requires a valid reference before submission',async()=>{
 mocks.groups=[{id:'team',owner_id:'captain',name:'Crew'}];mocks.members=[{user_id:'member',status:'accepted'}];
 Object.assign(mocks.items[0],{payment_enabled:true,payment_amount:100,coordinator_upi_id:'event@example'});Object.assign(mocks.event,{payment_enabled:true,payment_amount:100,coordinator_upi_id:'event@example'});
 await render();await act(async()=>button('Continue to payment').click());expect(document.querySelector('[data-payment-qr]')).not.toBeNull();expect(button('Submit payment for review').disabled).toBe(true);expect(mocks.rpc).not.toHaveBeenCalled();
 const input=document.querySelector('.event-cart-drawer input') as HTMLInputElement;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'TEST-REFERENCE-123');input.dispatchEvent(new Event('input',{bubbles:true}));});
 expect(button('Submit payment for review').disabled).toBe(false);await act(async()=>button('Submit payment for review').click());expect(mocks.rpc).toHaveBeenCalledWith('checkout_student_event',expect.objectContaining({p_utr:'TEST-REFERENCE-123',p_user_ids:['captain','member']}));
});

it('keeps locked individual events individual even when unused team limits exist',async()=>{mocks.items=[{id:'dance',title:'Solo',isTeam:false}];Object.assign(mocks.event,{registration_default_mode:'individual',registration_mode_locked:true,team_max_members:5});mocks.from.mockImplementation((table:string)=>table==='profiles'?{select:()=>({in:async()=>({data:[{id:'captain',full_name:'Captain'}],error:null})})}:builder(table));await render();await act(async()=>button('Register for 1 event').click());expect(mocks.rpc).toHaveBeenCalledWith('checkout_student_event',expect.objectContaining({p_user_ids:['captain'],p_team_name:null,p_expected_payment:{enabled:false,amount:0,upi:null}}));});
it('blocks registration from support while profile completion is still pending',async()=>{mocks.complete=false;await render();expect(button('Register for 1 event').disabled).toBe(true);expect(document.querySelector('.event-cart-drawer')?.textContent).toContain('Open profile setup');expect(mocks.rpc).not.toHaveBeenCalled();});
it('blocks a schedule clash before payment or any registration writes',async()=>{mocks.groups=[{id:'team',owner_id:'captain',name:'Crew'}];mocks.members=[{user_id:'member',status:'accepted'}];mocks.check.mockResolvedValue(false);await render();await act(async()=>button('Register for 1 event').click());expect(mocks.check).toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled();});
it('invalidates the entered reference when the reviewed payment amount changes',async()=>{mocks.groups=[{id:'team',owner_id:'captain',name:'Crew'}];mocks.members=[{user_id:'member',status:'accepted'}];Object.assign(mocks.items[0],{payment_enabled:true,payment_amount:100,coordinator_upi_id:'event@example'});Object.assign(mocks.event,{payment_enabled:true,payment_amount:100,coordinator_upi_id:'event@example'});await render();await act(async()=>button('Continue to payment').click());const input=document.querySelector('.event-cart-drawer input')!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'PAID-OLD-123');input.dispatchEvent(new Event('input',{bubbles:true}));});mocks.event.payment_amount=200;await act(async()=>button('Submit payment for review').click());expect(mocks.rpc).not.toHaveBeenCalled();expect(document.querySelector('.event-cart-drawer [role=alert]')?.textContent).toContain('Payment details');expect(button('Continue to payment')).toBeTruthy();await act(async()=>button('Continue to payment').click());expect((document.querySelector('.event-cart-drawer input') as HTMLInputElement).value).toBe('');});

it('requires a fresh review if a paid event becomes free while a transaction reference is entered',async()=>{mocks.groups=[{id:'team',owner_id:'captain',name:'Crew'}];mocks.members=[{user_id:'member',status:'accepted'}];Object.assign(mocks.items[0],{payment_enabled:true,payment_amount:100,coordinator_upi_id:'event@example'});Object.assign(mocks.event,{payment_enabled:true,payment_amount:100,coordinator_upi_id:'event@example'});await render();await act(async()=>button('Continue to payment').click());const input=document.querySelector('.event-cart-drawer input')!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'PAID-OLD-123');input.dispatchEvent(new Event('input',{bubbles:true}));});mocks.event.payment_enabled=false;mocks.event.payment_amount=0;await act(async()=>button('Submit payment for review').click());expect(mocks.rpc).not.toHaveBeenCalled();expect(document.querySelector('.event-cart-drawer [role=alert]')?.textContent).toContain('before paying again');expect(button('Register for 1 event')).toBeTruthy();expect(document.querySelector('[data-payment-qr]')).toBeNull();});

it('keeps a failed checkout in the cart and offers the correct coordinator conversation',async()=>{mocks.groups=[{id:'team',owner_id:'captain',name:'Crew'}];mocks.members=[{user_id:'member',status:'accepted'}];mocks.rpc.mockResolvedValue({data:null,error:{message:'This event is full'}});await render();await act(async()=>button('Register for 1 event').click());expect(document.querySelector('.event-cart-drawer [role=alert]')?.textContent).toContain('This event is full');expect(mocks.clear).not.toHaveBeenCalled();expect(mocks.remove).not.toHaveBeenCalled();await act(async()=>button('Get help with this event').click());expect(host.querySelector('[data-location]')?.textContent).toBe('/dashboard/messages?type=event&event=dance');});
