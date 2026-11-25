import { supabase } from '../lib/supabase';

export interface RankingData { profiles: any[]; registrations: any[]; rounds: any[]; eventRounds: any[] }
let cache: { data: RankingData; expires: number } | undefined;
let pending: Promise<RankingData> | undefined;
let generation = 0;
let authScope = '';
const listeners = new Set<() => void>();
let channel: ReturnType<typeof supabase.channel> | undefined;
let pollTimer: ReturnType<typeof setInterval> | undefined;
const refreshRankings = () => { if (typeof document !== 'undefined' && document.hidden) return; invalidateRankingData(); listeners.forEach(notify => notify()); };
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
export function invalidateRankingData() { cache = undefined; pending = undefined; generation += 1; }
supabase.auth.onAuthStateChange((_event, session) => {
  const scope = session ? session.user.id + JSON.stringify(session.user.app_metadata) : 'anonymous';
  if (scope !== authScope) { authScope = scope; invalidateRankingData(); }
});
export function getRankingData(): Promise<RankingData> {
  if (cache && cache.expires > Date.now()) return Promise.resolve(cache.data);
  if (pending) return pending;
  const version = generation;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const request = Promise.all([
    supabase.from('public_profiles').select('id, full_name, username, avatar_url, aura_color, background_url, batch, likes_count, student_xp').eq('is_approved', true).abortSignal(controller.signal),
    supabase.from('public_ranking_registrations').select('id, user_id, status, is_active, event_id, event').abortSignal(controller.signal),
    supabase.from('registration_rounds').select('id, registration_id, status, round_id, prize_rank').abortSignal(controller.signal),
    supabase.from('event_rounds').select('id, name').abortSignal(controller.signal),
  ]).then(results => {
    const error = results.find(result => result.error)?.error;
    if (error) throw error;
    const data = { profiles: results[0].data || [], registrations: results[1].data || [], rounds: results[2].data || [], eventRounds: results[3].data || [] };
    if (version === generation) cache = { data, expires: Date.now() + 30000 };
    return data;
  }).finally(() => { clearTimeout(timeout); if (pending === request) pending = undefined; });
  pending = request;
  return request;
}
export function subscribeRankingData(listener: () => void) {
  listeners.add(listener);
  if (!channel) {
    channel = supabase.channel('shared-ranking-data');
    for (const table of ['profiles', 'student_xp', 'registrations', 'registration_rounds', 'event_rounds', 'student_event_participation', 'student_verified_xp_awards', 'events', 'homepage_settings']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        invalidateRankingData();
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => listeners.forEach(notify => notify()), 150);
      });
    }
    channel.subscribe();
    pollTimer = setInterval(refreshRankings, 60000);
    if (typeof window !== 'undefined') window.addEventListener('focus', refreshRankings);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = undefined;
      if (typeof window !== 'undefined') window.removeEventListener('focus', refreshRankings);
      if (channel) void supabase.removeChannel(channel);
      channel = undefined;
      if (refreshTimer) clearTimeout(refreshTimer);
    }
  };
}
