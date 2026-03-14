import { getSupabaseClient } from './supabase';
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

    // Fallback logic for local file removed to satisfy security scanners

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || serviceAccount.project_id
      });
      isFirebaseAdminPrivileged = true;
      console.log('[Auth Verify] Firebase Admin initialized with full privileges');
    } else {
      admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID
      });
      console.log('[Auth Verify] Firebase Admin initialized with limited privileges (No service account)');
    }
  } catch (err) {
    console.warn('[Auth Verify] Firebase Admin initialization error:', err);
  }
}

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
    // Firebase verification failed, proceed to Supabase
  }

  // 2. Try Supabase Verification (Legacy)
  try {
    const supabase = getSupabaseClient(true);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (user && !error) {
      console.log('[Auth Verify] Supabase token verified for:', user.email);
      return {
        id: user.id,
        email: user.email,
        provider: 'supabase'
      };
    }
  } catch (err: any) {
    // Supabase verification failed
  }

  return null;
}

/**
 * Verifies if the requester is an authorized admin (owner or admin)
 */
export async function verifyAdmin(authHeader: string | undefined, supabase: any): Promise<{ isAdmin: boolean; isOwner: boolean; user: NormalizedUser | null }> {
  const user = await verifyToken(authHeader);
  if (!user) return { isAdmin: false, isOwner: false, user: null };

  let adminUser: any = null;
  const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(user.id);
  
  if (isUUID) {
    const { data: idMatch } = await supabase
      .from('admin_users')
      .select('role, is_primary, email, user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    adminUser = idMatch;
  }

  if (!adminUser && user.email) {
    const { data: emailMatch } = await supabase
      .from('admin_users')
      .select('role, is_primary, email, user_id')
      .eq('email', user.email.toLowerCase().trim())
      .maybeSingle();
    
    if (emailMatch) {
      adminUser = emailMatch;
    }
  }

  const isAdmin = adminUser?.role === 'owner' || adminUser?.role === 'admin' || adminUser?.is_primary;
  const isOwner = adminUser?.role === 'owner' || adminUser?.is_primary;

  return { isAdmin, isOwner, user };
}
