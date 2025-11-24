import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { authenticator } from 'otplib';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTOTPEnabled, setIsTOTPEnabled] = useState(false);

  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
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
      async (_event, session) => {
        if (session?.user) {
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

    return () => subscription.unsubscribe();
  }, []);

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
    const issuer = 'RICORRENZA 2025';
    return authenticator.keyuri(email || 'admin', issuer, secret);
  };

  const login = async (email: string, password: string, totpCode?: string): Promise<{ success: boolean; requiresTOTP?: boolean; error?: string }> => {
    try {
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

        if (totpEnabled && totpSecret) {
          if (!totpCode) {
            // Do not keep a session alive without 2FA
            try { await supabase.auth.signOut(); } catch {}
            return { success: false, requiresTOTP: true };
          }

          // Verify TOTP code
          const ok = await verifyTOTP(totpCode, totpSecret);
          if (!ok) {
            // For safety, ensure no lingering session if code invalid
            try { await supabase.auth.signOut(); } catch {}
            return { success: false, error: 'Invalid 2FA code' };
          }
        }

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
      isTOTPEnabled
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