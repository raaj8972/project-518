import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
console.log('[AuthContext.tsx] Module execution started. React available:', !!React, 'useState available:', !!useState);
import { supabase } from '../lib/supabase';


interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null; // Generic user object to bridge types
  login: (email: string, password: string, totpCode?: string) => Promise<{ success: boolean; requiresTOTP?: boolean; role?: string; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  setupTOTP: () => Promise<{ secret: string; qrCode: string } | { error: string } | null>;
  verifyTOTP: (token: string, secret: string) => Promise<boolean>;
  enableTOTP: (token: string, secret: string) => Promise<boolean>;
  disableTOTP: () => Promise<boolean>;
  isTOTPEnabled: boolean;
  requiresMFA: boolean;
  completeMFA: (code: string) => Promise<{ success: boolean; requiresTOTP?: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  getValidToken: () => Promise<string | null>;
  lastAuthError: string | null;
  isLoggingOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// [DEDUPE] Use window bridge for singleton Context
const PrimaryAuthContext = ((typeof window !== 'undefined') 
  ? ((window as any).__AUTH_CONTEXT__ || ((window as any).__AUTH_CONTEXT__ = AuthContext))
  : AuthContext) as React.Context<AuthContextType | undefined>;


export function AuthProvider({ children }: { children: ReactNode }) {
  console.log('[AuthProvider] Rendering');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTOTPEnabled, setIsTOTPEnabled] = useState(false);
  const [lastAuthError, setLastAuthError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const pendingFactorRef = useRef<string | null>(null);
  const enrollmentFactorRef = useRef<string | null>(null);
  const currentInitIdRef = useRef<number>(0);

  useEffect(() => {
    let pendingAuth: { key: string; request: Promise<void> } | undefined;
    const { data: { subscription: supabaseListener } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) { currentInitIdRef.current += 1; clearAuthState(); return; }
      const key = session.user.id + session.access_token;
      if (pendingAuth?.key === key) return;
      const request = handleUserAuthenticated(session.user).finally(() => { if (pendingAuth?.request === request) pendingAuth = undefined; });
      pendingAuth = { key, request };
    });

    // Global mount-level failsafe (15s)
    const mountFailsafe = setTimeout(() => {
      setLoading(false);
      console.warn('[AuthContext] Global mount failsafe hit — forcing loading=false');
    }, 15000);

    const handleUserAuthenticated = async (authUser: any) => {
      const initId = ++currentInitIdRef.current;
      const email = (authUser.email || '').trim().toLowerCase();
      console.log(`[AuthContext] Initializing user [${initId}]:`, email);
      setLastAuthError(null);
      
      // Hard 10s timeout — if any network call hangs, loading is always cleared
      const authTimeout = setTimeout(() => {
        if (currentInitIdRef.current !== initId) return;
        console.warn(`[AuthContext] handleUserAuthenticated [${initId}] timed out — forcing loading=false`);
        setLoading(false);
      }, 10000);

      try {
        setLoading(true);
        if (['coordinator', 'security', 'cr'].includes(authUser.app_metadata?.role)) {
          clearAuthState();
          return;
        }
        if (!email) {
          console.warn(`[AuthContext] No email found for user [${initId}]`);
          return;
        }

        const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assuranceError || (assurance?.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2')) {
          clearAuthState();
          if (!assuranceError) {
            const { data: factors } = await supabase.auth.mfa.listFactors();
            pendingFactorRef.current = factors?.totp.find(factor => factor.status === 'verified')?.id || null;
            setRequiresMFA(!!pendingFactorRef.current);
          }
          if (assuranceError) setLastAuthError('Could not verify account security. Please sign in again.');
          return;
        }
        const userId = authUser.id;
        
        let { data: userData, error: membershipError } = await supabase.from('admin_users')
          .select('*').eq('user_id', userId).maybeSingle();
        if (currentInitIdRef.current !== initId) return;
        if (membershipError || !userData || !['admin', 'owner'].includes(userData.role)) {
          clearAuthState();
          setLastAuthError('This account has no active admin access. Contact the owner.');
          return;
        }
        const role = userData.role;
        if (currentInitIdRef.current !== initId) return;

        const { data: assignedPermissions } = await supabase.from('admin_permissions').select('*').eq('user_id',userId).maybeSingle();
        if (currentInitIdRef.current !== initId) return;
        userData = { ...userData, permissions: assignedPermissions || {} };
        console.log('[AuthContext] Finalizing user state');
        setUser({
          ...authUser,
          id: userId,
          user_metadata: {
            ...userData,
            role: userData.role || role
          }
        });
        setRequiresMFA(false);
        pendingFactorRef.current = null;
        setIsAuthenticated(true);
        setIsTOTPEnabled(assurance?.nextLevel === 'aal2');

      } catch (err: any) {
        if (currentInitIdRef.current !== initId) {
          console.log(`[AuthContext] [${initId}] Caught error but task is stale, ignoring:`, err.message);
          return;
        }
        
        // Detailed logging for AbortError
        if (err.name === 'AbortError' || err.message?.includes('aborted')) {
          console.warn(`[AuthContext] [${initId}] Initialization aborted:`, err.message);
          // Don't set error message for aborts, but logging=false is still handled by finally
          return;
        }

        console.error(`[AuthContext] [${initId}] FATAL: Error during user initialization:`, err);
        setLastAuthError(`Initialization Error: ${err.message || 'Unknown failure'}`);
      } finally {
        clearTimeout(authTimeout);
        if (currentInitIdRef.current === initId) {
          console.log(`[AuthContext] [${initId}] Cleaning up loading state.`);
          setLoading(false);
        } else {
          console.log(`[AuthContext] [${initId}] Leaving loading=true (newer task exists)`);
        }
      }
    };

    const clearAuthState = () => {
      setUser(null);
      setIsAuthenticated(false);
      setIsTOTPEnabled(false);
      setRequiresMFA(false);
      pendingFactorRef.current = null;
      setLoading(false);
    };

    return () => {
      supabaseListener.unsubscribe();
      clearTimeout(mountFailsafe);
    };
  }, []);

  // Separate effect for Realtime subscription
  useEffect(() => {
    if (!user) return;

    let channel: any;
    const setupRealtime = async () => {
      try {
        const { isRealtimeSupported } = await import('../lib/supabase');
        if (!isRealtimeSupported()) {
          console.info('[Auth] Supabase Realtime (WebSockets) disabled for this session.');
          return;
        }

        if (!supabase) return;
        channel = supabase.channel(`admin-session-${user.id}`, {
          config: {
            broadcast: { self: false },
            presence: { key: user.id },
          }
        })
          .on(
            'broadcast',
            { event: 'force_logout' },
            (payload) => {
              console.log('[Realtime] Received force logout signal:', payload);
              if (!payload.payload?.targetUserId || payload.payload.targetUserId === user.id) {
                logout();
              }
            }
          )
          .subscribe((status, err) => {
            if (status === 'CHANNEL_ERROR') {
              console.warn('[Supabase Realtime] Channel subscription failed:', err);
            }
          });
      } catch (e) {
        console.warn('[Auth] Supabase realtime connection setup failed:', e);
      }
    };

    setupRealtime();

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [user?.id]);

  const login = async (email: string, password: string, totpCode?: string): Promise<{ success: boolean; requiresTOTP?: boolean; role?: string; error?: string }> => {
    try {
      const actualEmail = email.trim().toLowerCase();
      let { data, error } = await supabase.auth.signInWithPassword({ email: actualEmail, password });
      if (error) throw error;

      const authUser = data.user;
      if (!authUser) return { success: false, error: 'Invalid credentials' };

      // Fetch role and metadata
      const { data: userDataList } = await supabase.from('admin_users').select('*').eq('user_id',authUser.id);
      const userData = userDataList && userDataList.length > 0 ? userDataList[0] : ({} as any);
      const role = userData?.role;
      if (!['admin','owner','council'].includes(role || '')) {
        await supabase.auth.signOut();
        return { success:false, error:'This account has no active admin access. Contact the owner.' };
      }
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      const factor = factors.totp.find(item => item.status === 'verified');
      if (factor) {
        if (!totpCode) { pendingFactorRef.current = factor.id; setRequiresMFA(true); return { success: false, requiresTOTP: true, role }; }
        const { error: challengeError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: totpCode });
        if (challengeError) return { success: false, requiresTOTP: true, role, error: 'Invalid 2FA code' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Authentication failed' };
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/admin',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('[Auth] Google login error:', error);
      return { success: false, error: error.message || 'Google Sign-In failed' };
    }
  };

  const logout = async (): Promise<void> => {
    console.log('[AuthContext] Initiating logout...');
    setIsLoggingOut(true); // <-- immediately signal logout to all consumers
    try {
      // 1. Optimistic UI update - Clear state immediately
      setUser(null);
      setIsAuthenticated(false);
      setIsTOTPEnabled(false);
      setRequiresMFA(false);
      pendingFactorRef.current = null;
      setLoading(false);

      // 2. Clear all persistence layers
      if (typeof window !== 'undefined') {
        // Clear session storage
        sessionStorage.clear();
        
        // Targeted localStorage clearing for all auth providers
        const keysToRemove = Object.keys(localStorage).filter(key => 
          key.startsWith('sb-') || 
          key.includes('supabase') || 
          key.includes('firebase') ||
          key.includes('auth-token')
        );
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`[AuthContext] Cleared ${keysToRemove.length} auth-related storage keys.`);
      }

      // 3. Supabase global sign out (best effort, but we SHOULD await it)
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.warn('[AuthContext] Supabase signOut error (non-critical):', err);
      }
    } catch (error) {
      console.error('[AuthContext] Logout Error:', error);
      // Ensure state is cleared even on error
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const completeMFA = async (code: string) => {
    const factorId = pendingFactorRef.current;
    if (!factorId || !/^\d{6}$/.test(code)) return { success: false, requiresTOTP: true, error: 'Enter your authenticator code' };
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) return { success: false, requiresTOTP: true, error: 'Invalid authenticator code' };
    pendingFactorRef.current = null;
    setRequiresMFA(false);
    return { success: true };
  };

  const setupTOTP = async (): Promise<{ secret: string; qrCode: string } | { error: string } | null> => {
    try {
      if (!user) return { error: 'User not authenticated' };
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Festival authenticator ${Date.now()}` });
      if (error) throw error;
      enrollmentFactorRef.current = data.id;
      return { secret: data.totp.secret, qrCode: data.totp.qr_code };
    } catch { return { error: 'Could not start authenticator enrollment. Please try again.' }; }
  };

  const verifyTOTP = async (token: string, _secret: string): Promise<boolean> => {
    const factorId = enrollmentFactorRef.current;
    if (!factorId || !/^\d{6}$/.test(token)) return false;
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: token });
    return !error;
  };

  const enableTOTP = async (token: string, secret: string): Promise<boolean> => {
    if (!await verifyTOTP(token, secret)) return false;
    enrollmentFactorRef.current = null;
    setIsTOTPEnabled(true);
    return true;
  };

  const disableTOTP = async (): Promise<boolean> => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error || !user) return false;
    for (const factor of data.totp) {
      const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (removeError) return false;
    }
    setIsTOTPEnabled(false);
    return true;
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) return { success: false, error: 'Not authenticated' };
      
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      
      return { success: true };
    } catch (error: any) {
      console.error('[AuthContext] Password update error:', error);
      return { success: false, error: error.message || 'Failed to update password' };
    }
  };

  const getValidToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;

      return null;
    } catch (err) {
      console.error('[Auth] Error getting valid token:', err);
      return null;
    }
  }, [user]);

  // Membership is authoritative: deleted accounts lose open portals; changed permissions refresh without another login.
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !['admin','owner'].includes(user.user_metadata?.role)) return;
    let active=true, checking=false, queued=false;
    const check=async()=>{
      if(checking){queued=true;return;}checking=true;
      try {
        const {data:allowed,error}=await supabase.rpc('current_admin_access');
        if(!active||error)return;
        if(!allowed){await logout();if(window.location.pathname.startsWith('/admin'))window.location.assign('/login');return;}
        const [member,permission]=await Promise.all([
          supabase.from('admin_users').select('role').eq('user_id',user.id).maybeSingle(),
          supabase.from('admin_permissions').select('*').eq('user_id',user.id).maybeSingle(),
        ]);
        if(!active||member.error||permission.error)return;
        setUser((previous:any)=>{
          if(!previous||previous.id!==user.id)return previous;
          const nextRole=member.data?.role||previous.user_metadata?.role;
          if(previous.user_metadata?.role===nextRole&&JSON.stringify(previous.user_metadata?.permissions||{})===JSON.stringify(permission.data||{}))return previous;
          return {...previous,user_metadata:{...previous.user_metadata,role:nextRole,permissions:permission.data||{}}};
        });
      }catch{ /* Network failures do not grant access or alter the existing session. */ }
      finally{checking=false;if(queued&&active){queued=false;void check();}}
    };
    void check();
    const timer=window.setInterval(()=>void check(),30000);
    const focus=()=>void check();
    window.addEventListener('focus',focus);
    const channel=supabase.channel(`admin-membership-${user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'admin_users',filter:`user_id=eq.${user.id}`},focus).on('postgres_changes',{event:'*',schema:'public',table:'admin_permissions',filter:`user_id=eq.${user.id}`},focus).on('postgres_changes',{event:'DELETE',schema:'public',table:'admin_users'},focus).on('postgres_changes',{event:'DELETE',schema:'public',table:'admin_permissions'},focus).subscribe();
    return()=>{active=false;window.clearInterval(timer);window.removeEventListener('focus',focus);void supabase.removeChannel(channel);};
  },[isAuthenticated,user?.id]);

  const value: AuthContextType = {
    isAuthenticated,
    user,
    login,
    logout,
    loading,
    setupTOTP,
    verifyTOTP,
    enableTOTP,
    disableTOTP,
    isTOTPEnabled,
    requiresMFA,
    completeMFA,
    updatePassword,
    loginWithGoogle,
    getValidToken,
    lastAuthError,
    isLoggingOut
  };

  return (
    <PrimaryAuthContext.Provider value={value}>
      {children}
    </PrimaryAuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(PrimaryAuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};