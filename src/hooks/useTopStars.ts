import { getStudentScoreboard } from '../services/studentRewards';
import { subscribeRankingData, invalidateRankingData } from '../services/rankingData';
import { useEffect, useState, useCallback, useRef } from 'react';

export interface TopStarProfile {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  aura_color: string | null;
  background_url: string | null;
  batch: string | null;
  tier: string;
  xp: number;
  likes_count: number;
  hype_score: number;
  rank: number;
  verified_events?: number;
  festival_year?: number;
  participated_events?: string[];
  rounds_cleared?: number;
  points_breakdown?: {
    likes: number;
    participation: number;
    rounds: number;
    finalRound: number;
    prizes: number;
    events_count: number;
  };
}

export function useTopStars(limit: number = 20, order: 'points' | 'likes' = 'points', edition?: number) {
  const [stars, setStars] = useState<TopStarProfile[]>([]);
  const [editions, setEditions] = useState<number[]>([]);
  const [year, setYear] = useState<number>();
  const requestId = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStars = useCallback(async () => {
    const request = ++requestId.current;
    setError(null);
    try {
      const scoreboard = await getStudentScoreboard(edition);
      if (request !== requestId.current) return;
      setEditions(scoreboard.editions); setYear(scoreboard.year);
      const rows = order === 'likes'
        ? [...scoreboard.students].sort((a,b) => b.likes_count-a.likes_count || a.full_name.localeCompare(b.full_name) || a.id.localeCompare(b.id))
        : scoreboard.students;
      setStars(rows.slice(0,limit));

    } catch (err) {
      console.error('[useTopStars] Error fetching stars:', err);
      if (request === requestId.current) setError('Live rankings could not load.');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [limit, order, edition]);

  useEffect(() => {
    setLoading(true);
    fetchStars();
    const unsubscribe = subscribeRankingData(() => { void fetchStars(); });
    return () => { requestId.current += 1; unsubscribe(); };
  }, [fetchStars]);

  const updateStar = useCallback((id: string, delta: number) => {
    setStars(prev => prev.map(star => 
      star.id === id ? { ...star, likes_count: Math.max(0, star.likes_count + delta) } : star
    ));
  }, []);

  const refreshStars = useCallback(() => { invalidateRankingData(); return fetchStars(); }, [fetchStars]);
  return { stars, editions, year, loading, error, refetch: refreshStars, updateStar };
}
