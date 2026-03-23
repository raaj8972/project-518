import { supabase } from '../lib/supabase';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useCallback } from 'react';
import { toast } from 'react-hot-toast';

export const useXPEngine = () => {
  const { user } = useStudentAuth();

  const awardXP = useCallback(async (action: string, xp: number, meta?: any) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_action: action,
        p_xp: xp,
        p_meta: meta || {}
      });

      if (error) {
        // If RPC not found, fallback to manual insert
        if (error.code === 'PGRST202') {
           await supabase.from('student_activity_log').insert({
            user_id: user.id,
            action: action,
            xp_earned: xp,
            meta: meta || {}
          });
        }
      }
    } catch (err) {
      console.error('XP Engine Error:', err);
    }
  }, [user]);

  const likeProfile = useCallback(async (profileId: string) => {
    if (!user) {
      toast.error('Sign in to like profiles!');
      return false;
    }

    try {
      const { error } = await supabase
        .from('profile_likes')
        .insert({
          liker_id: user.id,
          profile_id: profileId
        });

      if (error) {
        if (error.code === '23505') {
          // Already liked, so unlike it
          await supabase
            .from('profile_likes')
            .delete()
            .eq('liker_id', user.id)
            .eq('profile_id', profileId);
          toast.success('Love retracted');
          return 'unliked';
        }
        throw error;
      }
      
      // Award XP in the background (non-blocking)
      awardXP('profile_like_interaction', 2, { target_id: profileId });
      
      // Return status immediately
      return 'liked';
    } catch (err: any) {
      console.error('[useXPEngine] Like Profile Error:', err);
      const isRlsError = err.code === '42501' || err.message?.includes('policy');
      const details = err.message || err.details || 'Check console';
      toast.error(isRlsError ? 'Permission denied (RLS)' : `Error ${err.code || 'Sync'}: ${details}`);
      return false;
    }
  }, [user, awardXP]);

  return { awardXP, likeProfile };
};
