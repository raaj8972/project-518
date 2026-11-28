import type { Handler } from '@netlify/functions';
import { secureEvent } from './lib/api-security';
import { verifyToken } from './lib/auth-verify';
import { getSupabaseClient } from './lib/supabase';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IQMG_FORMAT_PATTERN = /^[A-Z0-9 /_-]+$/;
const MAX_NOTE_LENGTH = 240;

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

function iqmgKeyOf(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const implementation: Handler = async event => {
  if (event.httpMethod !== 'POST') {
    return reply(405, { error: 'Method not allowed' });
  }

  try {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(event.body || '{}') as Record<string, unknown>;
    } catch {
      return reply(400, { error: 'Invalid request body' });
    }

    const client = getSupabaseClient(true);
    const user = await verifyToken(event.headers.authorization || event.headers.Authorization, client);
    const crBatch = typeof user?.app_metadata?.cr_batch === 'string' ? user.app_metadata.cr_batch.trim() : '';

    if (!user || user.app_metadata?.role !== 'cr' || !crBatch) {
      return reply(403, { error: 'CR batch access required' });
    }

    const requestedBatch = typeof parsed.batch === 'string' ? parsed.batch.trim() : '';
    if (requestedBatch && requestedBatch !== crBatch) {
      return reply(403, { error: 'Cross-batch access denied' });
    }

    const studentId = typeof parsed.studentId === 'string' ? parsed.studentId.trim() : '';
    if (!UUID_PATTERN.test(studentId)) {
      return reply(400, { error: 'Valid studentId is required' });
    }

    const action = parsed.action;
    if (action !== 'update' && action !== 'correct') {
      return reply(400, { error: 'Action must be update or correct' });
    }

    const customNote =
      typeof parsed.note === 'string' ? parsed.note.trim().replace(/\s+/g, ' ').slice(0, MAX_NOTE_LENGTH) : '';

    let normalizedIqmg: string | null = null;
    if (action === 'update') {
      const rawIqmg = typeof parsed.iqmgNumber === 'string' ? parsed.iqmgNumber.trim().toUpperCase() : '';
      const keyLength = iqmgKeyOf(rawIqmg).length;
      if (!rawIqmg || !IQMG_FORMAT_PATTERN.test(rawIqmg) || keyLength < 3 || keyLength > 40) {
        return reply(400, { error: 'Enter a valid IQMG number (3-40 letters or digits)' });
      }
      normalizedIqmg = rawIqmg;
    }

    const { data: activeBatch, error: batchError } = await client
      .from('cr_batches')
      .select('batch')
      .eq('batch', crBatch)
      .maybeSingle();
    if (batchError) return reply(503, { error: 'Batch verification unavailable' });
    if (!activeBatch) return reply(403, { error: 'CR batch access is inactive' });

    const { data: studentProfile, error: profileError } = await client
      .from('profiles')
      .select('id, batch')
      .eq('id', studentId)
      .maybeSingle();
    if (profileError) return reply(503, { error: 'Unable to verify student batch' });
    if (!studentProfile || studentProfile.batch !== crBatch) {
      return reply(403, { error: 'This student does not belong to your batch' });
    }

    if (normalizedIqmg) {
      const targetKey = iqmgKeyOf(normalizedIqmg);
      const { data: conflict, error: conflictError } = await client
        .from('student_iqmg_identities')
        .select('user_id')
        .eq('iqmg_key', targetKey)
        .neq('user_id', studentId)
        .maybeSingle();
      if (conflictError) return reply(503, { error: 'Unable to verify IQMG availability' });
      if (conflict) {
        return reply(409, { error: 'This IQMG number is already assigned to another student account.' });
      }
    }

    const { data: beforeRecord } = await client
      .from('student_iqmg_identities')
      .select('user_id, iqmg_number, status, note, verified_at, updated_at')
      .eq('user_id', studentId)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    const effectiveNote =
      action === 'update'
        ? customNote
          ? `Updated by Batch ${crBatch} CR: ${customNote}`
          : `Updated to ${normalizedIqmg} by Batch ${crBatch} CR. Review it in My profile.`
        : customNote
          ? `Correction requested by Batch ${crBatch} CR: ${customNote}`
          : `Your Batch ${crBatch} CR asked you to correct your IQMG number. Enter the exact number printed on your college ID.`;

    const upsertRow =
      action === 'update'
        ? {
            user_id: studentId,
            iqmg_number: normalizedIqmg,
            status: 'pending' as const,
            verified_at: null,
            note: effectiveNote,
            updated_at: nowIso,
          }
        : {
            user_id: studentId,
            iqmg_number: null,
            status: 'correction_required' as const,
            verified_at: null,
            note: effectiveNote,
            updated_at: nowIso,
          };

    const { data: savedRow, error: saveError } = await client
      .from('student_iqmg_identities')
      .upsert(upsertRow, { onConflict: 'user_id' })
      .select('user_id, iqmg_number, status, note, updated_at')
      .single();

    if (saveError) {
      if ((saveError as { code?: string }).code === '23505') {
        return reply(409, { error: 'This IQMG number is already assigned to another student account.' });
      }
      return reply(503, { error: 'Unable to save IQMG update' });
    }

    // Best-effort audit and student inbox notice; core student_iqmg_identities update already succeeded.
    try {
      await client.from('iqmg_identity_audit').insert({
        user_id: studentId,
        before_record: beforeRecord || null,
        after_record: savedRow,
        changed_by: user.id,
      });
    } catch {
      // Ignore optional audit failures if schema differs in minimal test environments.
    }

    try {
      await client.from('student_inbox').insert({
        user_id: studentId,
        kind: 'invitation',
        title: action === 'update' ? 'College IQMG number updated' : 'College IQMG correction required',
        body: effectiveNote,
        href: '/dashboard/settings',
        source_key: `cr-iqmg-${action}:${studentId}:${Date.now()}`,
      });
    } catch {
      // StudentAuthContext still pushes real-time popup updates via student_iqmg_identities.
    }

    return reply(200, {
      batch: crBatch,
      studentId,
      iqmg_number: savedRow?.iqmg_number ?? upsertRow.iqmg_number,
      status: savedRow?.status ?? upsertRow.status,
      note: savedRow?.note ?? effectiveNote,
      updated_at: savedRow?.updated_at ?? nowIso,
    });
  } catch {
    return reply(500, { error: 'Unable to update IQMG right now' });
  }
};

export const handler = secureEvent('cr-manage-iqmg', implementation);
