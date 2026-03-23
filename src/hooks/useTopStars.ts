import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface TopStarProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  aura_color: string | null;
  background_url: string | null;
  batch: string | null;
  tier: string;
  xp: number;
  likes_count: number;
  hype_score: number;
  rank: number;
}

export function useTopStars(limit: number = 20) {
  const [stars, setStars] = useState<TopStarProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStars = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          full_name, 
          avatar_url, 
          aura_color,
          background_url,
          batch, 
          likes_count, 
          student_xp ( tier, xp_total )
        `)
        .eq('is_approved', true);

      if (error) throw error;

      if (data) {
        const formatted = data.map((p: any) => {
          // Handle student_xp being either an object (from single join) or array
          const xpRecord = Array.isArray(p.student_xp) ? p.student_xp[0] : p.student_xp;
          const xp = xpRecord?.xp_total || 0;
          const likes = p.likes_count || 0;
          return {
            id: p.id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            aura_color: p.aura_color,
            background_url: p.background_url,
            batch: p.batch,
            tier: xpRecord?.tier || 'bronze',
            xp: xp,
            likes_count: likes,
            hype_score: (likes * 500) + xp
          };
        })
        .sort((a, b) => b.hype_score - a.hype_score)
        .slice(0, limit)
        .map((p, i) => ({ ...p, rank: i + 1 }));

        setStars(formatted);
      }
    } catch (err) {
      console.error('[useTopStars] Error fetching stars:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchStars();

    // Subscribe to changes in profiles (likes_count)
    const profileSubscription = supabase
      .channel('top-stars-profiles')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles' 
      }, () => {
        fetchStars();
      })
      .subscribe();

    // Subscribe to changes in student_xp
    const xpSubscription = supabase
      .channel('top-stars-xp')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'student_xp' 
      }, () => {
        fetchStars();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileSubscription);
      supabase.removeChannel(xpSubscription);
    };
  }, [fetchStars]);

  const updateStar = useCallback((id: string, delta: number) => {
    setStars(prev => prev.map(star => 
      star.id === id ? { ...star, likes_count: Math.max(0, star.likes_count + delta) } : star
    ));
  }, []);

  return { stars, loading, refetch: fetchStars, updateStar };
}
