import { openPortalPassword, sealPortalPassword } from './portal-password-vault';

const IDENTITY = 'council_session';
const SESSION_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface CouncilSessionData {
  passcode: string;
  exp: number;
}

export function createCouncilSessionToken(passcode: string): string {
  const payload: CouncilSessionData = {
    passcode,
    exp: Date.now() + SESSION_DURATION_MS
  };
  return sealPortalPassword(IDENTITY, JSON.stringify(payload));
}

export function verifyCouncilSessionToken(token: string): string | null {
  if (!token || typeof token !== 'string') return null;
  try {
    const raw = openPortalPassword(IDENTITY, token.trim());
    const data = JSON.parse(raw) as CouncilSessionData;
    if (data && typeof data.passcode === 'string' && typeof data.exp === 'number' && Date.now() <= data.exp) {
      return data.passcode;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

export function getCouncilCookieHeader(token: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  return `council_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=21600${isProd ? '; Secure' : ''}`;
}

export function getCouncilLogoutCookieHeader(): string {
  const isProd = process.env.NODE_ENV === 'production';
  return `council_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${isProd ? '; Secure' : ''}`;
}
