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
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms || 12000);
    Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

// ─────────────────────────────────────────────────────────
// READ — Supabase only
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// CACHING LOGIC
// ─────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const READ_TIMEOUT_MS = 12000;
type ReadResult = { data: any; count?: number | null; source: 'supabase' | 'supabase-cache' };
type CacheEntry = { data: any; count?: number | null; timestamp: number };
const memoryCache = new Map<string, CacheEntry>();
const pendingReads = new Map<string, Promise<ReadResult>>();
const tableVersions = new Map<string, number>();
let authCacheScope = 'anonymous';

// A response authorized for one session must never satisfy another session's read.
// Keep this listener synchronous: awaiting Supabase calls inside auth listeners can block auth.
supabase.auth.onAuthStateChange((_event, session) => {
  const scope = session ? `${session.user.id}:${JSON.stringify(session.user.app_metadata)}` : 'anonymous';
  if (scope !== authCacheScope) {
    authCacheScope = scope;
    memoryCache.clear();
    pendingReads.clear();
  }
});

function safeSessionStorage() {
  try {
    if (typeof window !== 'undefined') return window.sessionStorage;
  } catch { /* Storage can be unavailable in private or embedded contexts. */ }
  return null;
}

function getCacheKey(opts: ReadOptions): string {
  // Safe serialization of the query options, dropping forceRefresh
  const { forceRefresh, ...rest } = opts;
  const normalized = Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b)));
  return `supabase_cache_v2_${opts.table}_${authCacheScope}_${JSON.stringify(normalized)}`;
}

function getCachedData(key: string): CacheEntry | null {
  const memoryEntry = memoryCache.get(key);
  const now = Date.now();

  if (memoryEntry && now - memoryEntry.timestamp < CACHE_TTL_MS) {
    return memoryEntry;
  }

  const storage = safeSessionStorage();
  if (storage) {
    try {
      const stored = storage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (now - parsed.timestamp < CACHE_TTL_MS) {
          memoryCache.set(key, parsed);
          return parsed;
        } else {
          storage.removeItem(key);
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  return null;
}

function setCachedData(key: string, data: any, count?: number | null) {
  const now = Date.now();
  const entry = { data, count, timestamp: now };
  memoryCache.set(key, entry);

  const storage = safeSessionStorage();
  if (storage) {
    try {
      storage.setItem(key, JSON.stringify(entry));
    } catch (e) {
      // Ignore quota errors
    }
  }
}

export function invalidateTableCache(table: string) {
  const prefix = `supabase_cache_v2_${table}_`;
  tableVersions.set(table, (tableVersions.get(table) || 0) + 1);
  for (const key of pendingReads.keys()) {
    if (key.startsWith(prefix)) pendingReads.delete(key);
  }
  
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }

  const storage = safeSessionStorage();
  if (storage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => storage.removeItem(k));
    } catch (e) {
      // Ignore clear errors
    }
  }
}

export interface ReadOptions {
  table: string;
  select?: string;
  eq?: [string, any];
  eqAll?: [string, unknown][];
  gt?: [string, any];
  in?: [string, any[]];
  is?: [string, any];
  or?: string;
  order?: [string, { ascending?: boolean }];
  limit?: number;
  single?: boolean;
  maybeSingle?: boolean;
  range?: [number, number];
  forceRefresh?: boolean;
  count?: 'exact' | 'planned' | 'estimated';
}

