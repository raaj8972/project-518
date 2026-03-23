import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStudentAuth } from '../context/StudentAuthContext';
import { Admirer } from '../types/data';
import { toast } from 'react-hot-toast';

export function useAdmirers() {
  const { user } = useStudentAuth();
  const [admirers, setAdmirers] = useState<Admirer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAdmirers = async () => {
      try {
        const { data, error } = await supabase
          .from('view_profile_admirers')
          .select('*')
          .eq('target_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[useAdmirers] Fetch Error:', error);
          throw error;
        }
        setAdmirers(data || []);
      } catch (err) {
        console.error('[useAdmirers] Catch Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdmirers();

    // Subscribe to new likes and unlikes
    const channel = supabase
      .channel('public:profile_likes:admirers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profile_likes' },
        (payload) => {
          console.log('[useAdmirers] Realtime payload:', payload);
          
          // For INSERT, payload.new.profile_id is the target
          // For DELETE, payload.old.profile_id is the target (since full replica identity is enabled)
          const targetId = payload.eventType === 'DELETE' ? payload.old?.profile_id : payload.new?.profile_id;

          if (String(targetId) === String(user.id)) {
            if (payload.eventType === 'INSERT' && payload.new.liker_id !== user.id) {
              toast('Someone liked your profile!', {
                icon: '💖',
                id: 'new-admirer',
                duration: 4000
              });
            }
            fetchAdmirers();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { admirers, loading };
}
