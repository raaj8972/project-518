import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { handler } from '../netlify/functions/council-manage';
import { createCouncilSessionToken, getCouncilCookieHeader } from '../netlify/functions/lib/council-session';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn()
}));

vi.mock('../netlify/functions/lib/supabase', () => ({
  getSupabaseClient: () => ({
    rpc: mocks.rpc,
    from: mocks.from
  })
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('PORTAL_PASSWORD_VAULT_KEY', 'fixture-vault-secret-key-32b-length');
  mocks.rpc.mockImplementation(async (name: string, args: any) => {
    if (name === 'check_rate_limit') return { data: { allowed: true }, error: null };
    if (name === 'verify_council_password') return { data: args.p_password === 'valid-pass', error: null };
    if (name === 'get_council_dashboard_stats_v3') return { data: { total_registrations: 42 }, error: null };
    if (name === 'get_council_vip_passes_v3') return { data: [{ pass_id: 'vip-1' }], error: null };
    if (name === 'record_failed_attempt') return { data: null, error: null };
    return { data: null, error: null };
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const invoke = async (body: any, headers: Record<string, string> = {}) => {
  return await handler({
    httpMethod: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  } as any, {} as any, () => {}) as any;
};

describe('council-manage API handler', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await invoke({ action: 'get-stats' });
    expect(res.statusCode).toBe(401);
  });

  it('authenticates via HttpOnly cookie with session token', async () => {
    const token = createCouncilSessionToken('valid-pass');
    const cookie = `council_session=${token}`;
    const res = await invoke({ action: 'get-stats' }, { cookie });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.success).toBe(true);
    expect(data.stats).toEqual({ total_registrations: 42 });
  });

  it('authenticates via Authorization Bearer token with session token', async () => {
    const token = createCouncilSessionToken('valid-pass');
    const res = await invoke({ action: 'get-stats' }, { authorization: `Bearer ${token}` });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.success).toBe(true);
  });

  it('authenticates via body councilToken', async () => {
    const token = createCouncilSessionToken('valid-pass');
    const res = await invoke({ action: 'get-stats', councilToken: token });

    expect(res.statusCode).toBe(200);
  });

  it('rejects a raw legacy password even when it matches current council credentials', async () => {
    const res = await invoke({ action: 'get-stats', councilPassword: 'valid-pass' });
    expect(res.statusCode).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalledWith('get_council_dashboard_stats_v3', expect.anything());
  });

  it('clears session cookie on logout action', async () => {
    const res = await invoke({ action: 'logout' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['Set-Cookie']).toContain('Max-Age=0');
  });
});

it('rechecks sealed sessions and rejects rotated or disabled council credentials before database access', async () => {
 const token = createCouncilSessionToken('retired-pass');
 const res = await invoke({action:'get-all'}, {cookie:`council_session=${token}`});
 expect(res.statusCode).toBe(401);
 expect(mocks.from).not.toHaveBeenCalled();
});
it('fails closed when council rate limiting is unavailable', async () => {
 mocks.rpc.mockResolvedValue({data:null,error:{message:'database offline'}});
 expect((await invoke({action:'get-all',councilPassword:'valid-pass'})).statusCode).toBe(503);
 expect(mocks.from).not.toHaveBeenCalled();
});
it('does not treat a student or administrator bearer JWT as a council session', async () => {
 expect((await invoke({action:'get-all'},{authorization:'Bearer eyJhbGciOiJIUzI1NiJ9.student.signature'})).statusCode).toBe(401);
 expect(mocks.from).not.toHaveBeenCalled();
});
it('rejects session access if council authorization cannot be checked', async () => {
 const token = createCouncilSessionToken('valid-pass');
 mocks.rpc.mockImplementation(async (name:string) => name === 'check_rate_limit'
 ? {data:{allowed:true},error:null} : {data:null,error:{message:'offline'}});
 expect((await invoke({action:'get-all'},{cookie:`council_session=${token}`})).statusCode).toBe(503);
 expect(mocks.from).not.toHaveBeenCalled();
});
