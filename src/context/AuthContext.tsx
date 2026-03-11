import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import { createContext, useContext, useState, useEffect, ReactNode, FC } from 'react';
import { supabase } from '../lib/supabase';
import { firebaseAuth, db } from '../lib/firebase';
import { dualUpdate } from '../lib/dualDb';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, signInWithCustomToken } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { authenticator } from 'otplib';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';


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
  registerPasskey: () => Promise<{ success: boolean; error?: string }>;
  loginWithPasskey: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isMasterBypassUser = (u: any | null | undefined): boolean => {
  if (!u) return false;
  const meta = (u as any)?.user_metadata || {};
  return Boolean(meta.master_bypass) || u.id === 'master-admin-bypass';
};

// Configure otplib authenticator (base32 secret, 30s window)
// Move outside component to avoid side effects during render
authenticator.options = { window: [1, 1] } as any; // allow +/- 1 step for clock skew

const generateTOTPSecret = (): string => authenticator.generateSecret();

const buildOtpAuthUri = (secret: string, email: string): string => {
  const issuer = `${BRAND_NAME.toUpperCase()} ${BRAND_YEAR}`;
  return authenticator.keyuri(email || 'admin', issuer, secret);
};

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTOTPEnabled, setIsTOTPEnabled] = useState(false);

  useEffect(() => {
    // Firebase Auth State Listener
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch additional user data (roles, etc.) from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'admin_users', firebaseUser.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          
          setUser({
            ...firebaseUser,
            id: firebaseUser.uid, // Map uid to id to match old Supabase schema
            user_metadata: {
              ...userData,
              role: userData.role
            }
          } as any);
          setIsAuthenticated(true);
          
          // Legacy TOTP Check (if migrated to metadata)
          setIsTOTPEnabled(userData.totp_enabled || false);
        } catch (err) {
          console.error('[Auth] Error fetching user data:', err);
          setUser(firebaseUser as any);
          setIsAuthenticated(true);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsTOTPEnabled(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Separate effect for Realtime subscription to avoid infinite loop with user dependency
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('admin_security')
      .on(
        'broadcast',
        { event: 'force_logout' },
        (payload) => {
          console.log('Received force logout signal:', payload);
          // If payload has targetUserId, check if it matches current user
          // If no targetUserId, it's a global logout
          if (!payload.payload?.targetUserId || payload.payload.targetUserId === user.id) {
            console.log('Force logging out...');
            logout();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Legacy checkTOTPStatus removed as logic is now in onAuthStateChanged

  const login = async (email: string, password: string, totpCode?: string, bypassTOTP: boolean = false): Promise<{ success: boolean; requiresTOTP?: boolean; role?: string; error?: string }> => {
    try {
      // --- Firebase Auth Flow ---
      const { user: firebaseUser } = await signInWithEmailAndPassword(firebaseAuth, email, password);

      if (!firebaseUser) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Fetch role and metadata from Firestore
      const userDoc = await getDoc(doc(db, 'admin_users', firebaseUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const role = userData?.role;
      const totpEnabled = userData?.totp_enabled || false;
      const totpSecret = userData?.totp_secret;

      // Check if 2FA is enabled but no code provided
      if (totpEnabled && totpSecret && !totpCode && !bypassTOTP) {
        // Sign out for now
        await signOut(firebaseAuth);
        return { success: false, requiresTOTP: true, role };
      }

      // 2FA Verification
      if (totpEnabled && totpSecret && totpCode) {
        const ok = await verifyTOTP(totpCode, totpSecret);
        if (!ok) {
          await signOut(firebaseAuth);
          return { success: false, error: 'Invalid 2FA code' };
        }
      }

      // Finalize session
      setUser({
        ...firebaseUser,
        id: firebaseUser.uid,
        user_metadata: { ...userData, role }
      } as any);
      setIsAuthenticated(true);
      setIsTOTPEnabled(totpEnabled);

      // --- Legacy Master Bypass Sync (Supabase) ---
      // We still attempt Supabase sync in background for legacy compatibility
      supabase.auth.signInWithPassword({ email, password }).catch(() => {});

      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Authentication failed' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(firebaseAuth);
      await supabase.auth.signOut().catch(() => {});
      setUser(null);
      setIsAuthenticated(false);
      setIsTOTPEnabled(false);
      
      // Clear local storage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('firebase')) localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const setupTOTP = async (): Promise<{ secret: string; qrCode: string } | { error: string } | null> => {
    try {
      let u = user;
      if (!u) {
        return { error: 'User not authenticated' };
      }

      if (isMasterBypassUser(u)) {
        return { error: 'Cannot setup 2FA for Master Admin' };
      }

      const secret = generateTOTPSecret();
      const otpauth = buildOtpAuthUri(secret, u.email || '');
      const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;

      return { secret, qrCode };
    } catch (error: any) {
      console.error('Error setting up TOTP:', error);
      return { error: error.message || 'Unknown error during TOTP setup' };
    }
  };

  const verifyTOTP = async (token: string, secret: string): Promise<boolean> => {
    try { return authenticator.check(token, secret); } catch { return false; }
  };

  const enableTOTP = async (token: string, secret: string): Promise<boolean> => {
    try {
      if (!user || !authenticator.check(token, secret)) {
        return false;
      }

      // Update user metadata with TOTP settings
      await setDoc(doc(db, 'admin_users', user.uid), {
        totp_enabled: true,
        totp_secret: secret
      }, { merge: true });

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

      // Prevent disabling 2FA for Master Admin
      if (isMasterBypassUser(user)) {
        return false;
      }

      // Remove TOTP settings from user metadata
      await setDoc(doc(db, 'admin_users', user.uid), {
        totp_enabled: false,
        totp_secret: null
      }, { merge: true });

      setIsTOTPEnabled(false);
      return true;
    } catch (error) {
      console.error('Error disabling TOTP:', error);
      return false;
    }
  };

  const updatePassword = async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) return { success: false, error: 'Not authenticated' };
      
      // Prevent password change for Master Admin
      if (isMasterBypassUser(user)) {
        return { success: false, error: 'Cannot change password for Master Admin' };
      }

      // In Firebase, we need to re-authenticate or use a different method if not recently signed in.
      // For now, we'll implement a simple version.
      await (firebaseAuth.currentUser as any)?.updatePassword(password);
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update password' };
    }
  };

  const registerPasskey = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) return { success: false, error: 'Not authenticated' };

      // 1. Get challenge
      const resp = await fetch('/api/passkey-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', userId: user.uid, email: user.email }),
      });

      if (!resp.ok) throw new Error('Failed to get registration challenge');
      const options = await resp.json();

      // 2. Prompt user
      const attResp = await startRegistration(options);

      // 3. Verify
      const verifyResp = await fetch('/api/passkey-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: attResp, userId: user.uid }),
      });

      if (!verifyResp.ok) {
        const err = await verifyResp.json();
        throw new Error(err.error || 'Verification failed');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Passkey registration error:', error);
      return { success: false, error: error.message || 'Failed to register passkey' };
    }
  };

  const loginWithPasskey = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // Set timeout for each fetch to prevent hanging
      const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 10000) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
          const response = await fetch(url, { ...options, signal: controller.signal });
          clearTimeout(timeout);
          return response;
        } catch (error: any) {
          clearTimeout(timeout);
          if (error.name === 'AbortError') {
            throw new Error('Request timeout - please try again');
          }
          throw error;
        }
      };

      // 1. Get challenge (with timeout)
      const challengeResp = await fetchWithTimeout('/api/passkey-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login' }),
      }, 10000); // 10 second timeout

      if (!challengeResp.ok) throw new Error('Failed to get login challenge');
      const options = await challengeResp.json();

      // 2. Prompt user for passkey (this is native and can't timeout)
      const assertion = await startAuthentication(options);

      // 3. Verify with server (with timeout)
      const verifyResp = await fetchWithTimeout('/api/passkey-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: assertion }),
      }, 10000); // 10 second timeout

      if (!verifyResp.ok) {
        const err = await verifyResp.json();
        throw new Error(err.error || 'Login failed');
      }

      const result = await verifyResp.json();
      
      // 4. Set the session using custom token or Firebase sign-in
      if (result.customToken) {
        const { user: fbUser } = await signInWithCustomToken(firebaseAuth, result.customToken);
        if (fbUser) return { success: true };
      }

      throw new Error('No session returned');
    } catch (error: any) {
      console.error('Passkey login error:', error);
      let errorMessage = error.message || 'Failed to login with passkey';
      
      // Provide user-friendly error messages
      if (errorMessage.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check your internet and try again.';
      } else if (errorMessage.includes('AbortError') || errorMessage.includes('cancelled')) {
        errorMessage = 'Authentication cancelled';
      } else if (errorMessage.includes('NotAllowedError')) {
        errorMessage = 'Biometric authentication was cancelled or not allowed';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // Session Tracking
  useEffect(() => {
    if (!user || isMasterBypassUser(user)) return;

    const updateSession = async () => {
      try {
        // Get IP (optional, best effort)
        let ip = null;
        try {
          // Try Cloudflare trace first (very reliable, CORS friendly)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const res = await fetch('https://www.cloudflare.com/cdn-cgi/trace', { 
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (res.ok) {
            const text = await res.text();
            const match = text.match(/ip=(.+)/);
            if (match) ip = match[1].trim();
          }
        } catch (e) {
          // Fallback to ipify if Cloudflare fails
          try {
             const controller = new AbortController();
             const timeoutId = setTimeout(() => controller.abort(), 2000);
             const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
             clearTimeout(timeoutId);
             if (res.ok) {
               const data = await res.json();
               ip = data.ip;
             }
          } catch (e2) { /* ignore */ }
        }

        // Check for existing session record for this user using direct doc read
        // instead of query to avoid list permission issues
        const sessionRef = doc(db, 'admin_sessions', user.id);
        const sessionSnap = await getDoc(sessionRef);
        const existing = sessionSnap.exists();

        const sessionData = {
          user_id: user.id,
          user_agent: navigator.userAgent,
          ip_address: ip,
          last_seen_at: new Date().toISOString(),
          // Diagnostic info for permission debugging
          _diag_role: user.user_metadata?.role || 'unknown',
          _diag_email: user.email
        };

        if (existing) {
          // Wrap in try-catch to handle 400 errors from UUID/TEXT mismatch in Supabase
          try {
            await dualUpdate('admin_sessions', user.id, sessionData);
          } catch (supaErr: any) {
             if (supaErr.message?.includes('400') || supaErr.message?.includes('type')) {
                console.warn('Supabase Session: ID mismatch (likely UUID vs Firebase UID). Fix schema to TEXT.');
             } else {
                throw supaErr;
             }
          }
        } else {
          // Use UID as document ID for session to make getDoc possible
          const docRef = doc(db, 'admin_sessions', user.id);
          await setDoc(docRef, { ...sessionData, id: user.id, _updated_at: new Date().toISOString() }, { merge: true });
          
          // Try Supabase sync in background
          supabase.from('admin_sessions').upsert({ ...sessionData, id: user.id }).then(({ error: supaErr }) => {
            if (supaErr) console.warn('Supabase Background Upsert Failure:', supaErr);
          });
        }
      } catch (e: any) {
        if (e.message?.includes('permission')) {
          console.warn('Session track: Missing permissions for admin_sessions. Diagnostics:', {
            uid: user.id,
            role: user.user_metadata?.role,
            email: user.email
          });
        } else if (e.message?.includes('400')) {
          console.warn('Session track: Supabase request failed with 400. Check table schema (UUID vs TEXT).');
        } else {
          console.error('Session track error', e);
        }
      }
    };

    // Initial update
    updateSession();

    // Heartbeat every minute
    const interval = setInterval(updateSession, 60000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider value={{ 
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
      registerPasskey,
      loginWithPasskey
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};