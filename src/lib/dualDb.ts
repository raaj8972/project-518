/**
 * Database Layer — Supabase (Primary) + Firebase Firestore (Passive Backup)
 *
 * READS:  Supabase ONLY — fast, no Firestore fallback overhead
 * WRITES: Supabase first (await), then async fire-and-forget Firestore sync
 *
 * Key rule: NEVER pass an explicit `null` or `undefined` id to Supabase for
 * SERIAL/identity tables — simply omit the key and let Postgres auto-generate it.
 */

import { db } from './firebase';
import { supabase } from './supabase';
import {
  doc, setDoc, deleteDoc,
  collection, getDocs, query as fsQuery,
  where, orderBy, limit as firestoreLimit
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/** Strip keys starting with _ (Firestore internal metadata) */
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
  // Only include id when it's a real value (for updates/upserts)
  if (includeId && id !== undefined && id !== null && id !== '') {
    payload.id = id;
  }
  return payload;
}

/** Fire-and-forget Firestore backup — never blocks the caller */
function firestoreBackup(table: string, items: any[]) {
  if (!db) return;
  for (const item of items) {
    if (item?.id == null) continue;
    setDoc(doc(db, table, String(item.id)), item, { merge: true })
      .catch(e => console.warn(`[Db] Firestore backup failed ${table}/${item.id}:`, e.message));
  }
}

/** Fire-and-forget Firestore delete */
function firestoreDeleteBackup(table: string, id: number | string) {
  if (!db) return;
  deleteDoc(doc(db, table, String(id)))
    .catch(e => console.warn(`[Db] Firestore delete backup failed ${table}/${id}:`, e.message));
}

// ─────────────────────────────────────────────────────────
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

/** UUID Regex for validation */
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(id: any): boolean {
  if (typeof id !== 'string') return false;
  return uuidRegex.test(id);
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

export async function dualRead(opts: ReadOptions): Promise<{ data: any; source: 'supabase' | 'firestore' }> {
  const { table, eq, gt, in: inOpts, order, limit, single, maybeSingle } = opts;

  let q = supabase.from(table).select(opts.select || '*');
  if (eq)     q = q.eq(eq[0], eq[1]);
  if (gt)     q = q.gt(gt[0], gt[1]);
  if (inOpts) q = q.in(inOpts[0], inOpts[1]);
  if (order)  q = q.order(order[0], { ascending: order[1]?.ascending !== false });
  if (limit)  q = q.limit(limit);
  if (opts.range) q = q.range(opts.range[0], opts.range[1]);

  try {
    if (single || maybeSingle) {
      if (eq && (eq[0] === 'user_id' || eq[0] === 'id') && typeof eq[1] === 'string' && eq[1].includes('hardcoded') && !isUuid(eq[1])) {
        console.info(`[Db] Skipping Supabase read for static ID: ${eq[1]}, falling back to Firestore`);
        return await firestoreRead(opts);
      }
      const { data, error } = await withTimeout<any>((q as any).maybeSingle(), 15000);
      if (error) throw error;
      
      if (single && !data) throw new Error('NOT_FOUND');
      
      // If maybeSingle and not found in Supabase, try Firestore
      if (maybeSingle && !data) {
        return await firestoreRead(opts);
      }
      
      return { data, source: 'supabase' };
    } else {
      if (eq && (eq[0] === 'user_id' || eq[0] === 'id') && typeof eq[1] === 'string' && eq[1].includes('hardcoded') && !isUuid(eq[1])) {
        console.info(`[Db] Skipping Supabase read for static ID: ${eq[1]}, falling back to Firestore`);
        return await firestoreRead(opts);
      }
      const { data, error } = await withTimeout<any>(q, 20000);
      if (error) throw error;
      
      // If Supabase returns empty, try Firestore (migration fallback)
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.info(`[Db] Supabase returned empty for ${table}, checking Firestore fallback...`);
        return await firestoreRead(opts);
      }
      
      return { data: data ?? [], source: 'supabase' };
    }
  } catch (err: any) {
    // Supabase failed — try Firestore as last resort
    console.warn(`[Db] Supabase read failed/timed out for ${table}, trying Firestore:`, err.message);
    return await firestoreRead(opts);
  }
}

