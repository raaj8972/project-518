import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { handler as requestCode } from '../netlify/functions/request-password-reset';
import { handler as verifyCode } from '../netlify/functions/verify-password-reset-otp';
import { hashResetCode, hashResetToken } from '../netlify/functions/lib/admin-reset';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), maybeSingle: vi.fn(), sendEmail: vi.fn() }));
afterEach(() => vi.unstubAllEnvs());
vi.mock('../netlify/functions/lib/supabase', () => ({ getSupabaseClient: () => ({
  rpc: mocks.rpc,
  from: () => {
    const builder: any = { select: () => builder, eq: () => builder, in: () => builder, maybeSingle: mocks.maybeSingle };
    return builder;
  },
}) }));
vi.mock('../netlify/functions/lib/email', () => ({ sendEmail: mocks.sendEmail }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('APP_URL', 'https://festival.example.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture-only-secret');
  mocks.maybeSingle.mockResolvedValue({ data: { email: 'owner@example.test', role: 'owner' }, error: null });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.sendEmail.mockResolvedValue({ success: true });
});
const invoke = async (handler: typeof requestCode, body: object) => await handler({ httpMethod: 'POST', body: JSON.stringify(body) } as any, {} as any, () => {}) as { statusCode: number; body: string };
it('emails a six-digit code with a recovery navigation link, without returning credentials to the browser', async () => {
  const result = await invoke(requestCode, { email: ' OWNER@EXAMPLE.TEST ' });
  expect(result.statusCode).toBe(200);
  const email = mocks.sendEmail.mock.calls[0][0];
  const code = email.html.match(/font-weight:bold">(\d{6})</)?.[1];
  expect(code).toMatch(/^\d{6}$/);
  expect(email.to).toBe('owner@example.test');
  expect(email.html).toContain('https://festival.example.test/forgot-password?email=owner%40example.test');
  expect(email.html).not.toContain('token=');
  expect(email.html).not.toContain(`code=${code}`);
  expect(result.body).not.toContain(code);
  expect(mocks.rpc).toHaveBeenCalledWith('issue_admin_reset_otp', { p_email: 'owner@example.test', p_code_hash: hashResetCode('owner@example.test', code) });
});
it('enforces the resend limit before sending another email', async () => {
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  expect((await invoke(requestCode, { email: 'owner@example.test' })).statusCode).toBe(429);
  expect(mocks.sendEmail).not.toHaveBeenCalled();
});
it('does not issue recovery credentials for an unregistered email', async () => {
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  expect((await invoke(requestCode, { email: 'unknown@example.test' })).statusCode).toBe(200);
  expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.sendEmail).not.toHaveBeenCalled();
});
it('returns a reset credential only after successful OTP verification and stores its hash', async () => {
  mocks.rpc.mockResolvedValue({ data: 'invalid', error: null });
  const invalid = await invoke(verifyCode, { email: 'owner@example.test', code: '012345' });
  expect(invalid.statusCode).toBe(400); expect(JSON.parse(invalid.body).token).toBeUndefined();
  mocks.rpc.mockResolvedValue({ data: 'verified', error: null });
  const valid = await invoke(verifyCode, { email: 'owner@example.test', code: '012345' });
  const token = JSON.parse(valid.body).token;
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  expect(mocks.rpc).toHaveBeenLastCalledWith('verify_admin_reset_otp', { p_email: 'owner@example.test', p_code_hash: hashResetCode('owner@example.test', '012345'), p_reset_hash: hashResetToken(token) });
});
