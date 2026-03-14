/**
 * Database Layer — Firebase Firestore (Primary & Only)
 * Storage remains on Supabase.
 * 
 * READS:  Firestore only
 * WRITES: Firestore only
 */
import { db } from './firebase';
import { supabase } from './supabase';
import { 
  collection, doc, getDocs, setDoc, deleteDoc, 
  query, where, orderBy, limit as firestoreLimit 
} from 'firebase/firestore';

// Helper for UUID generation that doesn't depend on external modules
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Tables that should bypass Firestore (Primary & Only on Supabase)
const SUPABASE_ONLY_TABLES = [
  'annual_sports_events', 
  'annual_sports_registrations',
  'sports_seasons',
  'sports_teams',
  'sports_players',
  'sports_registrations',
  'sports_matches',
  'annual_sports_matches'
];
// ═══════════════════════════════════════════════════
// READ — Firestore only
// ═══════════════════════════════════════════════════

interface ReadOptions {
  table: string;
  select?: string;
  eq?: [string, any];
  in?: [string, any[]];
  order?: [string, { ascending?: boolean }];
  limit?: number;
  single?: boolean;
  maybeSingle?: boolean;
}

export async function dualRead(opts: ReadOptions): Promise<{ data: any; source: 'firestore' | 'supabase' }> {
  const { table, eq, in: inOpts, order, limit, single, maybeSingle } = opts;

  // Fallback to Supabase if Firestore is not initialized
  if (!db) {
    console.warn(`[Db] Firestore not initialized, falling back to Supabase for ${table}`);
    return await fallbackToSupabase(opts);
  }

  let colRef = collection(db, table);
  try {
    // Bypass Firestore for specific tables
    if (SUPABASE_ONLY_TABLES.includes(table)) {
      throw new Error('SUPABASE_ONLY'); 
    }
    let q: any = colRef;
    if (eq) q = query(q, where(eq[0], '==', eq[1]));
    if (inOpts) q = query(q, where(inOpts[0], 'in', inOpts[1]));
    
    // Apply server-side ordering if specified
    if (order) {
      const [col, config] = order;
      q = query(q, orderBy(col, config?.ascending === false ? 'desc' : 'asc'));
    }

    // Apply server-side limit
    let effectiveLimit = limit;
    if ((single || maybeSingle) && !effectiveLimit) {
      effectiveLimit = 1;
    }
    if (effectiveLimit) {
      q = query(q, firestoreLimit(effectiveLimit));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    if (single || maybeSingle) {
      const result = data[0] || null;
      if (single && !result) throw new Error('NOT_FOUND');
      return { data: result, source: 'firestore' };
    }

    return { data, source: 'firestore' };
  } catch (err: any) {
    console.warn(`[Db] Firestore read failed for ${table}, falling back to Supabase:`, err.message);
    return await fallbackToSupabase(opts);
  }
}

/** Internal helper for Supabase fallback to avoid repetition */
async function fallbackToSupabase(opts: ReadOptions): Promise<{ data: any; source: 'firestore' | 'supabase' }> {
  const { table, eq, in: inOpts, order, limit, single, maybeSingle } = opts;
  try {
    let query = supabase.from(table).select('*');
    
    if (eq) query = query.eq(eq[0], eq[1]);
    if (inOpts) query = query.in(inOpts[0], inOpts[1]);
    if (order) query = query.order(order[0], { ascending: order[1]?.ascending !== false });
    if (limit) query = query.limit(limit);
    
    if (single || maybeSingle) {
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (single && !data) throw new Error('NOT_FOUND');
      return { data, source: 'supabase' };
    } else {
      const { data, error } = await query;
      if (error) throw error;
      return { data: data || [], source: 'supabase' };
    }
  } catch (supaErr: any) {
    console.error(`[Db] Supabase fallback failed for ${table}:`, supaErr.message);
    return { data: single || maybeSingle ? null : [], source: 'supabase' };
  }
}

// ═══════════════════════════════════════════════════
// WRITE — Firestore & Supabase
// ═══════════════════════════════════════════════════

export async function dualInsert(table: string, data: any) {
  try {
    const now = new Date().toISOString();
    
    if (SUPABASE_ONLY_TABLES.includes(table)) {
      // Let Supabase handle ID generation if not provided
      const record = {
        ...data,
        updated_at: now,
        created_at: data.created_at || now
      };
      
      const { data: supaData, error } = await supabase.from(table).insert(record).select();
      if (error) throw new Error(error.message);
      return supaData;
    }

    const id = data.id || generateId();
    
    const record = { 
      ...data, 
      id, 
      created_at: data.created_at || now,
      updated_at: now 
    };

    // If Firestore is not initialized, only write to Supabase
    if (!db) {
      console.warn(`[Db] Firestore not initialized, skipping Firestore insert for ${table}`);
      const { data: supaData, error } = await supabase.from(table).insert(record).select();
      if (error) throw new Error(error.message);
      return [record];
    }

    const docRef = doc(db, table, String(id));

    // Write to Firestore
    const firestorePromise = setDoc(docRef, record, { merge: true });
    
    // Write to Supabase - check for error in resolution to throw
    const supabasePromise = supabase.from(table).insert(record).then(res => {
      if (res.error) throw new Error(res.error.message);
      return res.data;
    });

    await Promise.all([firestorePromise, supabasePromise]);
    return [record];
  } catch (err: any) {
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocal) {
        console.warn(`[Db] dualInsert: Swallowing error for local offline testing:`, err.message);
        return [data]; 
    }
    console.error(`[Db] dualInsert FAILED for ${table}:`, err.message, { data });
    throw err;
  }
}