/** Firestore is now only a last-resort fallback (not primary) */
async function firestoreRead(opts: ReadOptions): Promise<{ data: any; source: 'firestore' }> {
  const { table, eq, gt, in: inOpts, order, limit, single, maybeSingle } = opts;
  const empty = { data: single || maybeSingle ? null : [], source: 'firestore' as const };
  if (!db) return empty;

  try {
    const colRef = collection(db, table);
    let q: any = colRef;
    if (eq)     q = fsQuery(q, where(eq[0], '==', eq[1]));
    if (gt)     q = fsQuery(q, where(gt[0], '>', gt[1]));
    if (inOpts) q = fsQuery(q, where(inOpts[0], 'in', inOpts[1]));
    if (order)  q = fsQuery(q, orderBy(order[0], order[1]?.ascending === false ? 'desc' : 'asc'));
    const eff = (single || maybeSingle) && !limit ? 1 : limit;
    if (eff)    q = fsQuery(q, firestoreLimit(eff));

    const snap = await withTimeout<any>(getDocs(q), 15000);
    const data = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (single || maybeSingle) {
      const result = data[0] ?? null;
      if (single && !result) throw new Error('NOT_FOUND');
      return { data: result, source: 'firestore' };
    }
    return { data, source: 'firestore' };
  } catch (err: any) {
    console.error(`[Db] Firestore fallback read failed for ${table}:`, err.message);
    return empty;
  }
}

// ─────────────────────────────────────────────────────────
// WRITE — Supabase primary, Firestore backup
// ─────────────────────────────────────────────────────────

export async function dualInsert(table: string, data: any | any[]) {
  const isArray = Array.isArray(data);
  const items = isArray ? data : [data];

  // Build Supabase payloads — OMIT id entirely for SERIAL tables (Postgres auto-generates)
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

  // ✦ Async Firestore backup (fire-and-forget)
  firestoreBackup(table, savedArr);

  return isArray ? savedArr : savedArr[0];
}

export async function dualUpdate(table: string, id: number | string, patch: any, idColumn = 'id') {
  const clean = sanitize({ ...patch });
  // Never send id in the patch body — it's in the eq filter
  delete clean.id;
  delete clean.user_id;

  if (idColumn === 'user_id' && !isUuid(id)) {
    console.info(`[Db] Skipping Supabase update for non-UUID id: ${id}, using Firestore only`);
    // Minimal mock for return consistency
    const savedArr = [sanitize({ ...patch, [idColumn]: id })];
    firestoreBackup(table, savedArr);
    return savedArr[0];
  }

  const { data: saved, error } = await withTimeout<any>(
    supabase
      .from(table)
      .update({ ...clean, updated_at: new Date().toISOString() })
      .eq(idColumn, id)
      .select(),
    30000
  );

  if (error) {
    console.error(`[Db] dualUpdate FAILED for ${table}/${id}:`, error.message);
    throw new Error(error.message);
  }

  const savedArr = Array.isArray(saved) ? saved : saved ? [saved] : [{ id }];

  // ✦ Async Firestore backup
  firestoreBackup(table, savedArr);

  return saved ?? [{ id }];
}

export async function dualUpsert(table: string, data: any | any[]) {
  const isArray = Array.isArray(data);
  const items = isArray ? data : [data];

  // For upsert we MUST include id (it's the conflict key)
  const rows = items.map(item => {
    const payload = supabasePayload(item, true); // include id if present
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
    console.error(`[Db] dualUpsert FAILED for ${table}:`, error.message);
    throw new Error(error.message);
  }

  const savedArr = Array.isArray(saved) ? saved : saved ? [saved] : [];

  // ✦ Async Firestore backup
  firestoreBackup(table, savedArr);

  return isArray ? savedArr : savedArr[0];
}

export async function dualDelete(table: string, id: number | string, idColumn = 'id') {
  if (idColumn === 'user_id' && !isUuid(id)) {
    console.info(`[Db] Skipping Supabase delete for non-UUID id: ${id}`);
    firestoreDeleteBackup(table, id);
    return;
  }
  const { error } = await withTimeout(supabase.from(table).delete().eq(idColumn, id), 30000);
  if (error) {
    console.error(`[Db] dualDelete FAILED for ${table}/${id}:`, error.message);
    throw new Error(error.message);
  }

  // ✦ Async Firestore backup
  firestoreDeleteBackup(table, id);
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
