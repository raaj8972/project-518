import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ verify: vi.fn(), from: vi.fn(), send: vi.fn(), rpc: vi.fn(), registrations: [] as any[], logs: [] as any[], filters: [] as any[], populated: true, readError: false, logError: false, owner: true }));
vi.mock('../netlify/functions/lib/api-security', () => ({ secureRequest: (_name: string, handler: unknown) => handler }));
vi.mock('../netlify/functions/lib/auth-verify', () => ({ verifyAdmin: mocks.verify }));
vi.mock('../netlify/functions/lib/supabase', () => ({ getSupabaseClient: () => ({ from: mocks.from }) }));
vi.mock('../netlify/functions/lib/email', () => ({ sendEmail: mocks.send }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc: mocks.rpc }) }));
import handler from '../netlify/functions/broadcast-schedule';
beforeEach(() => {
 vi.clearAllMocks(); mocks.registrations = [{ id: '1', email: 'Quiz@college.edu', full_name: 'Quiz participant' }, { id: '2', email: 'quiz@college.edu', full_name: 'Duplicate' }, { id: '3', email: 'band@college.edu', full_name: 'Band participant' }]; mocks.logs = []; mocks.populated = true; mocks.readError = false; mocks.logError = false;
 mocks.verify.mockResolvedValue({ isAdmin: true, isOwner: true }); mocks.rpc.mockResolvedValue({ data: true }); mocks.send.mockResolvedValue({ success: true });
 mocks.from.mockImplementation((table: string) => {
   let start = 0, end = Infinity, inserting = false;
   const query: any = { select: () => query, eq: (key: string, value: unknown) => { mocks.filters.push([table, key, value]); return query; }, gte: (key: string, value: unknown) => { mocks.filters.push([table, key, value]); return query; }, order: () => query, limit: () => query, range: (from: number, to: number) => { start = from; end = to + 1; return query; }, maybeSingle: () => query, insert: () => { inserting = true; return query; }, then: (resolve: (value: any) => unknown) => {
    const data = table === 'registrations' ? mocks.registrations.slice(start, end) : table === 'email_logs' ? inserting ? [] : mocks.logs.slice(start, end) : table === 'schedule_days' ? [{ id: 1, schedule_type: 'mains', title: 'Finale', schedule_events: mocks.populated ? [{ id: 1 }] : [] }] : { brand_year: 2027 };
    return Promise.resolve({ data, error: table === 'registrations' && mocks.readError || inserting && mocks.logError ? { message: 'Database unavailable' } : null }).then(resolve);
   } }; return query;
 });
});
const request = (body: unknown = {}, auth = true) => new Request('http://localhost/api/broadcast-schedule', { method: 'POST', headers: auth ? { authorization: 'Bearer fixture', 'content-type': 'application/json' } : {}, body: JSON.stringify(body) });
it('rejects unauthenticated and unassigned callers before loading the audience', async () => {
 expect((await handler(request({}, false))).status).toBe(401);
 mocks.verify.mockResolvedValueOnce({ isAdmin: false, isOwner: false }); expect((await handler(request())).status).toBe(403);
 mocks.verify.mockResolvedValueOnce({ isAdmin: true, isOwner: false }); mocks.rpc.mockResolvedValueOnce({ data: false }); expect((await handler(request())).status).toBe(403); expect(mocks.from).not.toHaveBeenCalled();
});
it('previews normalized totals without sending, and filters successful deliveries to the last 24 hours', async () => {
 mocks.logs = [{ recipient_email: 'BAND@college.edu' }];
 const response = await handler(request({ dryRun: true })); expect(await response.json()).toMatchObject({ total: 2, pending: 1, sent: 0 }); expect(mocks.send).not.toHaveBeenCalled();
 expect(mocks.filters).toContainEqual(['email_logs', 'status', 'sent']); expect(mocks.filters).toContainEqual(['email_logs', 'email_type', 'schedule_broadcast']); expect(mocks.filters.some(row => row[1] === 'sent_at')).toBe(true);
});
it('paginates beyond 1,000 recipients, sends a bounded batch and reports its remaining audience', async () => {
 mocks.registrations = Array.from({ length: 1003 }, (_, index) => ({ id: String(index), email: `participant-${index}@college.edu` }));
 const response = await handler(request()); expect(await response.json()).toMatchObject({ total: 1003, sent: 100, remaining: 903 }); expect(mocks.send).toHaveBeenCalledTimes(100);
 expect(mocks.send.mock.calls[0][0]).toMatchObject({ subject: 'Ricorrenza 2027 · Festival schedule' }); expect(mocks.send.mock.calls[0][0].html).toContain('Mains');
});
it('stops safely on failed audience reads or an empty programme, and reports delivery log failures', async () => {
 mocks.readError = true; expect((await handler(request())).status).toBe(500); expect(mocks.send).not.toHaveBeenCalled();
 mocks.readError = false; mocks.populated = false; expect((await handler(request())).status).toBe(400); expect(mocks.send).not.toHaveBeenCalled();
 mocks.populated = true; mocks.logError = true; const response = await handler(request()); expect(response.status).toBe(500); expect((await response.json()).error).toContain('avoid duplicate emails');
});
