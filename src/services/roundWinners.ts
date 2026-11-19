import { supabase } from '../lib/supabase';

/** Some installations have no PostgREST FK between rounds and registrations. */
export async function getRoundWinners() {
  const { data: rounds, error } = await supabase.from('registration_rounds')
    .select('id, registration_id, status, prize_rank').not('prize_rank', 'is', null);
  if (error) throw error;
  if (!rounds?.length) return [];
  const ids = [...new Set(rounds.map(round => round.registration_id).filter(Boolean))];
  const registrations: any[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const result = await supabase.from('public_event_winners')
      .select('id, event_id, event_title, full_name, team_name, is_team_registration, team_members, user_id')
      .in('id', ids.slice(offset, offset + 100));
    if (result.error) throw result.error;
    registrations.push(...result.data || []);
  }
  const byId = new Map(registrations.map(registration => [registration.id, registration]));
  // The public view contains only awarded display fields; contacts and pass tokens stay private.
  return rounds.flatMap(round => byId.has(round.registration_id) ? [{ ...round, registration: byId.get(round.registration_id) }] : []);
}
