import { getSupabaseClient } from './supabase';

export interface NormalizedUser {
  id: string;
  email?: string;
  role?: string;
  app_metadata?: Record<string, any>;
  provider: 'supabase' | 'firebase';
}

// Identity comes from Auth; revocation and privileges come from the database.
export async function verifyToken(authHeader: string | undefined, existingClient?: any): Promise<NormalizedUser | null> {
  const token = authHeader?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token) return null;
  try {
    const client = existingClient || getSupabaseClient(true);
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) return null;
    const user = data.user;
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    // Auth reports verified native MFA factors; browser state cannot waive step-up.
    if (user.factors?.some((factor: any) => factor.status === 'verified') && claims.aal !== 'aal2') return null;
    const { data: revoked, error: revocationError } = await client.from('user_session_revocations')
      .select('revoked_at').eq('user_id', user.id).maybeSingle();
    if (revocationError) return null;
    // Parse claims only after Auth has verified the token's signature.
    if (!Number.isFinite(claims.iat) || (revoked && new Date(revoked.revoked_at).getTime() >= claims.iat * 1000)) return null;
    return { id: user.id, email: user.email, app_metadata: user.app_metadata, provider: 'supabase' };
  } catch { return null; }
}

export async function verifyAdmin(authHeader: string | undefined, client: any): Promise<{ isAdmin: boolean; isOwner: boolean; user: NormalizedUser | null }> {
  const user = await verifyToken(authHeader, client);
  if (!user) return { isAdmin: false, isOwner: false, user: null };
  const { data: admin, error } = await client.from('admin_users')
    .select('role, is_primary').eq('user_id', user.id).maybeSingle();
  const isAdmin = !error && !!admin && ['admin', 'owner'].includes(admin.role);
  return { isAdmin, isOwner: isAdmin && (admin.role === 'owner' || admin.is_primary === true), user };
}
