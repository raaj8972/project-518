import { getRankingData, subscribeRankingData, invalidateRankingData } from '../services/rankingData';
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

export function useTopStars(limit: number = 20) {
  const [stars, setStars] = useState<TopStarProfile[]>([]);
  const [majorEvents, setMajorEvents] = useState<string[]>([]);
  const requestId = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStars = useCallback(async () => {
    const request = ++requestId.current;
    setError(null);
    try {
      const { profiles: approvedProfiles, registrations: regs, rounds, eventRounds } = await getRankingData();
      if (request !== requestId.current) return;
      const profiles = approvedProfiles.filter(profile => profile.full_name !== null);

      // Create a map of round_id to round name
      const roundNameMap: Record<string, string> = {};
      eventRounds.forEach(er => {
        roundNameMap[er.id] = er.name;
      });

      // Count approved registrations per event to dynamically decide the top 2 Major Events
      const eventCounts: Record<string, { title: string; count: number }> = {};
      regs.forEach(r => {
        if (r.status === 'approved' && r.event_id && r.event) {
          if (!eventCounts[r.event_id]) {
            eventCounts[r.event_id] = { title: (Array.isArray(r.event) ? r.event[0]?.title : (r.event as { title: string }).title) || '', count: 0 };
          }
          eventCounts[r.event_id].count++;
        }
      });

      // Sort and extract top 2 event IDs and names
      const sortedEvents = Object.entries(eventCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 2);

      const computedMajorEventIds = sortedEvents.map(entry => entry[0]);
      const computedMajorNames = sortedEvents.map(entry => entry[1].title);
      
      // Fallback if there are less than 2 events with approved registrations
      const finalMajorNames = computedMajorNames.length >= 2
        ? computedMajorNames
        : computedMajorNames;

      setMajorEvents(finalMajorNames);

      // Map rounds by registration_id (O(N))
      const roundsByRegMap: Record<string, any[]> = {};
      rounds.forEach(rd => {
        if (!roundsByRegMap[rd.registration_id]) {
          roundsByRegMap[rd.registration_id] = [];
        }
        roundsByRegMap[rd.registration_id].push(rd);
      });

      // 3. Map registrations by user_id (O(N))
      const userRegs: Record<string, any[]> = {};
      regs.forEach(r => {
        if (!userRegs[r.user_id]) {
          userRegs[r.user_id] = [];
        }
        const rRounds = roundsByRegMap[r.id] || [];
        userRegs[r.user_id].push({
          ...r,
          registration_rounds: rRounds
        });
      });

      if (profiles) {
        const formatted = profiles.map((p: any) => {
          const xpRecord = Array.isArray(p.student_xp) ? p.student_xp[0] : p.student_xp;
          const xp = xpRecord?.xp_total || 0;
          const likes = p.likes_count || 0;
          
          const pRegs = userRegs[p.id] || [];
          
          let likesPoints = likes * 10;
          let participationPoints = 0;
          let roundsPoints = 0;
          let finalRoundPoints = 0;
          let prizePoints = 0;
          let roundsCleared = 0;
          let approvedEventsCount = 0;
          
          pRegs.forEach((r: any) => {
            const isMajor = computedMajorEventIds.includes(r.event_id || '');
            
            if (r.status === 'approved') {
              approvedEventsCount++;
              participationPoints += isMajor ? 30 : 15;
            }
            
            const rr = r.registration_rounds || [];
            rr.forEach((roundObj: any) => {
              if (roundObj.status === 'qualified') {
                roundsCleared++;
                
                // Base round qualified points
                roundsPoints += isMajor ? 40 : 20;
                
                // Final round qualified
                const roundName = roundNameMap[roundObj.round_id] || '';
                const isFinalRound = roundName.toLowerCase().includes('final');
                if (isFinalRound) {
                  finalRoundPoints += isMajor ? 60 : 30;
                }
                
                // Winner position points
                if (roundObj.prize_rank === '1st') {
                  prizePoints += isMajor ? 100 : 50;
                } else if (roundObj.prize_rank === '2nd') {
                  prizePoints += isMajor ? 60 : 30;
                } else if (roundObj.prize_rank === '3rd') {
                  prizePoints += isMajor ? 40 : 20;
                }
              }
            });
          });

          const totalScore = likesPoints + participationPoints + roundsPoints + finalRoundPoints + prizePoints;

          const participatedEvents = Array.from(new Set(
            pRegs
              .filter((r: any) => r.status === 'approved' && r.event)
              .map((r: any) => r.event.title)
          )) as string[];
          
          return {
            id: p.id,
            full_name: p.full_name,
            username: p.username,
            avatar_url: p.avatar_url,
            aura_color: p.aura_color,
            background_url: p.background_url,
            batch: p.batch,
            tier: xpRecord?.tier || 'bronze',
            xp: xp,
            likes_count: likes,
            hype_score: totalScore,
            participated_events: participatedEvents,
            rounds_cleared: roundsCleared,
            points_breakdown: {
              likes: likesPoints,
              participation: participationPoints,
              rounds: roundsPoints,
              finalRound: finalRoundPoints,
              prizes: prizePoints,
              events_count: approvedEventsCount
            }
          };
        });



        const sorted = formatted
          .sort((a, b) => b.hype_score - a.hype_score)
          .slice(0, limit)
          .map((p, i) => ({ ...p, rank: i + 1 }));

        setStars(sorted);
      }
    } catch (err) {
      console.error('[useTopStars] Error fetching stars:', err);
      if (request === requestId.current) setError('Live rankings could not load.');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchStars();

    return subscribeRankingData(() => { void fetchStars(); });
  }, [fetchStars]);

  const updateStar = useCallback((id: string, delta: number) => {
    setStars(prev => prev.map(star => 
      star.id === id ? { ...star, likes_count: Math.max(0, star.likes_count + delta) } : star
    ));
  }, []);

  const refreshStars = useCallback(() => { invalidateRankingData(); return fetchStars(); }, [fetchStars]);
  return { stars, majorEvents, loading, error, refetch: refreshStars, updateStar };
}
