import type { SecuritySettings } from '../types/data';

let pending: Promise<SecuritySettings | null> | undefined;
export function getPublicSecuritySettings(): Promise<SecuritySettings | null> {
  if (pending) return pending;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const request = fetch('/api/public-security-settings', { signal: controller.signal, cache: 'no-store' }).then(async response => {
    if (!response.ok) throw new Error('Public settings temporarily unavailable');
    return response.json() as Promise<SecuritySettings | null>;
  }).finally(() => {
    clearTimeout(timer);
    if (pending === request) pending = undefined;
  });
  pending = request;
  return request;
}
