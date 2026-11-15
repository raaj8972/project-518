import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
console.log('[AuthContext.tsx] Module execution started. React available:', !!React, 'useState available:', !!useState);
import { supabase } from '../lib/supabase';
import { AdminService } from '../lib/adminService';
import { dualUpdate } from '../lib/dualDb';
import { isMasterOwner } from '../constants/owners';


interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null; // Generic user object to bridge types
  login: (email: string, password: string, totpCode?: string, bypassTOTP?: boolean) => Promise<{ success: boolean; requiresTOTP?: boolean; role?: string; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  setupTOTP: () => Promise<{ secret: string; qrCode: string } | { error: string } | null>;
  verifyTOTP: (token: string, secret: string) => Promise<boolean>;
  enableTOTP: (token: string, secret: string) => Promise<boolean>;
  disableTOTP: () => Promise<boolean>;
  isTOTPEnabled: boolean;
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


const isMasterBypassUser = (u: any | null | undefined): boolean => {
  if (!u) return false;
  
  // A user is only a "Bypass" user if they are using the virtual recovery identity.
  // We no longer block password changes based on a metadata flag to allow real accounts to pivot.
  return u.id === 'master-admin-bypass' || u.email === 'master-admin-bypass@virtual.local';
};

// Configuration for otplib (will be initialized in useEffect)
async function getAuthenticator() {
  const { authenticator } = await import('otplib');
  authenticator.options = { window: [1, 1] } as any;
  return authenticator;
}
const generateTOTPSecret = async (): Promise<string> => (await getAuthenticator()).generateSecret();
const buildOtpAuthUri = async (secret: string, email: string): Promise<string> => {
  const issuer = `${BRAND_NAME.toUpperCase()} ${BRAND_YEAR}`;
  return (await getAuthenticator()).keyuri(email || 'admin', issuer, secret);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  console.log('[AuthProvider] Rendering');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTOTPEnabled, setIsTOTPEnabled] = useState(false);
  const [lastAuthError, setLastAuthError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const currentInitIdRef = useRef<number>(0);

  const syncSupabaseAdmin = async (email: string) => {
    try {
      const { error } = await supabase.rpc('add_admin_by_email', { p_email: email });
      if (error) console.warn('[Auth] Supabase admin sync failed:', error);
      else console.log('[Auth] Supabase admin sync successful for:', email);
    } catch (err) {
      console.error('[Auth] Error sync admin status:', err);
    }
  };

  useEffect(() => {
    let pendingAuth: { key: string; request: Promise<void> } | undefined;
    const { data: { subscription: supabaseListener } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) { currentInitIdRef.current += 1; clearAuthState(); return; }
      const key = session.user.id + JSON.stringify(session.user.app_metadata);
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

        const userId = authUser.id;
        
        // Fetch or create admin record
        let allowed = false;
        let role = 'admin';
        let display_name = 'Admin';
        let permissions: any = {};

        if (isMasterBypassUser(authUser) || isMasterOwner(email)) {
          console.log(`[AuthContext] System Owner recognized [${initId}]:`, email);
          allowed = true;
          role = 'owner';
          display_name = isMasterOwner(email) ? 'System Owner' : 'Raaj';
          permissions = {
            can_events: true, can_schedule: true, can_gallery: true, can_sponsors: true, 
            can_registrations: true, can_faculty: true, can_chief_guests: true, can_security_passes: true
          };
        } else {
          console.log(`[AuthContext] Checking whitelist [${initId}] for:`, email);
          // Timeout the whitelist check individually too
          const whitelistResult = await Promise.race([
            AdminService.isEmailAllowed(email),
            new Promise<{ allowed: boolean; role: string; display_name: string; permissions?: any }>((res) =>
              setTimeout(() => {
                console.warn(`[AuthContext] isEmailAllowed [${initId}] timed out — denying access until authorization can be verified`);
                res({ allowed: false, role: '', display_name: '' });
              }, 6000)
            )
          ]);
          allowed = whitelistResult.allowed;
          role = whitelistResult.role;
          display_name = whitelistResult.display_name || 'Admin';
          permissions = whitelistResult.permissions || {};
        }

        console.log(`[AuthContext] [${initId}] Final whitelist result:`, { allowed, role, email });

        // Check if a newer initialization task has started
        if (currentInitIdRef.current !== initId) {
          console.warn(`[AuthContext] [${initId}] STALE - Abandoning (another task is current)`);
          return;
        }
        
        if (!allowed) {
          const errMsg = `Access Denied: ${email} is not whitelisted for Admin access.`;
          console.error(`[AuthContext] [${initId}] ${errMsg}`);
          setLastAuthError(errMsg);
          
          // Check if we are on an admin or management route before signing out.
          // This prevents regular students logging in from being signed out by the Admin provider.
          const isAdminPath = window.location.pathname.startsWith('/admin') ||
                              window.location.pathname.startsWith('/coordinator') ||
                              window.location.pathname.startsWith('/council') ||
                              window.location.pathname.startsWith('/security') ||
                              window.location.pathname.startsWith('/sports-admin');

          if (isAdminPath) {
            await supabase.auth.signOut();
          } else {
            console.log(`[AuthContext] Non-admin path (${window.location.pathname}). Clearing admin auth state without signing out of Supabase.`);
            clearAuthState();
          }
          return;
        }

        console.log(`[AuthContext] [${initId}] Access granted (role: ${role}). Fetching profile...`);
        // Fetch additional user data from dualDb
        let userData: any = null;
        try {
          const { data: userDataList } = await supabase.from('admin_users').select('*').eq('user_id',userId);
          if (userDataList && userDataList.length > 0) {
            userData = userDataList[0];
          }
        } catch (dbErr) {
          console.warn(`[AuthContext] [${initId}] admin_users read failed/timed out:`, dbErr);
        }
        
        if (currentInitIdRef.current !== initId) return;

        // EMERGENCY FALLBACK: If DB fails but user is known Owner, synthesize and upsert profile to DB
        if (!userData && isMasterOwner(email)) {
          console.log(`[AuthContext] [${initId}] Profile lookup failed for Owner. Creating DB record.`);
          userData = {
            user_id: userId,
            email: email.toLowerCase(),
            role: 'owner',
            display_name: 'System Owner',
            photo_url: authUser.photoURL || authUser.user_metadata?.avatar_url || '',
            last_login: new Date().toISOString()
          };
          
          // Upsert to DB
          await Promise.resolve(supabase.from('admin_users').upsert(userData, { onConflict: 'user_id' })).then(({ error }) => { if (error) throw error; }).catch(err => {
            console.warn('[AuthContext] Owner upsert to admin_users failed:', err);
          });
          
          await Promise.resolve(supabase.from('admin_permissions').upsert({
            user_id: userId,
            email: email.toLowerCase(),
            can_events: true, can_schedule: true, can_gallery: true, can_sponsors: true, 
            can_registrations: true, can_faculty: true, can_chief_guests: true, can_security_passes: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })).then(({ error }) => { if (error) throw error; }).catch(err => {
            console.warn('[AuthContext] Owner upsert to admin_permissions failed:', err);
          });
        }

        if (!userData && email) {
          console.log(`[AuthContext] [${initId}] Profile not found by user_id (${userId}). Trying email lookup:`, email);
          try {
            const { data: emailMatches } = await supabase.from('admin_users').select('*').eq('email',email);
            if (emailMatches && emailMatches.length > 0) {
              userData = emailMatches[0];
              console.log(`[AuthContext] [${initId}] Found existing profile by email. Linking to current session ID.`);
              dualUpdate('admin_users', userData.user_id, { user_id: userId }, 'user_id').catch(() => {});
              dualUpdate('admin_permissions', userData.user_id, { user_id: userId }, 'user_id').catch(() => {});
            }
          } catch (e) {
            console.warn(`[AuthContext] [${initId}] Profile email lookup failed:`, e);
          }
        }

        if (currentInitIdRef.current !== initId) return;

        if (!userData) {
          console.log('[AuthContext] Syncing first-time allowed user to admin_users:', email);
          userData = {
            user_id: userId,
            email: email.toLowerCase(),
            role: role || 'admin',
            display_name: display_name || authUser.displayName || authUser.user_metadata?.full_name || email.split('@')[0],
            photo_url: authUser.photoURL || authUser.user_metadata?.avatar_url || '',
            last_login: new Date().toISOString()
          };
          // Use direct supabase to avoid dualDb schema cache issues
          const { error: upsertErr } = await supabase
            .from('admin_users')
            .upsert(userData, { onConflict: 'user_id' });
          if (upsertErr) console.warn('[AuthContext] admin_users upsert failed:', upsertErr.message);

          const { error: permErr } = await supabase
            .from('admin_permissions')
            .upsert({
              user_id: userId,
              email: email.toLowerCase(),
              ...permissions,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
          if (permErr) console.warn('[AuthContext] admin_permissions upsert failed:', permErr.message);
        } else {
          console.log('[AuthContext] Profile found. Updating last login.');
          // Direct supabase call — avoids stale schema cache in dualDb
          supabase
            .from('admin_users')
            .update({ last_login: new Date().toISOString(), user_id: userId })
            .eq('user_id', userData.user_id)
            .then(({ error }) => {
              if (error) console.warn('[AuthContext] last_login update failed:', error.message);
            });
        }

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
        setIsAuthenticated(true);
        setIsTOTPEnabled(userData.totp_enabled || false);

        // Sync admin status to Supabase RPC (for RLS) — fire-and-forget
        if (role === 'admin' || role === 'owner' || isMasterBypassUser(authUser)) {
          syncSupabaseAdmin(email);
        }
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

  const login = async (email: string, password: string, totpCode?: string, bypassTOTP: boolean = false): Promise<{ success: boolean; requiresTOTP?: boolean; role?: string; error?: string }> => {
    try {
      const actualEmail = email.trim().toLowerCase();
      let { data, error } = await supabase.auth.signInWithPassword({ email: actualEmail, password });
      if (error) {
        const response = await fetch('/api/master-login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: actualEmail, password })
        });
        const recovery = await response.json().catch(() => null);
        if (!response.ok || !recovery?.token_hash) throw error;
        const verified = await supabase.auth.verifyOtp({ token_hash: recovery.token_hash, type: 'magiclink' });
        data = { ...verified.data, user: verified.data.user!, session: verified.data.session! };
        error = verified.error;
        if (error) throw error;
      }

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
      const totpEnabled = userData?.totp_enabled || false;
      const totpSecret = userData?.totp_secret;

      // Check if 2FA is enabled but no code provided
      if (totpEnabled && totpSecret && !totpCode && !bypassTOTP) {
        await supabase.auth.signOut();
        return { success: false, requiresTOTP: true, role };
      }

      // 2FA Verification
      if (totpEnabled && totpSecret && totpCode) {
        const ok = await verifyTOTP(totpCode, totpSecret);
        if (!ok) {
          await supabase.auth.signOut();
          return { success: false, error: 'Invalid 2FA code' };
        }
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

  const setupTOTP = async (): Promise<{ secret: string; qrCode: string } | { error: string } | null> => {
    try {
      if (!user) return { error: 'User not authenticated' };
      if (isMasterBypassUser(user)) return { error: 'Cannot setup 2FA for Master Admin' };

      const secret = await generateTOTPSecret();
      const otpauth = await buildOtpAuthUri(secret, user.email || '');
      const { toDataURL } = await import('qrcode');
      const qrCode = await toDataURL(otpauth, { width:200, margin:2 });

      return { secret, qrCode };
    } catch (error: any) {
      console.error('Error setting up TOTP:', error);
      return { error: error.message || 'Unknown error during TOTP setup' };
    }
  };

  const verifyTOTP = async (token: string, secret: string): Promise<boolean> => {
    try { return (await getAuthenticator()).check(token, secret); } catch { return false; }
  };

  const enableTOTP = async (token: string, secret: string): Promise<boolean> => {
    try {
      if (!user || !(await getAuthenticator()).check(token, secret)) return false;

      await dualUpdate('admin_users', user.id, {
        totp_enabled: true,
        totp_secret: secret
      }, 'user_id');

      setIsTOTPEnabled(true);
      return true;
    } catch (error) {
      console.error('Error enabling TOTP:', error);
      return false;
    }
  };

  const disableTOTP = async (): Promise<boolean> => {
    try {
      if (!user) return false;
      if (isMasterBypassUser(user)) return false;

      await dualUpdate('admin_users', user.id, {
        totp_enabled: false,
        totp_secret: null
      }, 'user_id');

      setIsTOTPEnabled(false);
      return true;
    } catch (error) {
      console.error('Error disabling TOTP:', error);
      return false;
    }
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