// @vitest-environment jsdom
import React, { act } from 'react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import EventsPanel from '../src/pages/dashboard/Events';
import { invokeHandler } from '../netlify/functions/lib/invoke-handler';
import { handler as councilLogin } from '../netlify/functions/verify-council';
import { handler as sportsLogin } from '../netlify/functions/verify-sports';
import { getBucketObjects, computeBucketUsage, deleteBucketObject, invalidateStorageInventory } from '../src/services/storageService';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WatchLiveButton from '../src/components/WatchLiveButton';
import { handler as crLogin } from '../netlify/functions/cr-login';
import { dualUpdate } from '../src/lib/dualDb';
import { eventCalendar } from '../src/utils/eventActions';
import { groupParticipantIds } from '../src/utils/cartParticipants';

const mocks = vi.hoisted(() => ({ client: { rpc: vi.fn(), auth: { admin: { generateLink: vi.fn(), updateUserById: vi.fn() }, signInWithPassword: vi.fn() }, from: vi.fn() }, verify: vi.fn(), query: vi.fn(), storage: { from: vi.fn(), listBuckets: vi.fn() } }));
vi.mock('../src/lib/supabase', () => ({ supabase: { storage: mocks.storage, from: mocks.query, auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } } }));
vi.mock('../netlify/functions/lib/supabase', () => ({ getSupabaseClient: () => mocks.client }));
vi.mock('../netlify/functions/lib/auth-verify', () => ({ verifyAdmin: mocks.verify }));
import { handler as coordinatorLogin } from '../netlify/functions/coordinator-login';
import { handler as securityControls } from '../netlify/functions/admin-security-controls';

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  invalidateStorageInventory();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('event and group actions', () => {
  it('exports an all-day calendar event with escaped text and an exclusive next-day end', () => {
    const result = eventCalendar({ id: '1', title: 'Dance, Music; Fest', date: '2026-12-31', time: '6 PM', venue: 'Main Hall' });
    expect(result).toContain('DTSTART;VALUE=DATE:20261231');
    expect(result).toContain('DTEND;VALUE=DATE:20270101');
    expect(result).toContain('SUMMARY:Dance\\, Music\\; Fest');
    expect(result).toContain('Time: 6 PM');
  });
  it('does not invent a calendar date for an unscheduled event', () => {
    expect(() => eventCalendar({ title: 'Unscheduled' })).toThrow('confirmed date');
  });
  it('includes the actual owner, deduplicates accepted members and excludes pending members', () => {
    expect(groupParticipantIds({ owner_id: 'owner', members: [{ user_id: 'member', status: 'accepted' }, { user_id: 'owner', status: 'accepted' }, { user_id: 'pending', status: 'pending' }] })).toEqual(['owner','member']);
  });
});

describe('live stream availability', () => {
  it('handles invalid, hidden, countdown and live states without changing hook ordering', async () => {
    const start = new Date('2026-11-10T10:00:00Z');
    const render = async (now: number, date: string | Date = start) => act(async () => root.render(<WatchLiveButton url="https://example.test/live" startTime={date} now={now} />));
    await render(start.getTime(), 'invalid');
    expect(container.textContent).toContain('TBD');
    await render(start.getTime() - 2 * 3600000);
    expect(container.querySelector('button, a')).toBeNull();
    await render(start.getTime() - 60000);
    expect(container.querySelector('button')?.disabled).toBe(true);
    await render(start.getTime());
    expect(container.querySelector('a')?.href).toBe('https://example.test/live');
  });
  it('becomes visible as time advances even when it mounted outside the lead window', async () => {
    vi.useFakeTimers(); const start = new Date('2026-11-10T10:00:00Z');
    vi.setSystemTime(start.getTime() - 3601000);
    await act(async () => root.render(<WatchLiveButton url="https://example.test/live" startTime={start} />));
    expect(container.querySelector('button')).toBeNull();
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(container.querySelector('button')?.disabled).toBe(true);
  });
});

const request = (body: unknown) => ({ httpMethod:'POST', headers:{ authorization:'Bearer test-session' }, body: JSON.stringify(body) }) as any;
const run = (handler: any, body: unknown) => handler(request(body), {}, () => {});

