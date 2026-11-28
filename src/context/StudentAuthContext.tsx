import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { studentProfileProblem, studentReturnPath } from '../utils/studentProfile';
import {getCollegeIdentity} from '../services/studentTeams';

export interface StudentProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  college: string | null;
  batch: string | null;
  participant_type: string | null;
  avatar_url: string | null;
  username: string | null;
  iqmg_number?: string | null;
  iqmg_status?: 'pending'|'verified'|'correction_required'|null;
  iqmg_note?: string|null;
  iqmg_updated_at?: string|null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

interface StudentAuthContextType {
  user: User | null;
  profile: StudentProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  isProfileComplete: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: (returnTo?: string) => Promise<void>;
  updateProfile: (updates: Partial<StudentProfile>) => Promise<{ error: any }>;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

// [DEDUPE] Use window bridge for singleton Context
const PrimaryStudentAuthContext = ((typeof window !== 'undefined')
  ? ((window as any).__STUDENT_AUTH_CONTEXT__ || ((window as any).__STUDENT_AUTH_CONTEXT__ = StudentAuthContext))
  : StudentAuthContext) as React.Context<StudentAuthContextType | undefined>;

export const useStudentAuth = () => {
  const context = useContext(PrimaryStudentAuthContext);
  if (context === undefined) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  }
  return context;
};