export async function dualRead(opts: ReadOptions): Promise<ReadResult> {
  const { table, eq, gt, in: inOpts, is, or, order, limit, single, maybeSingle, forceRefresh, count } = opts;

  const cacheKey = getCacheKey(opts);
  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached !== null) {
      return { data: cached.data, count: cached.count, source: 'supabase-cache' };
    }
  }

  const existing = pendingReads.get(cacheKey);
  if (existing) return existing;

  const version = tableVersions.get(table) || 0;
  const scope = authCacheScope;
  const performFetch = async (): Promise<ReadResult> => {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      let q = supabase.from(table).select(opts.select || '*', { count: count || undefined });
      
      if (eq)     q = q.eq(eq[0], eq[1]);
      for (const [column, value] of opts.eqAll || []) q = q.eq(column, value);
      if (gt)     q = q.gt(gt[0], gt[1]);
      if (inOpts) q = q.in(inOpts[0], inOpts[1]);
      if (is)     q = q.is(is[0], is[1]);
      if (or)     q = q.or(or);
      
      if (order)  q = q.order(order[0], { ascending: order[1]?.ascending !== false });
      if (limit)  q = q.limit(limit);
      if (opts.range) q = q.range(opts.range[0], opts.range[1]);

      q = q.abortSignal(controller.signal);
      const readQuery = single || maybeSingle ? q.maybeSingle() : q;
      const deadline = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error('TIMEOUT'));
          controller.abort();
        }, READ_TIMEOUT_MS);
      });
      const { data, error, count: resCount } = await Promise.race([Promise.resolve(readQuery), deadline]);
      if (error) throw error;
      if (single && !data) throw new Error('NOT_FOUND');
      const finalData = single || maybeSingle ? data : data ?? [];
      // A write/realtime invalidation may have happened while this request was running.
      if (scope === authCacheScope && version === (tableVersions.get(table) || 0)) {
        setCachedData(cacheKey, finalData, resCount);
      }
      return { data: finalData, count: resCount, source: 'supabase' };
    } catch (err: any) {
      console.error(`[Db] dualRead CRITICAL for ${table}:`, err.message || err);
      throw err;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  };

  const request = performFetch();
  pendingReads.set(cacheKey, request);
  try {
    return await request;
  } finally {
    if (pendingReads.get(cacheKey) === request) pendingReads.delete(cacheKey);
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

  invalidateTableCache(table);
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
    if (error.code === '42501') {
      console.error(`[Db] dualUpdate PERMISSION DENIED (RLS) for ${table}/${id}. Check your Supabase policies.`);
    }
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
      invalidateTableCache(table);
      if (!saved2?.length) throw new Error("No record was updated. Check your permissions or refresh the page.");
      return saved2;
    }
    console.error(`[Db] dualUpdate FAILED for ${table}/${id}:`, error.message);
    throw new Error(error.message);
  }

  invalidateTableCache(table);
  if (!saved?.length) throw new Error("No record was updated. Check your permissions or refresh the page.");
  return saved;
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

  const performUpsert = async (retryCount = 0): Promise<any> => {
    try {
      const { data: saved, error } = await withTimeout<any>(
        supabase
          .from(table)
          .upsert(isArray ? rows : rows[0])
          .select(),
        30000
      );

      if (error) {
        if (error.code === '42501') {
          console.error(`[Db] dualUpsert PERMISSION DENIED (RLS) for ${table}. Check your Supabase policies.`);
        }
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
          invalidateTableCache(table);
          return isArray ? (saved2 ?? []) : (saved2?.[0] ?? null);
        }
        console.error(`[Db] dualUpsert FAILED for ${table}:`, error.message);
        throw new Error(error.message);
      }

      invalidateTableCache(table);
      const savedArr = Array.isArray(saved) ? saved : saved ? [saved] : [];
      return isArray ? savedArr : savedArr[0];
    } catch (err: any) {
      if (err.message === 'TIMEOUT' && retryCount < 2) {
        const backoff = (retryCount + 1) * 2000;
        console.warn(`[Db] ${table} upsert stalled (attempt ${retryCount + 1}). Retrying in ${backoff}ms...`);
        await new Promise(r => setTimeout(r, backoff));
        return performUpsert(retryCount + 1);
      }
      throw err;
    }
  };

  return performUpsert();
}

export async function dualDelete(table: string, id: number | string, idColumn = 'id') {
  const { data, error } = await withTimeout(supabase.from(table).delete().eq(idColumn, id).select(idColumn), 30000);
  if (error) {
    console.error(`[Db] dualDelete FAILED for ${table}/${id}:`, error.message);
    throw new Error(error.message);
  }
  if (!data?.length) throw new Error("No record was deleted. Check your permissions or refresh the page.");
  invalidateTableCache(table);
}

export async function dualBulkUpdate(table: string, ids: (number | string)[], patch: any, idColumn = 'id') {
  if (!ids.length) return [];
  const clean = sanitize({ ...patch });
  delete clean.id;
  delete clean.user_id;

  const updatePayload: any = { ...clean };
  if (!('updated_at' in clean)) {
    updatePayload.updated_at = new Date().toISOString();
  }

  const { data: saved, error } = await withTimeout<any>(
    supabase
      .from(table)
      .update(updatePayload)
      .in(idColumn, ids)
      .select(),
    30000
  );

  if (error) {
    console.error(`[Db] dualBulkUpdate FAILED for ${table}:`, error.message);
    throw new Error(error.message);
  }

  invalidateTableCache(table);
  return saved || [];
}

export async function dualBulkDelete(table: string, ids: (number | string)[], idColumn = 'id') {
  if (!ids.length) return;
  const { error } = await withTimeout(supabase.from(table).delete().in(idColumn, ids), 30000);
  if (error) {
    console.error(`[Db] dualBulkDelete FAILED for ${table}:`, error.message);
    throw new Error(error.message);
  }
  invalidateTableCache(table);
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
  const { data } = await dualRead({ table, eq: ['id', 1], maybeSingle: true });
  return data;
}
