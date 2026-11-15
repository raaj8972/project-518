import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dualRead, invalidateTableCache } from '../src/lib/dualDb';
import { getBucketObjects, getBucketInventory, computeBucketUsage, computeAllBucketsUsage, invalidateStorageInventory, deleteBucketObject } from '../src/services/storageService';
import { getDataScope } from '../src/utils/dataScope';
import { getRankingData, invalidateRankingData } from '../src/services/rankingData';
import { handler as publicSettings } from '../netlify/functions/public-security-settings';
import { getRoundWinners } from '../src/services/roundWinners';

const mocks = vi.hoisted(() => ({
  authListeners: [] as Array<(event: string, session: any) => void>,
  from: vi.fn(), signals: [] as AbortSignal[], storageList: vi.fn(), remove: vi.fn(), listBuckets: vi.fn(), serverFrom: vi.fn(),
}));
vi.mock('../src/lib/supabase', () => ({ supabase: {
  from: mocks.from,
  auth: { onAuthStateChange: (callback: (event: string, session: any) => void) => { mocks.authListeners.push(callback); return { data: { subscription: { unsubscribe() {} } } }; } },
  storage: { listBuckets: mocks.listBuckets, from: (bucket: string) => ({ list: (prefix: string, options: any) => mocks.storageList(bucket, prefix, options), remove: mocks.remove, getPublicUrl: (name: string) => ({ data: { publicUrl: `https://example.test/${bucket}/${name}` } }) }) },
} }));
vi.mock('../netlify/functions/lib/supabase', () => ({ getSupabaseClient: () => ({ from: mocks.serverFrom }) }));

