import { supabase } from '../lib/supabase';
import type { TopStarProfile } from '../hooks/useTopStars';
export interface StudentScoreboard { year: number; editions: number[]; students: TopStarProfile[]; }
export async function getStudentScoreboard(year?: number): Promise<StudentScoreboard> {
  const { data, error } = await supabase.rpc('get_student_scoreboard', { p_year: year ?? null });
  if (error) throw error;
  return data as StudentScoreboard;
}
export const TOUR_VERSION = 1;
export function studentTourKey(userId: string) { return `rico_student_tour_v${TOUR_VERSION}:${userId}`; }
export async function hasSeenStudentTour(userId: string) {
  const { data, error } = await supabase.from('student_dashboard_onboarding').select('status').eq('user_id', userId).eq('tour_version', TOUR_VERSION).maybeSingle();
  if (error) throw error;
  return !!data;
}
export async function saveStudentTour(userId: string, status: 'completed' | 'skipped') {
  const { error } = await supabase.from('student_dashboard_onboarding').upsert({ user_id: userId, tour_version: TOUR_VERSION, status });
  if (error) throw error;
}