export function StudentAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const activeUser = useRef<string | null>(null);
  const profileRequests = useRef(new Map<string, Promise<void>>());
  const sessionVersion = useRef(0);

  const loadProfile = async (userId: string, userMetadata: any, version: number) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (activeUser.current !== userId || sessionVersion.current !== version) return;
      if (error) {
        if (error.code === 'PGRST116' && userMetadata) {
          // Profile doesn't exist, create it from metadata
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              full_name: userMetadata.full_name || userMetadata.name || null,
              phone: userMetadata.phone || null,
              college: userMetadata.college || null,
              batch: userMetadata.batch || null,
              participant_type: userMetadata.participant_type || null,
              avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
              is_approved: false
            })
            .select()
            .single();

          if (createError) {
            console.error('[StudentAuth] Error creating profile:', createError);
          } else {
            if (activeUser.current === userId && sessionVersion.current === version) setProfile(newProfile as StudentProfile);
          }
        } else {
          console.error('[StudentAuth] Error fetching profile:', error);
          setProfile(null);
        }
      } else {
        const identity = await getCollegeIdentity().catch(error => {
          console.error('[StudentAuth] College identity refresh failed:', error);
          return undefined;
        });
        if (activeUser.current === userId && sessionVersion.current === version) setProfile(previous => ({...data,iqmg_number:identity===undefined&&previous?.id===userId?previous.iqmg_number:identity?.iqmg_number||null,iqmg_status:identity===undefined&&previous?.id===userId?previous.iqmg_status:identity?.status||null,iqmg_note:identity===undefined&&previous?.id===userId?previous.iqmg_note:identity?.note||null,iqmg_updated_at:identity===undefined&&previous?.id===userId?previous.iqmg_updated_at:identity?.updated_at||null} as StudentProfile));
      }
    } catch (err) {
      console.error('[StudentAuth] Unexpected error fetching profile:', err);
      if (activeUser.current === userId && sessionVersion.current === version) setProfile(null);
    }
  };

  const fetchProfile = (userId: string, metadata?: any) => {
    if (activeUser.current !== userId) return Promise.resolve();
    const current = profileRequests.current.get(userId);
    if (current) return current;
    const request = loadProfile(userId, metadata, sessionVersion.current).finally(() => {
      if (profileRequests.current.get(userId) === request) profileRequests.current.delete(userId);
    });
    profileRequests.current.set(userId, request);
    return request;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let alive = true;
    let applied: string | undefined;
    const initTimer = setTimeout(() => { if (alive) setLoading(false); }, 5000);
    const applySession = (currentUser: User | null, force = false) => {
      const key = currentUser ? currentUser.id + JSON.stringify(currentUser.user_metadata) : 'anonymous';
      if (!force && applied === key) return;
      applied = key;
      if (activeUser.current !== (currentUser?.id || null) || force) {
        sessionVersion.current += 1;
        profileRequests.current.clear();
        setProfile(null);
      }
      activeUser.current = currentUser?.id || null;
      setUser(currentUser);
      if (!currentUser) { setProfile(null); setLoading(false); clearTimeout(initTimer); return; }
      if (['coordinator', 'security', 'cr'].includes(currentUser.app_metadata?.role)) {
        setProfile(null); setLoading(false); clearTimeout(initTimer); return;
      }
      setLoading(true);
      // Do not await authenticated queries inside Supabase's auth callback lock.
      setTimeout(() => {
        if (!alive || activeUser.current !== currentUser.id) return;
        void fetchProfile(currentUser.id, currentUser.user_metadata).finally(() => {
          if (alive && activeUser.current === currentUser.id) setLoading(false);
          clearTimeout(initTimer);
        });
      }, 0);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (alive) applySession(session?.user || null, event === 'USER_UPDATED');
    });
    void supabase.auth.getSession().then(({ data: { session } }) => { if (alive) applySession(session?.user || null); }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; clearTimeout(initTimer); subscription.unsubscribe(); };
  }, []);

  // Realtime subscription for profile changes (approval, update, etc.)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {

          if (payload.new) {
            void fetchProfile(user.id);
          }
        }
      )
      .on('postgres_changes', {event:'*',schema:'public',table:'student_iqmg_identities',filter:`user_id=eq.${user.id}`},()=>{void fetchProfile(user.id);})
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const isProfileComplete = !!profile && studentProfileProblem(profile) === null;

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isApproved: profile?.is_approved ?? false,
    isProfileComplete,
    signOut: async () => {
      console.log('[StudentAuth] signOut initiated');
      try {
        // 1. Clear Storage first so user is effectively logged out locally
        Object.keys(localStorage).forEach(key => {
          if (key.includes('auth') || key.includes('supabase') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });

        // 2. Invalidate pending responses before clearing this session.
        activeUser.current = null;
        sessionVersion.current += 1;
        profileRequests.current.clear();
        setUser(null);
        setProfile(null);

        // 3. Attempt Supabase signOut
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.error('[StudentAuth] Supabase signOut error:', err);
        }
      } finally {
        // 4. Always redirect with a full page reload for a clean state
        console.log('[StudentAuth] Force redirecting to login...');
        window.location.href = '/student/login';
      }
    },
    refreshProfile,
    signInWithGoogle: async (returnTo?: string) => {
      const target = studentReturnPath(returnTo);
      const callback = new URL('/student/login', window.location.origin);
      if (target !== '/dashboard') callback.searchParams.set('redirect', target);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callback.href,
          queryParams: {
            prompt: 'select_account consent',
            access_type: 'offline'
          }
        }
      });
      if (error) throw error;
    },
    updateProfile: async (updates: Partial<StudentProfile>) => {

      if (!user) return { error: new Error('No user logged in') };
      if (Object.keys(updates).length === 0) { await refreshProfile(); return {error:null}; }
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const { error } = await Promise.race([
          supabase.from('profiles').update(updates).eq('id', user.id),
          new Promise<{ error: any }>((_, reject) => { timeout = setTimeout(() => reject(new Error('Update timeout')), 8000); })
        ]) as { error: any };

        if (error) {
          console.error('[StudentAuth] updateProfile error:', error);
          return { error };
        }

        console.log('[StudentAuth] updateProfile success');
        await refreshProfile();
        return { error: null };
      } catch (err: any) {
        console.error('[StudentAuth] updateProfile catch:', err.message);
        // On timeout or error, still try to refresh and return
        await refreshProfile().catch(() => {});
        return { error: err };
      } finally { clearTimeout(timeout); }
    }
  };

  return (
    <PrimaryStudentAuthContext.Provider value={value}>
      {children}
    </PrimaryStudentAuthContext.Provider>
  );
}

