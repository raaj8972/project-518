import type { Handler } from '@netlify/functions';
import { secureEvent } from './lib/api-security';
import { verifyToken } from './lib/auth-verify';
import { getSupabaseClient } from './lib/supabase';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REQUESTED_USER_IDS = 100;
const PROFILE_PAGE_SIZE = 1000;
const IQMG_IN_CHUNK_SIZE = 150;

interface IQMGIdentityEntry {
  iqmg_number: string | null;
  status: 'pending' | 'verified' | 'correction_required' | null;
  note: string | null;
  updated_at: string | null;
}

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: body === '' ? '' : JSON.stringify(body),
});

const implementation: Handler = async event => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
    return reply(405, { error: 'Method not allowed' });
  }

  try {
    const client = getSupabaseClient(true);
    const user = await verifyToken(event.headers.authorization || event.headers.Authorization, client);
    const crBatch = typeof user?.app_metadata?.cr_batch === 'string' ? user.app_metadata.cr_batch.trim() : '';

    if (!user || user.app_metadata?.role !== 'cr' || !crBatch) {
      return reply(403, { error: 'CR batch access required' });
    }

    const requestedBatch =
      typeof event.queryStringParameters?.batch === 'string'
        ? event.queryStringParameters.batch.trim()
        : '';
    if (requestedBatch && requestedBatch !== crBatch) {
      return reply(403, { error: 'Cross-batch access denied' });
    }

    const rawUserIds =
      typeof event.queryStringParameters?.userIds === 'string'
        ? event.queryStringParameters.userIds.trim()
        : '';
    let requestedUserIds: string[] | null = null;
    if (rawUserIds) {
      const parsed = rawUserIds
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
      const unique = Array.from(new Set(parsed));
      if (unique.length === 0 || unique.length > MAX_REQUESTED_USER_IDS || unique.some(id => !UUID_PATTERN.test(id))) {
        return reply(400, { error: 'Invalid userIds filter' });
      }
      requestedUserIds = unique;
    }

    const { data: activeBatch, error: batchError } = await client
      .from('cr_batches')
      .select('batch')
      .eq('batch', crBatch)
      .maybeSingle();
    if (batchError) return reply(503, { error: 'Batch verification unavailable' });
    if (!activeBatch) return reply(403, { error: 'CR batch access is inactive' });

    if (event.httpMethod === 'HEAD') {
      return reply(200, '');
    }

    const batchUserIds: string[] = [];
    if (requestedUserIds) {
      // Intersect requested UUIDs with the CR's verified batch so callers cannot probe other batches.
      const { data: scopedRows, error: scopedError } = await client
        .from('profiles')
        .select('id')
        .eq('batch', crBatch)
        .in('id', requestedUserIds);
      if (scopedError) return reply(503, { error: 'Unable to load batch students' });
      for (const row of scopedRows || []) {
        if (typeof row?.id === 'string' && row.id) batchUserIds.push(row.id);
      }
    } else {
      for (let offset = 0; ; offset += PROFILE_PAGE_SIZE) {
        const { data: profileRows, error: profileError } = await client
          .from('profiles')
          .select('id')
          .eq('batch', crBatch)
          .order('id', { ascending: true })
          .range(offset, offset + PROFILE_PAGE_SIZE - 1);
        if (profileError) return reply(503, { error: 'Unable to load batch students' });
        const rows = profileRows || [];
        for (const row of rows) {
          if (typeof row?.id === 'string' && row.id) batchUserIds.push(row.id);
        }
        if (rows.length < PROFILE_PAGE_SIZE) break;
      }
    }

    const identities: Record<string, IQMGIdentityEntry> = {};
    for (let i = 0; i < batchUserIds.length; i += IQMG_IN_CHUNK_SIZE) {
      const chunk = batchUserIds.slice(i, i + IQMG_IN_CHUNK_SIZE);
      const { data: iqmgRows, error: iqmgError } = await client
        .from('student_iqmg_identities')
        .select('user_id, iqmg_number, status, note, updated_at')
        .in('user_id', chunk);
      if (iqmgError) return reply(503, { error: 'Unable to load IQMG numbers' });
      for (const row of iqmgRows || []) {
        if (typeof row?.user_id !== 'string' || !row.user_id) continue;
        const iqmgNumber = typeof row.iqmg_number === 'string' && row.iqmg_number.trim()
          ? row.iqmg_number.trim()
          : null;
        const status =
          row.status === 'pending' || row.status === 'verified' || row.status === 'correction_required'
            ? row.status
            : null;
        const note = typeof row.note === 'string' && row.note.trim() ? row.note.trim() : null;
        const updatedAt = typeof row.updated_at === 'string' && row.updated_at ? row.updated_at : null;
        identities[row.user_id] = { iqmg_number: iqmgNumber, status, note, updated_at: updatedAt };
      }
    }

    return reply(200, { batch: crBatch, identities });
  } catch {
    return reply(500, { error: 'Unable to load batch IQMG numbers' });
  }
};

export const handler = secureEvent('cr-batch-iqmg', implementation);