function builder(result: Promise<any> | any) {
  const query: any = { then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject) };
  for (const method of ['select', 'eq', 'gt', 'in', 'is', 'not', 'or', 'order', 'limit', 'range', 'maybeSingle']) query[method] = () => query;
  query.abortSignal = (signal: AbortSignal) => { mocks.signals.push(signal); return query; };
  return query;
}
let scope = 0;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.signals.length = 0;
  mocks.authListeners.forEach(callback => callback('SIGNED_IN', { user: { id: `fixture-${++scope}`, app_metadata: {} } }));
  invalidateStorageInventory(); invalidateRankingData();
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('database request sharing and authorization boundaries', () => {
  it('shares simultaneous equivalent reads and caches a null single result with its count', async () => {
    let complete!: (value: any) => void;
    mocks.from.mockImplementation(() => builder(new Promise(resolve => { complete = resolve; })));
    const first = dualRead({ table: 'fixture', maybeSingle: true });
    const second = dualRead({ maybeSingle: true, table: 'fixture' });
    complete({ data: null, error: null, count: 0 });
    expect(await first).toMatchObject({ data: null, count: 0 });
    expect(await second).toMatchObject({ data: null });
    expect(await dualRead({ table: 'fixture', maybeSingle: true })).toMatchObject({ data: null, count: 0, source: 'supabase-cache' });
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it('does not let an old in-flight response refill a remotely invalidated cache', async () => {
    let completeOld!: (value: any) => void;
    mocks.from.mockImplementationOnce(() => builder(new Promise(resolve => { completeOld = resolve; })));
    mocks.from.mockImplementationOnce(() => builder({ data: ['new'], error: null }));
    const old = dualRead({ table: 'fixture' });
    invalidateTableCache('fixture');
    await dualRead({ table: 'fixture' });
    completeOld({ data: ['old'], error: null }); await old;
    expect((await dualRead({ table: 'fixture' })).data).toEqual(['new']);
    expect(mocks.from).toHaveBeenCalledTimes(2);
  });
  it('never uses another session or role metadata cache', async () => {
    mocks.from.mockImplementation(() => builder({ data: ['authorized'], error: null }));
    await dualRead({ table: 'fixture' });
    mocks.authListeners.forEach(callback => callback('SIGNED_IN', { user: { id: 'different-user', app_metadata: { role: 'student' } } }));
    await dualRead({ table: 'fixture' });
    mocks.authListeners.forEach(callback => callback('TOKEN_REFRESHED', { user: { id: 'different-user', app_metadata: { role: 'coordinator' } } }));
    await dualRead({ table: 'fixture' });
    expect(mocks.from).toHaveBeenCalledTimes(3);
  });
  it('aborts a stalled read after 12 seconds without starting 94 seconds of retries', async () => {
    vi.useFakeTimers(); vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.from.mockImplementation(() => builder(new Promise(() => {})));
    const read = dualRead({ table: 'fixture' });
    const failed = expect(read).rejects.toThrow('TIMEOUT');
    await vi.advanceTimersByTimeAsync(12000); await failed;
    expect(mocks.signals[0].aborted).toBe(true);
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
});

describe('storage inventory sharing', () => {
  it('scans nested files once for concurrent paging, usage, inventory and global usage', async () => {
    mocks.listBuckets.mockResolvedValue({ data: [{ id: 'fixture' }], error: null });
    mocks.storageList.mockImplementation((_bucket, prefix) => Promise.resolve({ data: prefix ? [{ id: 'nested', name: 'b.jpg', metadata: { size: 50 } }] : [{ id: 'root', name: 'a.jpg', metadata: { size: 100 } }, { name: 'folder', id: null, metadata: null }], error: null }));
    const [page, usage, inventory, all] = await Promise.all([getBucketObjects('fixture', 1, 1), computeBucketUsage('fixture'), getBucketInventory('fixture'), computeAllBucketsUsage()]);
    expect(page.total).toBe(2); expect(page.items).toHaveLength(1);
    expect(usage).toEqual({ totalBytes: 150, count: 2 }); expect(all).toEqual(usage);
    expect(inventory.some(file => file.name === 'folder/b.jpg')).toBe(true);
    expect(mocks.storageList).toHaveBeenCalledTimes(2);
    await getBucketObjects('fixture', 2, 1);
    expect(mocks.storageList).toHaveBeenCalledTimes(2);
  });
  it('invalidates inventory after successful deletion', async () => {
    mocks.storageList.mockResolvedValue({ data: [{ id: 'a', name: 'a.jpg', metadata: { size: 10 } }], error: null });
    mocks.remove.mockResolvedValue({ data: [{ name: 'a.jpg' }], error: null });
    await getBucketInventory('fixture'); await deleteBucketObject('fixture', 'a.jpg'); await getBucketInventory('fixture');
    expect(mocks.storageList).toHaveBeenCalledTimes(2);
  });
});

describe('route scope and shared rankings', () => {
  it('keeps private data out of public/login/student cold starts and enables it for a verified admin route', () => {
    expect(getDataScope('/student/login', false)).toMatchObject({ events: false, personnel: false, management: false, sports: false, gallery: false });
    expect(getDataScope('/sports-admin', false).sports).toBe(false);
    expect(getDataScope('/', false)).toMatchObject({ management: true, privateManagement: false, sports: false, annualSports: false, gallery: false });
    expect(getDataScope('/dashboard', false).privateManagement).toBe(false);
    expect(getDataScope('/admin/events', false).privateManagement).toBe(false);
    expect(getDataScope('/admin/events', true)).toMatchObject({ events: true, personnel: true, privateManagement: true, gallery: true });
    expect(getDataScope('/sports', false).annualSports).toBe(false);
  });
  it('shares the four ranking datasets between concurrent consumers, and invalidates them explicitly', async () => {
    mocks.from.mockImplementation(() => builder({ data: [], error: null }));
    await Promise.all([getRankingData(), getRankingData(), getRankingData()]);
    expect(mocks.from).toHaveBeenCalledTimes(4);
    await getRankingData(); expect(mocks.from).toHaveBeenCalledTimes(4);
    invalidateRankingData(); await getRankingData(); expect(mocks.from).toHaveBeenCalledTimes(8);
  });
});

describe('public settings projection', () => {
  it('returns display controls without passwords, hashes or future private columns', async () => {
    mocks.serverFrom.mockReturnValue(builder({ data: { id: 1, venue: 'Main Hall', panic_mode_enabled: true, council_passcode: 'private', sports_passcode: 'private', council_password_hash: 'private', future_private_column: 'private' }, error: null }));
    const response = await publicSettings({ httpMethod: 'GET' } as any, {} as any, () => {});
    expect(response).toBeDefined();
    expect((response as any).statusCode).toBe(200);
    expect(JSON.parse((response as any).body)).toEqual({ id: 1, venue: 'Main Hall', panic_mode_enabled: true });
  });
});

describe('round winners without a database relationship', () => {
  it('joins only winning registration IDs and omits registrations hidden by RLS', async () => {
    mocks.from.mockImplementationOnce(() => builder({ data: [{ id: 'round1', registration_id: 'visible', prize_rank: '1st' }, { id: 'round2', registration_id: 'private', prize_rank: '2nd' }], error: null }));
    mocks.from.mockImplementationOnce(() => builder({ data: [{ id: 'visible', full_name: 'Winner' }], error: null }));
    const winners = await getRoundWinners();
    expect(winners).toHaveLength(1);
    expect(winners[0]).toMatchObject({ id: 'round1', registration: { id: 'visible', full_name: 'Winner' } });
    expect(mocks.from).toHaveBeenCalledTimes(2);
  });
  it('does not download registrations when no prizes exist', async () => {
    mocks.from.mockImplementationOnce(() => builder({ data: [], error: null }));
    expect(await getRoundWinners()).toEqual([]);
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
});
