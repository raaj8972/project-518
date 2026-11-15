import crypto from 'node:crypto';

export const normalizeResetEmail = (email: unknown): string | null => {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
};
export const hashResetCode = (email: string, code: string) => {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!secret) throw new Error('Recovery service is not configured');
  return crypto.createHmac('sha256', secret.trim()).update(`admin-reset:${email}:${code}`).digest('hex');
};
export const hashResetToken = (token: string) => `sha256:${crypto.createHash('sha256').update(token).digest('hex')}`;
export const resetHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
