import { supabase } from '../lib/supabase';

export interface StoredObject { name: string; publicUrl: string; size: number; created_at: string | null }

const INVENTORY_TTL = 60_000;
const inventories = new Map<string, { expiresAt: number; promise: Promise<StoredObject[]> }>();
let bucketsCache: { expiresAt: number; promise: Promise<string[]> } | undefined;
let generation = 0;
let activeLists = 0;
const listQueue: Array<() => void> = [];

export function invalidateStorageInventory(bucket?: string) {
  generation += 1;
  if (bucket) inventories.delete(bucket);
  else { inventories.clear(); bucketsCache = undefined; }
}
supabase.auth.onAuthStateChange((event) => {
  if (event !== 'TOKEN_REFRESHED') invalidateStorageInventory();
});

export function listStorageBuckets(): Promise<string[]> {
  if (bucketsCache && bucketsCache.expiresAt > Date.now()) return bucketsCache.promise;
  const entry = { expiresAt: Date.now() + INVENTORY_TTL, promise: Promise.resolve([] as string[]) };
  entry.promise = Promise.resolve(supabase.storage.listBuckets()).then(({ data, error }) => {
    if (error) throw error;
    return (data || []).map(bucket => bucket.id);
  }).catch(error => { if (bucketsCache === entry) bucketsCache = undefined; throw error; });
  bucketsCache = entry;
  return entry.promise;
}

async function listPage(bucket: string, prefix: string, offset: number) {
  if (activeLists >= 6) await new Promise<void>(resolve => listQueue.push(resolve));
  else activeLists += 1;
  try {
    return await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
  } finally { const next = listQueue.shift(); if (next) next(); else activeLists -= 1; }
}
async function listObjects(bucket: string, prefix = ''): Promise<StoredObject[]> {
  const objects: StoredObject[] = [];
  const folders: Promise<StoredObject[]>[] = [];
  for (let offset = 0; ;) {
    const { data, error } = await listPage(bucket, prefix, offset);
    if (error) throw error;
    for (const file of data || []) {
      const name = prefix ? `${prefix}/${file.name}` : file.name;
      if (!file.id && !file.metadata) folders.push(listObjects(bucket, name));
      else objects.push({ name, publicUrl: supabase.storage.from(bucket).getPublicUrl(name).data.publicUrl,
        size: Number(file.metadata?.size || 0), created_at: file.created_at || null });
    }
    // Advance by the actual response size, including installations that cap list pages at 100.
    if (!data || data.length < 100) break;
    offset += data.length;
  }
  for (const child of await Promise.all(folders)) objects.push(...child);
  return objects;
}

export function getBucketInventory(bucket: string): Promise<StoredObject[]> {
  const cached = inventories.get(bucket);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;
  const version = generation;
  const entry = { expiresAt: Infinity, promise: Promise.resolve([] as StoredObject[]) };
  entry.promise = listObjects(bucket).then(objects => {
    objects.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '') || a.name.localeCompare(b.name));
    if (version === generation) entry.expiresAt = Date.now() + INVENTORY_TTL;
    else if (inventories.get(bucket) === entry) inventories.delete(bucket);
    return objects;
  }).catch(error => { if (inventories.get(bucket) === entry) inventories.delete(bucket); throw error; });
  inventories.set(bucket, entry);
  return entry.promise;
}
export async function getBucketObjects(bucket: string, page = 1, pageSize = 20) {
  const objects = await getBucketInventory(bucket);
  return { items: objects.slice((Math.max(1, page) - 1) * pageSize, Math.max(1, page) * pageSize), total: objects.length };
}
export async function computeBucketUsage(bucket: string) {
  const objects = await getBucketInventory(bucket);
  return { totalBytes: objects.reduce((sum, object) => sum + object.size, 0), count: objects.length };
}
export async function computeAllBucketsUsage() {
  const usages = await Promise.all((await listStorageBuckets()).map(computeBucketUsage));
  return usages.reduce((total, usage) => ({ totalBytes: total.totalBytes + usage.totalBytes, count: total.count + usage.count }), { totalBytes: 0, count: 0 });
}

export async function deleteBucketObject(bucket: string, name: string) {
  const { data, error } = await supabase.storage.from(bucket).remove([name]);
  if (error) throw error;
  if (!data?.length) throw new Error('The file could not be deleted. Check your storage permissions.');
  invalidateStorageInventory(bucket);
  return { ok: true, clearedRefs: 0 };
}
