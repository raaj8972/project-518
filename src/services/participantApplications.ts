import { supabase } from '../lib/supabase';
import type { Audition } from '../types/data';

/** Fetch all assigned applications, bypassing the five-minute generic read cache. */
export async function fetchAuditionApplications(): Promise<Audition[]> {
  const entries: Audition[] = [];
  const size = 500;
  for (let offset = 0; ; offset += size) {
    const { data, error } = await supabase.from('auditions').select('*').order('created_at', { ascending: false }).order('id').range(offset, offset + size - 1);
    if (error) throw new Error('Audition applications could not load. Please retry.');
    entries.push(...(data || []));
    if (!data || data.length < size) return entries;
  }
}
