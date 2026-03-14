import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

export const firebaseAdmin = admin;
export let isFirebaseAdminPrivileged = false;

// Initialize Firebase Admin (Singleton-ish)
if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    let serviceAccount: any = null;

    if (serviceAccountVar) {
      try {
        serviceAccount = JSON.parse(serviceAccountVar);
        console.log('[Auth Verify] Loaded service account from environment variable');
      } catch (e) {
        console.warn('[Auth Verify] Failed to parse FIREBASE_SERVICE_ACCOUNT env var');
      }
    }

    // Fallback: Check for local file if env var is missing or invalid
    if (!serviceAccount) {
      try {
        const localFilePath = path.join(process.cwd(), 'firebase-service-account.json');
        if (fs.existsSync(localFilePath)) {
          serviceAccount = JSON.parse(fs.readFileSync(localFilePath, 'utf8'));
          console.log('[Auth Verify] Loaded service account from local file');
        }
      } catch (e) {
        // Silent fail for file fallback
      }
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || serviceAccount.project_id || 'rico-backend'
      });
      isFirebaseAdminPrivileged = true;
      console.log('[Auth Verify] Firebase Admin initialized with full privileges');
    } else {
      admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'rico-backend'
      });
      console.log('[Auth Verify] Firebase Admin initialized with limited privileges (No service account)');
    }
  } catch (err) {
    console.warn('[Auth Verify] Firebase Admin initialization error:', err);
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://isfqhascrdzaoebhuohs.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Normalized User object across providers
 */
export interface NormalizedUser {
  id: string;
  email?: string;
  role?: string;
  provider: 'supabase' | 'firebase';
}

/**
 * Verifies the authorization header against Supabase and Firebase
 */
export async function verifyToken(authHeader: string | undefined): Promise<NormalizedUser | null> {
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  if (!token || token === 'undefined' || token === 'null') return null;

  // 1. Try Firebase Verification (Primary)
  try {
    // Firebase ID tokens are usually much longer and have a specific JWT structure
    // We check if it looks like a Firebase token or just try it
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (decodedToken) {
      console.log('[Auth Verify] Firebase token verified for:', decodedToken.email);
      return {
        id: decodedToken.uid,
        email: decodedToken.email,
        provider: 'firebase'
      };
    }
  } catch (err: any) {
    // If it's not a Firebase token, the error will be caught here
    // console.log('[Auth Verify] Firebase verification skipped/failed:', err.message);
  }

  // 2. Try Supabase Verification (Legacy)
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.warn('[Auth Verify] Supabase credentials missing, skipping Supabase verification');
    } else {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (user && !error) {
          console.log('[Auth Verify] Supabase token verified for:', user.email);
          return {
            id: user.id,
            email: user.email,
            provider: 'supabase'
          };
        }
    }
  } catch (err: any) {
    // console.log('[Auth Verify] Supabase verification failed:', err.message);
  }

  return null;
}

/**
 * Verifies if the requester is an authorized admin (owner or admin)
 */
export async function verifyAdmin(authHeader: string | undefined, supabase: any): Promise<{ isAdmin: boolean; isOwner: boolean; user: NormalizedUser | null }> {
  const user = await verifyToken(authHeader);
  if (!user) return { isAdmin: false, isOwner: false, user: null };

  // Check if user is an admin (owner or admin) in admin_users
  // We check by both user_id (Supabase primary) and email (Firebase fallback)
  let adminUser: any = null;
  
  // Only query by user_id if it's a valid UUID to avoid Postgres syntax errors
  const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(user.id);
  
  if (isUUID) {
    const { data: idMatch } = await supabase
      .from('admin_users')
      .select('role, is_primary, email, user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    adminUser = idMatch;
  }

  // Fallback to email check if no ID match (crucial for Firebase users)
  if (!adminUser && user.email) {
    const { data: emailMatch } = await supabase
      .from('admin_users')
      .select('role, is_primary, email, user_id')
      .eq('email', user.email.toLowerCase().trim())
      .maybeSingle();
    
    if (emailMatch) {
      adminUser = emailMatch;
      // If we found a match by email, we should normalize the ID if possible
      // but for now we just trust the admin record we found
    }
  }

  // Double check hardcoded owners
  const isHardcoded = user.email?.toLowerCase() === 'raja@rico.fun' || user.email?.toLowerCase() === 'raaj@rico.fun';
  
  const isAdmin = isHardcoded || adminUser?.role === 'owner' || adminUser?.role === 'admin' || adminUser?.is_primary;
  const isOwner = isHardcoded || adminUser?.role === 'owner' || adminUser?.is_primary;

  return { isAdmin, isOwner, user };
}
