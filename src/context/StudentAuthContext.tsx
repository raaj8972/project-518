import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface StudentProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  college: string | null;
  batch: string | null;
  participant_type: string | null;
  avatar_url: string | null;
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
  signInWithGoogle: () => Promise<void>;
  updateProfile: (updates: Partial<StudentProfile>) => Promise<{ error: any }>;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

// [DEDUPE] Ensure singleton Context across module duplication
const PrimaryStudentAuthContext = ((typeof window !== 'undefined') 
  ? ((window as any).__STUDENT_AUTH_CONTEXT__ || ((window as any).__STUDENT_AUTH_CONTEXT__ = StudentAuthContext))
  : StudentAuthContext) as React.Context<StudentAuthContextType | undefined>;

export const StudentAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, userMetadata?: any) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

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
            setProfile(newProfile as StudentProfile);
          }
        } else {
          console.error('[StudentAuth] Error fetching profile:', error);
          setProfile(null);
        }
      } else {
        setProfile(data as StudentProfile);
      }
    } catch (err) {
      console.error('[StudentAuth] Unexpected error fetching profile:', err);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    console.log('[StudentAuth] Initializing session check...');
    const initTimer = setTimeout(() => {
      if (loading) {
        console.warn('[StudentAuth] Session initialization timed out, forcing loading=false');
        setLoading(false);
      }
    }, 5000);

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[StudentAuth] getSession complete:', session?.user?.id || 'no user');
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
      clearTimeout(initTimer);
    }).catch(err => {
      console.error('[StudentAuth] getSession error:', err);
      setLoading(false);
      clearTimeout(initTimer);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[StudentAuth] Auth state change:', _event, session?.user?.id);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchProfile(currentUser.id, currentUser.user_metadata);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isProfileComplete = !!(profile?.full_name && profile?.phone && profile?.batch);

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
        
        // 2. Clear state
        setUser(null);
        setProfile(null);
        
        // 3. Attempt Supabase signOut (but don't wait forever)
        supabase.auth.signOut().catch(err => console.error('[StudentAuth] Supabase signOut error:', err));
      } finally {
        // 4. Always redirect
        console.log('[StudentAuth] Force redirecting to login...');
        window.location.href = '/student/login';
      }
    },
    refreshProfile,
    signInWithGoogle: async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/student/login`,
          queryParams: {
            prompt: 'select_account consent',
            access_type: 'offline'
          }
        }
      });
      if (error) throw error;
    },
    updateProfile: async (updates: Partial<StudentProfile>) => {
      console.log('[StudentAuth] updateProfile initiated', updates);
      if (!user) return { error: 'No user logged in' };
      
      try {
        const { error } = await Promise.race([
          supabase.from('profiles').update(updates).eq('id', user.id),
          new Promise<{ error: any }>((_, reject) => setTimeout(() => reject(new Error('Update timeout')), 8000))
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
        return { error: err.message };
      }
    }
  };

  return (
    <PrimaryStudentAuthContext.Provider value={value}>
      {children}
    </PrimaryStudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => {
  const context = useContext(PrimaryStudentAuthContext);
  if (context === undefined) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  }
  return context;
};
