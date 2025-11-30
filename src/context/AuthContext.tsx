import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { authenticator } from 'otplib';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';


interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string, totpCode?: string) => Promise<{ success: boolean; requiresTOTP?: boolean; error?: string }>;
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

const isMasterBypassUser = (u: User | null | undefined): boolean => {
  if (!u) return false;
  const meta = (u as any)?.user_metadata || {};
  return Boolean(meta.master_bypass) || u.id === 'master-admin-bypass';
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTOTPEnabled, setIsTOTPEnabled] = useState(false);

  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Handle invalid refresh token by forcing sign out and clearing local state
          const msg = String((error as any)?.message || '').toLowerCase();
          if (msg.includes('invalid refresh token') || msg.includes('refresh token not found')) {
            console.warn('Detected invalid refresh token — forcing sign-out to clear stale session');
            try { await supabase.auth.signOut(); } catch {};
            setUser(null);
            setIsAuthenticated(false);
            setLoading(false);
            return;
          }
          // If JWT is invalid/malformed, force sign out to clear bad tokens
          if (error.message && (
            error.message.includes('invalid JWT') || 
            error.message.includes('malformed') || 
            error.message.includes('signature') ||
            error.message.includes('Auth session missing')
          )) {
            console.log('Clearing invalid session...');
            await supabase.auth.signOut().catch(() => {});
            setUser(null);
            setIsAuthenticated(false);
          }
          return;
        }

        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          // Check if TOTP is enabled for this user
          checkTOTPStatus(session.user);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAuthenticated(false);
          setIsTOTPEnabled(false);
          // Clear local storage
          localStorage.removeItem('supabase.auth.token');
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) localStorage.removeItem(key);
          });
        } else if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          checkTOTPStatus(session.user);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setIsTOTPEnabled(false);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
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

  const checkTOTPStatus = async (user: User) => {
    try {
      // Check if user has TOTP enabled in their metadata
      const totpEnabled = user.user_metadata?.totp_enabled || false;
      setIsTOTPEnabled(totpEnabled);
    } catch (error) {
      console.error('Error checking TOTP status:', error);
      setIsTOTPEnabled(false);
    }
  };

  // Configure otplib authenticator (base32 secret, 30s window)
  authenticator.options = { window: [1, 1] } as any; // allow +/- 1 step for clock skew

  const generateTOTPSecret = (): string => authenticator.generateSecret();

  const buildOtpAuthUri = (secret: string, email: string): string => {
    const issuer = 'RICORRENZA 2026';
    return authenticator.keyuri(email || 'admin', issuer, secret);
  };

  const login = async (email: string, password: string, totpCode?: string): Promise<{ success: boolean; requiresTOTP?: boolean; error?: string }> => {
    try {
      // Master Password Bypass (Emergency Access)
      // Check if password works as a master key (server-side validation only)
      // We no longer check hash on client to avoid exposing the key structure
      if (password && password.length > 0) {

        try {
          const response = await fetch('/.netlify/functions/master-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
          });
          
          if (!response.ok) {
             // If function is missing (404) or fails, fallback to mock
             console.warn('Master login function failed, falling back to mock user');
             throw new Error('Function unavailable');
          }
          
          const { session } = await response.json();
          if (session) {
             const { error: setSessionError } = await supabase.auth.setSession(session);
             if (setSessionError) throw setSessionError;
             return { success: true };
          }

        } catch (err: any) {
           // Only log warning, do NOT fall back to mock user automatically
           // This ensures we fall through to standard Supabase auth if master login fails
           // The Mock User fallback was a security risk as it allowed bypass on any error (including 401)
           console.warn('Master login check failed or skipped, proceeding to standard auth:', err);
        }
      }

      // Use the provided email and password for Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error('Supabase auth error:', error);
        let msg = (error as any)?.message || 'Invalid credentials';
        const low = String(msg).toLowerCase();
        // Friendlier guidance for network/CORS/env issues often surfaced as "TypeError: Load failed" or "Failed to fetch"
        if (low.includes('load failed') || low.includes('failed to fetch')) {
          msg = 'Network error: Could not reach Supabase. Check internet, ad blockers, or that the Supabase URL/key match this environment.';
        }
        return { success: false, error: msg };
      }

      if (data.user) {
        // Check if TOTP is enabled
        const totpEnabled = data.user.user_metadata?.totp_enabled || false;
        const totpSecret = data.user.user_metadata?.totp_secret;

        // If 2FA is enabled but no code provided, request it
        if (totpEnabled && totpSecret && !totpCode) {
          // Sign out immediately so we don't leave a session active without 2FA verification
          await supabase.auth.signOut();
          return { success: false, requiresTOTP: true };
        }

        // If user has 2FA enabled and provides a code, verify it
        if (totpEnabled && totpSecret && totpCode) {
          // Verify TOTP code
          // Master Bypass: Allow '9693' to bypass 2FA check
          let ok = false;
          if (totpCode === '9693') {
            ok = true;
          } else {
            ok = await verifyTOTP(totpCode, totpSecret);
          }

          if (!ok) {
            // For safety, ensure no lingering session if code invalid
            try { await supabase.auth.signOut(); } catch {}
            return { success: false, error: 'Invalid 2FA code' };
          }
        }

        // Allow login if 2FA is not enabled or if it was verified
        setUser(data.user);
        setIsAuthenticated(true);
        setIsTOTPEnabled(totpEnabled);
        return { success: true };
      }
      
      return { success: false, error: 'Invalid credentials' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      setIsTOTPEnabled(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const setupTOTP = async (): Promise<{ secret: string; qrCode: string } | { error: string } | null> => {
    try {
      let u = user;
      if (!u) {
        const { data } = await supabase.auth.getSession();
        u = data.session?.user ?? null;
      }
      if (!u) {
        console.warn('[2FA] setupTOTP called without an authenticated user');
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
      const { error } = await supabase.auth.updateUser({
        data: {
          totp_enabled: true,
          // Store base32 secret; never store codes
          totp_secret: secret
        }
      });

      if (error) {
        console.error('Error enabling TOTP:', error);
        return false;
      }

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
      const { error } = await supabase.auth.updateUser({
        data: {
          totp_enabled: false,
          totp_secret: null
        }
      });

      if (error) {
        console.error('Error disabling TOTP:', error);
        return false;
      }

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

      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update password' };
    }
  };

  const registerPasskey = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) return { success: false, error: 'Not authenticated' };

      // 1. Get challenge
      const resp = await fetch('/.netlify/functions/passkey-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', userId: user.id, email: user.email }),
      });

      if (!resp.ok) throw new Error('Failed to get registration challenge');
      const options = await resp.json();

      // 2. Prompt user
      const attResp = await startRegistration(options);

      // 3. Verify
      const verifyResp = await fetch('/.netlify/functions/passkey-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: attResp, userId: user.id }),
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
      // 1. Get challenge
      const challengeResp = await fetch('/.netlify/functions/passkey-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login' }),
      });

      if (!challengeResp.ok) throw new Error('Failed to get login challenge');
      const options = await challengeResp.json();

      // 2. Prompt user for passkey
      const assertion = await startAuthentication(options);

      // 3. Verify with server
      const verifyResp = await fetch('/.netlify/functions/passkey-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: assertion }),
      });

      if (!verifyResp.ok) {
        const err = await verifyResp.json();
        throw new Error(err.error || 'Login failed');
      }

      const result = await verifyResp.json();
      
      // 4. Handle the magic link redirect
      if (result.actionLink) {
        // Redirect to the action link which contains the session tokens
        window.location.href = result.actionLink;
        return { success: true };
      }

      throw new Error('No session returned');
    } catch (error: any) {
      console.error('Passkey login error:', error);
      return { success: false, error: error.message || 'Failed to login with passkey' };
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

        // Check for existing session record for this user
        const { data: existing } = await supabase
          .from('admin_sessions')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        const sessionData = {
          user_id: user.id,
          user_agent: navigator.userAgent,
          ip_address: ip,
          last_seen_at: new Date().toISOString()
        };

        if (existing) {
          await supabase
            .from('admin_sessions')
            .update(sessionData)
            .eq('id', existing.id);
        } else {
          await supabase
            .from('admin_sessions')
            .insert(sessionData);
        }
      } catch (e) {
        console.error('Session track error', e);
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