describe('server authorization', () => {
  it('never provisions a coordinator identity before verifying the event password', async () => {
    mocks.client.rpc.mockResolvedValueOnce({data:{allowed:true},error:null}).mockResolvedValueOnce({data:false,error:null}).mockResolvedValueOnce({error:null});
    const result = await run(coordinatorLogin, {eventId:'one',password:'wrong'});
    expect(result.statusCode).toBe(401);
    expect(mocks.client.auth.admin.generateLink).not.toHaveBeenCalled();
  });
  it('scopes the real coordinator identity before returning a one-time login token', async () => {
    mocks.client.rpc.mockResolvedValueOnce({data:{allowed:true},error:null}).mockResolvedValueOnce({data:true,error:null});
    mocks.client.auth.admin.generateLink.mockResolvedValue({data:{user:{id:'staff',app_metadata:{}},properties:{hashed_token:'one-time'}},error:null});
    mocks.client.auth.admin.updateUserById.mockResolvedValue({error:null});
    const result = await run(coordinatorLogin,{eventId:'one',password:'test-password'});
    expect(result.statusCode).toBe(200);
    expect(mocks.client.auth.admin.updateUserById).toHaveBeenCalledWith('staff', {app_metadata:{role:'coordinator',coordinator_event_id:'one'}});
    expect(JSON.parse(result.body)).toEqual({token_hash:'one-time',type:'magiclink'});
    expect(result.body).not.toContain('test-password');
  });
  it('rejects anonymous security controls and nonowner user-list access', async () => {
    mocks.verify.mockResolvedValueOnce({user:null,isAdmin:false,isOwner:false});
    expect((await run(securityControls,{action:'list_users'})).statusCode).toBe(401);
    mocks.verify.mockResolvedValueOnce({user:{id:'admin'},isAdmin:true,isOwner:false});
    expect((await run(securityControls,{action:'list_users'})).statusCode).toBe(403);
  });
  it('enforces the same minimum password length and revokes sessions after an account password change', async () => {
    mocks.verify.mockResolvedValue({user:{id:'admin',email:'admin@example.test'},isAdmin:true,isOwner:false});
    expect((await run(securityControls,{action:'update_password',targetUserId:'admin',newPassword:'short'})).statusCode).toBe(400);
    expect((await run(securityControls,{action:'update_password',targetUserId:'someone-else',newPassword:'long-password'})).statusCode).toBe(403);
    mocks.client.auth.admin.updateUserById.mockResolvedValue({error:null});
    mocks.client.rpc.mockResolvedValue({error:null});
    expect((await run(securityControls,{action:'update_password',targetUserId:'admin',newPassword:'long-password'})).statusCode).toBe(200);
    expect(mocks.client.rpc).toHaveBeenCalledWith('revoke_user_sessions',{p_user_id:'admin'});
  });
  it('does not unlock security settings with an arbitrary nonempty password', async () => {
    mocks.verify.mockResolvedValue({user:{id:'admin',email:'admin@example.test'},isAdmin:true,isOwner:true});
    mocks.client.auth.signInWithPassword.mockResolvedValue({data:{user:null},error:new Error('invalid')});
    expect((await run(securityControls,{action:'verify_password',password:'anything'})).statusCode).toBe(403);
  });
});


describe('working panel contracts', () => {
  it('shows the actual registration state rather than confirming unpaid registrations', async () => {
    const Context = () => <Outlet context={{ dataLoading:false, registrations:[{id:'reg',event_id:'event',status:'payment_pending',event:{title:'Paid event'}}] }} />;
    await act(async () => root.render(<MemoryRouter initialEntries={['/dashboard/events']} future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Routes><Route path="/dashboard" element={<Context />}><Route path="events" element={<EventsPanel />} /></Route></Routes></MemoryRouter>));
    expect(container.textContent).toContain('payment pending');
    expect(container.textContent).not.toContain('Confirmed');
    expect(container.querySelectorAll('button').length).toBeGreaterThan(1);
  });
  it('adapts modern Request/Response functions without breaking JSON bodies or headers', async () => {
    const result = await invokeHandler({ default: async (request: Request) => {
      expect(await request.json()).toEqual({ action:'test' });
      return Response.json({ ok:true }, { status:201, headers:{'X-Test':'passed'} });
    } }, { httpMethod:'POST', path:'/api/test', rawUrl:'http://localhost/api/test', headers:{'Content-Type':'application/json'}, body:'{"action":"test"}' });
    expect(result.statusCode).toBe(201);
    expect(result.headers['x-test']).toBe('passed');
    expect(JSON.parse(Buffer.from(result.body,'base64').toString())).toEqual({ok:true});
  });
  it('preserves legacy event handlers', async () => {
    const result = await invokeHandler({ handler: async (event: any) => ({statusCode:405,body:event.httpMethod}) }, {httpMethod:'GET'});
    expect(result).toEqual({statusCode:405,body:'GET'});
  });
  it('returns council success without leaking a shared sports password', async () => {
    mocks.client.rpc.mockResolvedValueOnce({data:{allowed:true},error:null}).mockResolvedValueOnce({data:true,error:null});
    const result = await run(councilLogin,{passcode:'test-code'});
    expect(JSON.parse(result.body)).toEqual({success:true});
    expect(mocks.client.auth.admin.generateLink).not.toHaveBeenCalled();
  });
  it('retires the shared sports passcode login in favour of individual admin permissions', async () => {
    const result = await run(sportsLogin,{passcode:'test-code'});
    expect(result.statusCode).toBe(410);
    expect(JSON.parse(result.body).loginUrl).toBe('/login');
    expect(mocks.client.auth.admin.generateLink).not.toHaveBeenCalled();
  });
});

