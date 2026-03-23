/**
 * Firebase Client — Browser SDK for Realtime Database, Storage, and Auth
 * Used as secondary/fallback when Supabase is slow or down.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getDatabase, ref, set, get, child } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Diagnostic helper
const isPlaceholder = (val: string | undefined) =>
  !val || val.includes('<YOUR') || val.includes('PLACEHOLDER');

// Initialize Firebase safely
let app;
try {
  if (isPlaceholder(firebaseConfig.apiKey)) {
    console.warn('[Firebase] API Key is missing or placeholder. Firebase services will be limited.');
    app = null;
  } else {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    console.log('[Firebase] Initialization SUCCESS');
  }
} catch (error) {
  console.error('[Firebase] Fatal initialization error:', error);
  app = null;
}

// Initialize services with safety guards
export const auth = app ? getAuth(app) : null as any;
export const storage = app ? getStorage(app) : null as any;

export default app;

// Secondary instance for side-load operations (like creating new users without signing out current admin)
// Check if we can initialize a secondary app for admin operations
const isValidDbUrl = !!(

  app && 
  typeof firebaseConfig.databaseURL === 'string' && 
  firebaseConfig.databaseURL.startsWith('https://') &&
  (firebaseConfig.databaseURL.includes('.firebaseio.com') || firebaseConfig.databaseURL.includes('.firebaseapp.com'))
);

console.log('[Firebase] Initialization:', { 
  appInitialized: !!app, 
  authInitialized: !!auth,
  dbUrlValid: isValidDbUrl,
  dbUrlPrefix: firebaseConfig.databaseURL ? firebaseConfig.databaseURL.slice(0, 15) + '...' : 'none'
});

// Firestore is the primary 'db'
export const db = app ? initializeFirestore(app, {
  localCache: memoryLocalCache()
}) : null as any;

// The official Firebase Realtime Database client is particularly touchy about URLs.
// We wrap it in a try-catch to ensure that even if our validation is bypassed, the app doesn't crash.
export const firebaseDb = (() => {
  if (!app || !isValidDbUrl) return null;
  try {
    return getDatabase(app);
  } catch (err) {
    console.warn('[Firebase] Failed to initialize Realtime Database:', err);
    return null;
  }
})();

export const firebaseStorage = storage;
// Auth instances for management
export const firebaseAuth = auth;


// Auth logic removed as part of Supabase migration.
// All authentication flows now use src/context/AuthContext.tsx and src/lib/supabase.ts
// Google Sign-In, Password Login, and Session management are handled by Supabase.


// ═══════════════════════════════════════════════════
// OTP-BASED PASSWORD RESET
// ═══════════════════════════════════════════════════

/** Generate a 6-digit OTP, store in Firebase RTDB with 5-min expiry */
export async function generateOTP(email: string): Promise<{ success: boolean; otp?: string; error?: string }> {
  const dbInstance = firebaseDb;
  if (!dbInstance) return { success: false, error: 'Realtime database is disabled.' };
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = btoa(email.toLowerCase()).replace(/[.#$/[\]]/g, '_').slice(0, 80);
    await set(ref(dbInstance, `otp/${key}`), {
      code: otp,
      email: email.toLowerCase(),
      created_at: Date.now(),
      expires_at: Date.now() + 5 * 60 * 1000, // 5 minutes
      used: false
    });
    console.log(`[OTP] Generated for ${email}: ${otp}`);
    return { success: true, otp };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Verify an OTP code for an email */
export async function verifyOTP(email: string, code: string): Promise<{ valid: boolean; error?: string }> {
  const dbInstance = firebaseDb;
  if (!dbInstance) return { valid: false, error: 'Realtime database is disabled.' };
  try {
    const key = btoa(email.toLowerCase()).replace(/[.#$/[\]]/g, '_').slice(0, 80);
    const snapshot = await get(child(ref(dbInstance), `otp/${key}`));
    if (!snapshot.exists()) return { valid: false, error: 'No OTP found. Please request a new one.' };

    const data = snapshot.val();
    if (data.used) return { valid: false, error: 'OTP already used. Please request a new one.' };
    if (Date.now() > data.expires_at) return { valid: false, error: 'OTP expired. Please request a new one.' };
    if (data.code !== code) return { valid: false, error: 'Invalid OTP. Please try again.' };

    // Mark as used
    await set(ref(dbInstance, `otp/${key}/used`), true);
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

/** Update password in both Supabase and Firebase Auth via secure backend bridge */
export async function updatePasswordDual(
  email: string,
  newPassword: string,
  supabaseClient: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get current auth token (if any)
    const firebaseUser = firebaseAuth?.currentUser;
    let token = firebaseUser ? await firebaseUser.getIdToken() : null;

    if (!token) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        token = session?.access_token || null;
    }

    if (!token) {
        return { success: false, error: 'Authentication required for password update.' };
    }

    // 2. Call backend bridge
    const res = await fetch('/api/admin-security-controls', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        action: 'update_password', 
        targetUserId: email, // Backend handles email resolution
        newPassword 
      })
    });

    if (res.ok) {
      return { success: true };
    } else {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || 'Backend synchronization failed.' };
    }
  } catch (err: any) {
    console.error('[Firebase] updatePasswordDual error:', err);
    return { success: false, error: err.message || 'Secure update failed.' };
  }
}
