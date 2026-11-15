import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { hashResetCode, hashResetToken, normalizeResetEmail } from '../netlify/functions/lib/admin-reset';

const db = new PGlite();
beforeAll(async () => {
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
  for (const file of ['20261107000000_admin_reset_tokens.sql', '20261107000001_admin_reset_otp.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
});
afterAll(async () => { await db.close(); });
const issue = async (email: string, hash = 'correct-hash') => (await db.query<{ ok: boolean }>('select issue_admin_reset_otp($1,$2) as ok', [email, hash])).rows[0].ok;
const verify = async (email: string, hash = 'correct-hash', token = 'reset-hash') => (await db.query<{ result: string }>('select verify_admin_reset_otp($1,$2,$3) as result', [email, hash, token])).rows[0].result;

describe('admin OTP recovery database', () => {
  it('limits resend and invalidates an older reset session when issuing a new code', async () => {
    await db.query("insert into admin_reset_tokens(email, token, expires_at) values ($1,'old-token',now()+interval '10 minutes')", ['cooldown@example.test']);
    expect(await issue('cooldown@example.test')).toBe(true);
    expect(await issue('cooldown@example.test', 'replacement')).toBe(false);
    expect((await db.query("select * from admin_reset_tokens where email='cooldown@example.test'")).rows).toHaveLength(0);
    await db.query("update admin_reset_otps set sent_at=now()-interval '61 seconds' where email='cooldown@example.test'");
    expect(await issue('cooldown@example.test', 'replacement')).toBe(true);
    expect(await verify('cooldown@example.test')).toBe('invalid');
    expect(await verify('cooldown@example.test', 'replacement', 'replacement-token')).toBe('verified');
  });
  it('locks after five wrong attempts even if the next code is correct', async () => {
    await issue('locked@example.test');
    for (let i = 0; i < 5; i++) expect(await verify('locked@example.test', 'wrong')).toBe('invalid');
    expect(await verify('locked@example.test')).toBe('locked');
  });
  it('rejects expired and unknown codes', async () => {
    await issue('expired@example.test');
    await db.query("update admin_reset_otps set expires_at=now()-interval '1 second' where email='expired@example.test'");
    expect(await verify('expired@example.test')).toBe('expired');
    expect(await verify('unknown@example.test')).toBe('invalid');
  });
  it('exchanges a correct code exactly once for a short-lived reset token', async () => {
    await issue('valid@example.test');
    expect(await verify('valid@example.test', 'correct-hash', 'unique-reset-token')).toBe('verified');
    expect(await verify('valid@example.test', 'correct-hash', 'replayed')).toBe('invalid');
    const { rows } = await db.query<{ token: string; valid: boolean }>("select token, expires_at>now() and expires_at<=now()+interval '10 minutes' as valid from admin_reset_tokens where email='valid@example.test'");
    expect(rows[0]).toEqual({ token: 'unique-reset-token', valid: true });
  });
  it('denies browser roles access to codes and verification functions', async () => {
    const { rows } = await db.query<{ allowed: boolean }>("select has_table_privilege('anon','admin_reset_otps','SELECT') or has_function_privilege('authenticated','verify_admin_reset_otp(text,text,text)','EXECUTE') as allowed");
    expect(rows[0].allowed).toBe(false);
  });
});
it('normalizes emails and stores keyed OTP hashes and hashed reset tokens', () => {
  expect(normalizeResetEmail(' Owner@Example.Test ')).toBe('owner@example.test');
  expect(normalizeResetEmail({})).toBeNull();
  expect(normalizeResetEmail('invalid')).toBeNull();
  const previous = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-secret';
  try {
    expect(hashResetCode('owner@example.test', '012345')).toMatch(/^[a-f0-9]{64}$/);
    expect(hashResetCode('other@example.test', '012345')).not.toBe(hashResetCode('owner@example.test', '012345'));
    expect(hashResetToken('fixture')).toMatch(/^sha256:[a-f0-9]{64}$/);
  } finally {
    if (previous === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previous;
  }
});