export async function dualUpdate(table: string, id: number | string, patch: any) {
  try {
    const now = new Date().toISOString();
    const record = { ...patch, updated_at: now };

    if (SUPABASE_ONLY_TABLES.includes(table)) {
      const { data, error } = await supabase.from(table).update(record).eq('id', id).select();
      if (error) throw new Error(error.message);
      return data;
    }

    // If Firestore is not initialized, only write to Supabase
    if (!db) {
      console.warn(`[Db] Firestore not initialized, skipping Firestore update for ${table}`);
      const { error } = await supabase.from(table).update(record).eq('id', id);
      if (error) throw new Error(error.message);
      return [{ id }];
    }

    const docRef = doc(db, table, String(id));

    // Write to Firestore
    const firestorePromise = setDoc(docRef, record, { merge: true });
    
    // Write to Supabase
    const supabasePromise = supabase.from(table).update(record).eq('id', id).then(res => {
      if (res.error) throw new Error(res.error.message);
      return res.data;
    });

    await Promise.all([firestorePromise, supabasePromise]);
    return [{ id }];
  } catch (err: any) {
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocal) {
        console.warn(`[Db] dualUpdate: Swallowing error for local offline testing:`, err.message);
        return [{ id }];
    }
    console.error(`[Db] dualUpdate FAILED for ${table}/${id}:`, err.message, { patch });
    throw err;
  }
}

export async function dualUpsert(table: string, data: any | any[]) {
  const items = Array.isArray(data) ? data : [data];
  const now = new Date().toISOString();
  
  try {
    const promises = items.map(async (item) => {
      const id = (item.id && item.id !== '') ? item.id : (item.page_key || generateId());
      console.log(`[DualDb] Upserting to ${table}/${id}:`, item);
      
      const record = {
        ...item,
        id: (item.id && item.id !== '') ? item.id : id,
        created_at: item.created_at || now,
        updated_at: now
      };

      if (SUPABASE_ONLY_TABLES.includes(table)) {
        const { data: supaData, error } = await supabase.from(table).upsert(record).select();
        if (error) throw new Error(error.message);
        console.log(`[DualDb] Supabase-only upsert SUCCESS for ${table}/${id}`);
        return supaData ? supaData[0] : record;
      }
      
      // If Firestore is not initialized
      if (!db) {
        console.warn(`[DualDb] Firestore not initialized, skipping Firestore upsert for ${table}/${id}`);
        const { error } = await supabase.from(table).upsert(record);
        if (error) throw new Error(error.message);
        return record;
      }

      const docRef = doc(db, table, String(id));
      
      // Write to Firestore
      const firestorePromise = setDoc(docRef, record, { merge: true })
        .then(() => console.log(`[DualDb] Firestore upsert SUCCESS for ${table}/${id}`))
        .catch(e => { console.error(`[DualDb] Firestore upsert FAILED for ${table}/${id}:`, e); throw e; });
      
      // Write to Supabase
      const supabasePromise = supabase.from(table).upsert(record).then(res => {
        if (res.error) {
          console.error(`[DualDb] Supabase upsert FAILED for ${table}/${id}:`, res.error.message);
          throw new Error(res.error.message);
        }
        console.log(`[DualDb] Supabase upsert SUCCESS for ${table}/${id}`);
        return res.data;
      });

      return Promise.all([firestorePromise, supabasePromise]).then(() => record);
    });

    const results = await Promise.all(promises);
    return Array.isArray(data) ? results : results[0];
  } catch (err: any) {
    console.error(`[Db] dualUpsert FAILED for ${table}:`, err.message);
    throw err;
  }
}

export async function dualDelete(table: string, id: number | string) {
  try {
    if (SUPABASE_ONLY_TABLES.includes(table)) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw new Error(error.message);
      return;
    }

    // If Firestore is not initialized
    if (!db) {
      console.warn(`[Db] Firestore not initialized, skipping Firestore delete for ${table}/${id}`);
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw new Error(error.message);
      return;
    }

    const firestorePromise = deleteDoc(doc(db, table, String(id)));
    const supabasePromise = supabase.from(table).delete().eq('id', id).then(res => {
      if (res.error) throw new Error(res.error.message);
      return res.data;
    });
    await Promise.all([firestorePromise, supabasePromise]);
  } catch (err: any) {
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocal) {
        console.warn(`[Db] dualDelete: Swallowing error for local offline testing:`, err.message);
        return;
    }
    console.error(`[Db] dualDelete FAILED for ${table}/${id}:`, err.message);
    throw err;
  }
}

// ═══════════════════════════════════════════════════
// CONVENIENCE WRAPPERS
// ═══════════════════════════════════════════════════

/** Select all from a table */
export async function readTable(table: string, select = '*'): Promise<any[]> {
  const { data } = await dualRead({ table, select });
  return data || [];
}

/** Read single settings row (id=1) */
export async function readSettings(table: string): Promise<any | null> {
  const { data } = await dualRead({ table, eq: ['id', '1'], maybeSingle: true });
  return data;
}
