/**
 * Database Layer — Supabase Only
 *
 * All reads and writes go directly to Supabase. Firebase/Firestore has been removed.
 *
 * Key rule: NEVER pass an explicit `null` or `undefined` id to Supabase for
 * SERIAL/identity tables — simply omit the key and let Postgres auto-generate it.
 */

import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/** Strip keys starting with _ (internal metadata) */
function sanitize(data: any): any {
  if (!data || typeof data !== 'object' || data instanceof Date) return data;
  if (Array.isArray(data)) return data.map(sanitize);
  const out: any = {};
  for (const k of Object.keys(data)) {
    if (!k.startsWith('_')) out[k] = sanitize(data[k]);
  }
  return out;
}

/** Build a clean Supabase insert/upsert payload — never pass a null/undefined id */
function supabasePayload(item: any, includeId = false): any {
  const { id, created_at: _ca, updated_at: _ua, ...rest } = item;
  const payload = sanitize(rest);
  if (includeId && id !== undefined && id !== null && id !== '') {
    payload.id = id;
  }
  return payload;
}

/** Promisified timeout wrapper to prevent indefinite hangs */
function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, ms: number): Promise<T> {
  const timeoutMs = ms || 12000;
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
    )
  ]);
}

// ─────────────────────────────────────────────────────────
// READ — Supabase only
// ─────────────────────────────────────────────────────────

export interface ReadOptions {
  table: string;
  select?: string;
  eq?: [string, any];
  gt?: [string, any];
  in?: [string, any[]];
  order?: [string, { ascending?: boolean }];
  limit?: number;
  single?: boolean;
  maybeSingle?: boolean;
  range?: [number, number];
}

export async function dualRead(opts: ReadOptions): Promise<{ data: any; source: 'supabase' }> {
  const { table, eq, gt, in: inOpts, order, limit, single, maybeSingle } = opts;

  let q = supabase.from(table).select(opts.select || '*');
  if (eq)     q = q.eq(eq[0], eq[1]);
  if (gt)     q = q.gt(gt[0], gt[1]);
  if (inOpts) q = q.in(inOpts[0], inOpts[1]);
  if (order)  q = q.order(order[0], { ascending: order[1]?.ascending !== false });
  if (limit)  q = q.limit(limit);
  if (opts.range) q = q.range(opts.range[0], opts.range[1]);

  if (single || maybeSingle) {
    const { data, error } = await withTimeout<any>((q as any).maybeSingle(), 15000);
    if (error) {
      console.error(`[Db] dualRead FAILED for ${table}:`, error.message);
      throw new Error(error.message);
    }
    if (single && !data) throw new Error('NOT_FOUND');
    return { data, source: 'supabase' };
  } else {
    const { data, error } = await withTimeout<any>(q, 20000);
    if (error) {
      console.error(`[Db] dualRead FAILED for ${table}:`, error.message);
      throw new Error(error.message);
    }
    return { data: data ?? [], source: 'supabase' };
  }
}

// ─────────────────────────────────────────────────────────
// WRITE — Supabase only
// ─────────────────────────────────────────────────────────

export async function dualInsert(table: string, data: any | any[]) {
  const isArray = Array.isArray(data);
  const items = isArray ? data : [data];

  const rows = items.map(item => supabasePayload(item, false));

  const { data: saved, error } = await withTimeout<any>(
    supabase
      .from(table)
      .insert(isArray ? rows : rows[0])
      .select(),
    30000
  );

  if (error) {
    console.error(`[Db] dualInsert FAILED for ${table}:`, error.message, { rows });
    throw new Error(error.message);
  }

  const savedArr = Array.isArray(saved) ? saved : saved ? [saved] : [];
  return isArray ? savedArr : savedArr[0];
}

export async function dualUpdate(table: string, id: number | string, patch: any, idColumn = 'id') {
  const clean = sanitize({ ...patch });
  delete clean.id;
  delete clean.user_id;

  const updatePayload: any = { ...clean };
  // Only inject updated_at if not already in patch — tables that have it will auto-update via DB trigger when set
  if (!('updated_at' in clean)) {
    updatePayload.updated_at = new Date().toISOString();
  }

  const { data: saved, error } = await withTimeout<any>(
    supabase
      .from(table)
      .update(updatePayload)
      .eq(idColumn, id)
      .select(),
    30000
  );

  if (error) {
    // If updated_at doesn't exist on this table, retry without it
    if (error.message?.includes('updated_at')) {
      const { data: saved2, error: error2 } = await withTimeout<any>(
        supabase.from(table).update(clean).eq(idColumn, id).select(),
        30000
      );
      if (error2) {
        console.error(`[Db] dualUpdate FAILED for ${table}/${id}:`, error2.message);
        throw new Error(error2.message);
      }
      return saved2 ?? [{ id }];
    }
    console.error(`[Db] dualUpdate FAILED for ${table}/${id}:`, error.message);
    throw new Error(error.message);
  }

  return saved ?? [{ id }];
}

export async function dualUpsert(table: string, data: any | any[]) {
  const isArray = Array.isArray(data);
  const items = isArray ? data : [data];

  const rows = items.map(item => {
    const payload = supabasePayload(item, true);
    // Inject updated_at — will be silently ignored if column doesn't exist
    payload.updated_at = new Date().toISOString();
    return payload;
  });

  const { data: saved, error } = await withTimeout<any>(
    supabase
      .from(table)
      .upsert(isArray ? rows : rows[0])
      .select(),
    30000
  );

  if (error) {
    // If updated_at doesn't exist on this table, retry without it
    if (error.message?.includes('updated_at')) {
      const rowsNoTs = items.map(item => supabasePayload(item, true));
      const { data: saved2, error: error2 } = await withTimeout<any>(
        supabase.from(table).upsert(isArray ? rowsNoTs : rowsNoTs[0]).select(),
        30000
      );
      if (error2) {
        console.error(`[Db] dualUpsert FAILED for ${table}:`, error2.message);
        throw new Error(error2.message);
      }
      return isArray ? (saved2 ?? []) : (saved2?.[0] ?? null);
    }
    console.error(`[Db] dualUpsert FAILED for ${table}:`, error.message);
    throw new Error(error.message);
  }

  const savedArr = Array.isArray(saved) ? saved : saved ? [saved] : [];
  return isArray ? savedArr : savedArr[0];
}

export async function dualDelete(table: string, id: number | string, idColumn = 'id') {
  const { error } = await withTimeout(supabase.from(table).delete().eq(idColumn, id), 30000);
  if (error) {
    console.error(`[Db] dualDelete FAILED for ${table}/${id}:`, error.message);
    throw new Error(error.message);
  }
}

// ─────────────────────────────────────────────────────────
// Convenience wrappers
// ─────────────────────────────────────────────────────────

/** Read all rows from a table */
export async function readTable(table: string, select = '*'): Promise<any[]> {
  const { data } = await dualRead({ table, select });
  return data ?? [];
}

/** Read single settings row (id=1) */
export async function readSettings(table: string): Promise<any | null> {
  const { data } = await dualRead({ table, eq: ['id', '1'], maybeSingle: true });
  return data;
}
