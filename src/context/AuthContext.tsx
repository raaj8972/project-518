import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string, totpCode?: string) => Promise<{ success: boolean; requiresTOTP?: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  setupTOTP: () => Promise<{ secret: string; qrCode: string } | null>;
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
      async (event, session) => {
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

  const generateTOTPSecret = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  const generateQRCode = (secret: string, email: string): string => {
    const issuer = 'RICORRENZA 2025';
    const label = `${issuer}:${email}`;
    const otpauth = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;
  };

  const verifyTOTPToken = (token: string, secret: string): boolean => {
    // Simple TOTP verification (in production, use a proper TOTP library)
    // This is a simplified implementation for demonstration
    const window = Math.floor(Date.now() / 30000);
    const validTokens = [window - 1, window, window + 1].map(time => {
      // Simplified HMAC-SHA1 based TOTP generation
      const hmac = time.toString() + secret;
      let hash = 0;
      for (let i = 0; i < hmac.length; i++) {
        hash = ((hash << 5) - hash + hmac.charCodeAt(i)) & 0xffffffff;
      }
      return Math.abs(hash % 1000000).toString().padStart(6, '0');
    });
    
    return validTokens.includes(token);
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
        return { success: false, error: 'Invalid credentials' };
      }

      if (data.user) {
        // Check if TOTP is enabled
        const totpEnabled = data.user.user_metadata?.totp_enabled || false;
        const totpSecret = data.user.user_metadata?.totp_secret;

        if (totpEnabled && totpSecret) {
          if (!totpCode) {
            return { success: false, requiresTOTP: true };
          }

          // Verify TOTP code
          if (!verifyTOTPToken(totpCode, totpSecret)) {
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

  const setupTOTP = async (): Promise<{ secret: string; qrCode: string } | null> => {
    try {
      if (!user) return null;

      const secret = generateTOTPSecret();
      const qrCode = generateQRCode(secret, user.email || '');

      return { secret, qrCode };
    } catch (error) {
      console.error('Error setting up TOTP:', error);
      return null;
    }
  };

  const verifyTOTP = async (token: string, secret: string): Promise<boolean> => {
    return verifyTOTPToken(token, secret);
  };

  const enableTOTP = async (token: string, secret: string): Promise<boolean> => {
    try {
      if (!user || !verifyTOTPToken(token, secret)) {
        return false;
      }

      // Update user metadata with TOTP settings
      const { error } = await supabase.auth.updateUser({
        data: {
          totp_enabled: true,
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