describe('storage controls', () => {
  it('lists actual nested files and computes their sizes', async () => {
    mocks.storage.from.mockImplementation(() => ({
      list: async (prefix: string) => ({data:prefix?[{id:'nested',name:'b.jpg',metadata:{size:20},created_at:'2026-01-02'}]:[{id:'root',name:'a.jpg',metadata:{size:10},created_at:'2026-01-01'},{id:null,name:'folder',metadata:null}],error:null}),
      getPublicUrl: (name: string) => ({data:{publicUrl:`https://example.test/${name}`}})
    }));
    expect(await computeBucketUsage('gallery')).toEqual({totalBytes:30,count:2});
    const listed = await getBucketObjects('gallery',1,1);
    expect(listed.total).toBe(2);
    expect(listed.items[0].name).toBe('folder/b.jpg');
  });
  it('never reports a successful deletion when storage removed no files', async () => {
    mocks.storage.from.mockReturnValue({remove:async()=>({data:[],error:null})});
    await expect(deleteBucketObject('gallery','missing.jpg')).rejects.toThrow('could not be deleted');
  });
});


describe('additional authorization regressions', () => {
  it('never treats an RLS-filtered update as a successful save', async () => {
    const query = {update:()=>query,eq:()=>query,select:async()=>({data:[],error:null})};
    mocks.query.mockReturnValue(query);
    await expect(dualUpdate('events','one',{title:'Denied'})).rejects.toThrow('No record was updated');
  });
  it('scopes a CR identity to the verified batch and never returns the password', async () => {
    mocks.client.rpc.mockResolvedValueOnce({data:{allowed:true},error:null}).mockResolvedValueOnce({data:true,error:null});
    mocks.client.auth.admin.generateLink.mockResolvedValue({data:{user:{id:'cr',app_metadata:{}},properties:{hashed_token:'cr-once'}},error:null});
    mocks.client.auth.admin.updateUserById.mockResolvedValue({error:null});
    const result = await run(crLogin,{batch:'A',password:'test-cr-password'});
    expect(result.statusCode).toBe(200);
    expect(mocks.client.auth.admin.updateUserById).toHaveBeenCalledWith('cr',{app_metadata:{role:'cr',cr_batch:'A'}});
    expect(result.body).not.toContain('test-cr-password');
  });
  it('does not expose scheduled cleanup through a public API invocation', async () => {
    vi.stubEnv('CRON_SECRET','test-cron-secret');
    const scheduledHandler = vi.fn(async()=>({statusCode:200,body:'done'}));
    const rejected = await invokeHandler({scheduledHandler},{httpMethod:'GET',headers:{}});
    expect(rejected.statusCode).toBe(401); expect(scheduledHandler).not.toHaveBeenCalled();
    expect((await invokeHandler({scheduledHandler},{httpMethod:'GET',headers:{authorization:'Bearer test-cron-secret'}})).statusCode).toBe(200);
    expect(scheduledHandler).toHaveBeenCalledOnce();
  });
  it('rejects impossible dates instead of silently moving calendar events to another month', () => {
    expect(()=>eventCalendar({title:'Bad date',date:'2026-02-31'})).toThrow('confirmed date');
  });
});
