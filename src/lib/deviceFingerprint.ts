// Simple deterministic fingerprint (not for security) used to identify a client device for admin blocking.
// Combines userAgent, language, platform, screen size, timezone offset into an FNV-1a hash.

export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server-env';
  try {
    const ua = navigator.userAgent || '';
    const lang = navigator.language || '';
    const plat = (navigator as any).platform || '';
    const tz = String(new Date().getTimezoneOffset());
    const screenPart = typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '';
    const raw = [ua, lang, plat, screenPart, tz].join('|');
    // FNV-1a 32-bit hash
    let h = 0x811c9dc5;
    for (let i = 0; i < raw.length; i++) {
      h ^= raw.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; // * FNV prime
    }
    return ('fp_' + ('0000000' + h.toString(16)).slice(-8));
  } catch {
    return 'fp_fallback';
  }
}

const DEVICE_ID_KEY = 'stable_device_id_v1';

export function getStableDeviceId(): string {
  if (typeof window === 'undefined') return 'srv';
  try {
    let existing: string | null = localStorage.getItem(DEVICE_ID_KEY);
    if (!existing) {
      const generated = (typeof crypto !== 'undefined' && (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : 'd_' + Math.random().toString(36).slice(2) + Date.now().toString(36));
      localStorage.setItem(DEVICE_ID_KEY, generated);
      return generated;
    }
    return existing;
  } catch {
    return 'd_fallback';
  }
}

export function getDeviceIdentity() {
  return { fingerprint: getDeviceFingerprint(), deviceId: getStableDeviceId() };
}
