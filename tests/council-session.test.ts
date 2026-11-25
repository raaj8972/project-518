import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  createCouncilSessionToken,
  verifyCouncilSessionToken,
  parseCookie,
  getCouncilCookieHeader,
  getCouncilLogoutCookieHeader
} from '../netlify/functions/lib/council-session';

beforeEach(() => {
  vi.stubEnv('PORTAL_PASSWORD_VAULT_KEY', 'fixture-portal-vault-secret-key-32b');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('council session token management', () => {
  it('seals and verifies a valid council passcode', () => {
    const passcode = 'super-secret-council-pin';
    const token = createCouncilSessionToken(passcode);
    expect(token).toBeDefined();
    expect(token).not.toContain(passcode); // ciphertext is encrypted

    const verified = verifyCouncilSessionToken(token);
    expect(verified).toBe(passcode);
  });

  it('rejects an expired token', () => {
    vi.useFakeTimers();
    const token = createCouncilSessionToken('secret');

    // Advance time by 7 hours (limit is 6 hours)
    vi.advanceTimersByTime(7 * 60 * 60 * 1000);

    const verified = verifyCouncilSessionToken(token);
    expect(verified).toBeNull();
  });

  it('rejects a tampered or invalid token', () => {
    expect(verifyCouncilSessionToken('invalid.token.string')).toBeNull();
    expect(verifyCouncilSessionToken('')).toBeNull();
  });

  it('correctly parses cookies from cookie header', () => {
    const header = 'theme=dark; council_session=test-token-123; user_pref=abc';
    expect(parseCookie(header, 'council_session')).toBe('test-token-123');
    expect(parseCookie(header, 'missing')).toBeNull();
    expect(parseCookie(undefined, 'council_session')).toBeNull();
  });

  it('generates secure HttpOnly cookie headers', () => {
    const cookie = getCouncilCookieHeader('test-token');
    expect(cookie).toContain('council_session=test-token');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/');

    const logoutCookie = getCouncilLogoutCookieHeader();
    expect(logoutCookie).toContain('Max-Age=0');
  });
});
