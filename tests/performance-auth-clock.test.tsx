// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { StudentAuthProvider, useStudentAuth } from '../src/context/StudentAuthContext';
import { useSecondClock } from '../src/hooks/useSecondClock';

const mocks = vi.hoisted(() => ({ from: vi.fn(), session: vi.fn(), callback: undefined as undefined | ((event: string, session: any) => void) }));
vi.mock('../src/services/studentTeams', () => ({ getCollegeIdentity: async () => null }));
vi.mock('../src/lib/supabase', () => ({ supabase: {
  from: mocks.from,
  auth: { getSession: mocks.session, onAuthStateChange: (callback: any) => { mocks.callback = callback; return { data: { subscription: { unsubscribe() {} } } }; } },
  channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: vi.fn(),
} }));

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); });
const user = { id: 'student', user_metadata: {}, app_metadata: {} };
function Profile() { const state = useStudentAuth(); return <div>{state.user?.id || 'anonymous'}:{state.profile?.id || 'none'}:{String(state.loading)}</div>; }
function profileQuery(result: Promise<any> | any) {
  const query: any = { select: () => query, eq: () => query, single: () => Promise.resolve(result) };
  return query;
}
it('uses one shared ticking interval for multiple subscribers and clears it on unmount', async () => {
  function Clock() { return <span>{useSecondClock()}</span>; }
  await act(async () => root.render(<><Clock /><Clock /></>));
  expect(vi.getTimerCount()).toBe(1);
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  const values = [...container.querySelectorAll('span')].map(node => node.textContent);
  expect(values[0]).toBe(values[1]);
  await act(async () => root.render(null)); expect(vi.getTimerCount()).toBe(0);
});
it('deduplicates initial auth/profile loading and does not reload on token refresh', async () => {
  mocks.session.mockResolvedValue({ data: { session: { user } } });
  mocks.from.mockImplementation(() => profileQuery({ data: { id: 'student' }, error: null }));
  await act(async () => root.render(<StudentAuthProvider><Profile /></StudentAuthProvider>));
  await act(async () => { mocks.callback?.('INITIAL_SESSION', { user }); await vi.advanceTimersByTimeAsync(0); });
  expect(mocks.from).toHaveBeenCalledTimes(1);
  expect(container.textContent).toBe('student:student:false');
  await act(async () => { mocks.callback?.('TOKEN_REFRESHED', { user }); await vi.advanceTimersByTimeAsync(0); });
  expect(mocks.from).toHaveBeenCalledTimes(1);
  expect(container.textContent).toBe('student:student:false');
});
it('does not restore a signed-out student from an earlier in-flight profile request', async () => {
  let complete!: (value: any) => void;
  mocks.session.mockResolvedValue({ data: { session: { user } } });
  mocks.from.mockImplementation(() => profileQuery(new Promise(resolve => { complete = resolve; })));
  await act(async () => root.render(<StudentAuthProvider><Profile /></StudentAuthProvider>));
  await act(async () => vi.advanceTimersByTimeAsync(0));
  await act(async () => { mocks.callback?.('SIGNED_OUT', null); complete({ data: { id: 'student' }, error: null }); });
  expect(container.textContent).toBe('anonymous:none:false');
});
it('invalidates an earlier request when the same account signs out and signs back in',async()=>{
 const pending:Array<(value:any)=>void>=[];mocks.session.mockResolvedValue({data:{session:{user}}});mocks.from.mockImplementation(()=>profileQuery(new Promise(resolve=>pending.push(resolve))));
 function Name(){const state=useStudentAuth();return <p>{state.profile?.full_name||'none'}</p>;}
 await act(async()=>root.render(<StudentAuthProvider><Name/></StudentAuthProvider>));await act(async()=>vi.advanceTimersByTimeAsync(0));
 await act(async()=>{mocks.callback?.('SIGNED_OUT',null);mocks.callback?.('SIGNED_IN',{user});await vi.advanceTimersByTimeAsync(0);});expect(pending).toHaveLength(2);
 await act(async()=>pending[0]({data:{id:'student',full_name:'Outdated profile'},error:null}));expect(container.textContent).toBe('none');
 await act(async()=>pending[1]({data:{id:'student',full_name:'Current profile'},error:null}));expect(container.textContent).toBe('Current profile');
});
