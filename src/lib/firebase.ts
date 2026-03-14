/**
 * Firebase Client — Browser SDK for Realtime Database, Storage, and Auth
 * Used as secondary/fallback when Supabase is slow or down.
 */
import { initializeApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache, collection, setDoc, doc, getDocs, deleteDoc } from 'firebase/firestore';
import { getDatabase, ref, set, get, child } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyB8MM48e7Rd2v2ywJpq6vKf-ryv4oCxpLI',
  authDomain: 'rico-backend.firebaseapp.com',
  databaseURL: 'https://rico-backend-default-rtdb.firebaseio.com',
  projectId: 'rico-backend',
  storageBucket: 'rico-backend.firebasestorage.app',
  messagingSenderId: '428903413824',
  appId: '1:428903413824:web:f05d8069ba0484487e87a5',
};

const app = initializeApp(FIREBASE_CONFIG);
// Secondary instance for side-load operations (like creating new users without signing out current admin)
const secondaryApp = initializeApp(FIREBASE_CONFIG, 'SecondaryAccountCreator');

// Use memoryLocalCache to avoid "Unexpected state (ID: ca9)" errors in dev environment
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
});
export const firebaseDb = getDatabase(app);
export const firebaseStorage = getStorage(app);
export const firebaseAuth = getAuth(app);
const secondaryAuth = getAuth(secondaryApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/** Sign in with Google — uses redirect flow for cleaner domain visibility and better mobile compatibility */
export async function signInWithGoogle() {
  try {
    // We strictly use redirect now to avoid the untrusted "rico-backend.firebaseapp.com" popup header
    await signInWithRedirect(firebaseAuth, googleProvider);
    return null; // The result will be handled by getRedirectResult on page reload
  } catch (err: any) {
    console.error('[Firebase Auth] Redirect sign-in failed:', err);
    throw err;
  }
}

/** Check if returning from a Google redirect sign-in */
export async function getGoogleRedirectResult() {
  return getRedirectResult(firebaseAuth);
}

/** Direct Auth creation without affecting current session */
export async function createAuthUserDirect(email: string, password: string) {
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await secondaryAuth.signOut();
    return cred.user;
  } catch (err: any) {
    // If it's a network error and we are on local, allow a bypass to return a mock UID
    if (isLocal && (err.code === 'auth/network-request-failed' || err.message?.includes('fetch') || err.message?.includes('network'))) {
      console.warn('[Firebase Auth] Offline mode detected. Using local bypass for user creation.');
      return {
        uid: `offline-mock-${Date.now()}`,
        email: email,
        emailVerified: true,
        displayName: email.split('@')[0],
      } as any;
    }
    throw err;
  }
}

// ═══════════════════════════════════════════════════
// FIRESTORE HELPERS — New Primary Database
// ═══════════════════════════════════════════════════

/** Write a doc to Firestore */
export async function firestoreWrite(colName: string, id: string | number, data: any) {
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  try {
    await setDoc(doc(db, colName, String(id)), {
      ...data,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (err: any) {
    if (isLocal) {
        console.warn(`[Firestore] Local Write Bypass for ${colName}/${id}`);
        return;
    }
    console.error(`[Firestore] Write failed for ${colName}/${id}:`, err);
  }
}

/** Read all docs from a Firestore collection */
export async function firestoreRead(colName: string) {
  try {
    const querySnapshot = await getDocs(collection(db, colName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error(`[Firestore] Read failed for ${colName}:`, err);
    return [];
  }
}

/** Delete a doc from Firestore */
export async function firestoreDelete(colName: string, id: string | number) {
  try {
    await deleteDoc(doc(db, colName, String(id)));
  } catch (err) {
    console.error(`[Firestore] Delete failed for ${colName}/${id}:`, err);
  }
}

/** Write table data to Firebase */
export async function firebaseWrite(table: string, data: any[], idField = 'id') {
  try {
    const tableRef = ref(firebaseDb, `tables/${table}`);
    const payload: Record<string, any> = {};
    data.forEach(row => {
      const key = String(row[idField] ?? Math.random().toString(36).slice(2));
      payload[key] = row;
    });
    await set(tableRef, payload);
  } catch (err) {
    console.warn(`[Firebase] Write failed for ${table}:`, err);
  }
}

/** Write a single row to Firebase */
export async function firebaseWriteRow(table: string, id: string | number, row: any) {
  try {
    const rowRef = ref(firebaseDb, `tables/${table}/${id}`);
    await set(rowRef, row);
  } catch (err) {
    console.warn(`[Firebase] WriteRow failed for ${table}/${id}:`, err);
  }
}

/** Delete a row from Firebase */
export async function firebaseDeleteRow(table: string, id: string | number) {
  try {
    const rowRef = ref(firebaseDb, `tables/${table}/${id}`);
    await set(rowRef, null);
  } catch (err) {
    console.warn(`[Firebase] DeleteRow failed for ${table}/${id}:`, err);
  }
}

/** Read all rows from a Firebase table */
export async function firebaseRead(table: string): Promise<any[]> {
  try {
    const snapshot = await get(child(ref(firebaseDb), `tables/${table}`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Convert object to array
      if (Array.isArray(data)) return data.filter(Boolean);
      return Object.values(data);
    }
    return [];
  } catch (err) {
    console.warn(`[Firebase] Read failed for ${table}:`, err);
    return [];
  }
}

/** Read a single row from Firebase */
export async function firebaseReadOne(table: string, id: string | number): Promise<any | null> {
  try {
    const snapshot = await get(child(ref(firebaseDb), `tables/${table}/${id}`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (err) {
    console.warn(`[Firebase] ReadOne failed for ${table}/${id}:`, err);
    return null;
  }
}

// ═══════════════════════════════════════════════════
// FIREBASE STORAGE — Dual file storage
// ═══════════════════════════════════════════════════

/** Upload a file to Firebase Storage (fire-and-forget mirror) */
export async function firebaseUploadFile(file: File, path: string): Promise<string | null> {
  try {
    const fileRef = storageRef(firebaseStorage, `media/${path}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    console.log(`[Firebase] File mirrored: ${path}`);
    return url;
  } catch (err) {
    console.warn(`[Firebase] File upload failed for ${path}:`, err);
    return null;
  }
}

/** Delete a file from Firebase Storage */
export async function firebaseDeleteFile(path: string): Promise<boolean> {
  try {
    // Dynamically import deleteObject to keep initial bundle size small if possible, or just standard import
    const { deleteObject } = await import('firebase/storage');
    const fileRef = storageRef(firebaseStorage, path); // Use exact path provided
    await deleteObject(fileRef);
    console.log(`[Firebase] File deleted: ${path}`);
    return true;
  } catch (err: any) {
    // Ignore object-not-found errors if we're just trying to ensure it's gone
    if (err.code !== 'storage/object-not-found') {
      console.warn(`[Firebase] File delete failed for ${path}:`, err);
    }
    return false;
  }
}

/** Get a Firebase Storage URL for a file (fallback when primary storage is down) */
export async function firebaseGetFileUrl(path: string): Promise<string | null> {
  try {
    const fileRef = storageRef(firebaseStorage, `media/${path}`);
    return await getDownloadURL(fileRef);
  } catch (err) {
    console.warn(`[Firebase] GetFileUrl failed for ${path}:`, err);
    return null;
  }
}

/** Store a URL mapping in Firebase RTDB (maps original URL -> firebase URL) */
export async function firebaseStoreUrlMapping(originalUrl: string, firebaseUrl: string) {
  try {
    // Use a hash of the original URL as key
    const key = btoa(originalUrl).replace(/[.#$/[\]]/g, '_').slice(0, 100);
    await set(ref(firebaseDb, `url_mappings/${key}`), {
      original: originalUrl,
      firebase: firebaseUrl,
      synced_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[Firebase] URL mapping failed:', err);
  }
}

/** Lookup the Firebase URL for an original storage URL */
export async function firebaseLookupUrl(originalUrl: string): Promise<string | null> {
  try {
    const key = btoa(originalUrl).replace(/[.#$/[\]]/g, '_').slice(0, 100);
    const snapshot = await get(child(ref(firebaseDb), `url_mappings/${key}`));
    if (snapshot.exists()) {
      return snapshot.val().firebase;
    }
    return null;
  } catch (err) {
    return null;
  }
}

// ═══════════════════════════════════════════════════
// FIREBASE AUTH — Dual authentication fallback
// ═══════════════════════════════════════════════════

/** Sign in with Firebase Auth (fallback when Supabase Auth is down) */
export async function signInWithFirebase(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
    console.log('[Firebase Auth] Login successful for', email);
    return { success: true };
  } catch (err: any) {
    // If user doesn't exist in Firebase yet, try creating them
    if (err.code === 'auth/user-not-found') {
      try {
        await createUserWithEmailAndPassword(firebaseAuth, email, password);
        console.log('[Firebase Auth] Created + logged in user:', email);
        return { success: true };
      } catch (createErr: any) {
        console.warn('[Firebase Auth] Create user failed:', createErr.message);
        return { success: false, error: createErr.message };
      }
    } else if (err.code === 'auth/invalid-credential') {
       // This indicates a password mismatch. If a sync just happened, it might be propagation delay
       // or a service account permission issue in the backend.
       console.warn('[Firebase Auth] Invalid credentials for', email);
       return { success: false, error: 'Firebase synchronization pending (Credential Mismatch). Please try again in 30 seconds.' };
    }
    console.warn('[Firebase Auth] Login failed:', err.message);
    return { success: false, error: err.message };
  }
}

/** Ensure a user exists in Firebase Auth (mirror from Supabase) */
export async function ensureFirebaseUser(email: string, password: string): Promise<void> {
  try {
    await createUserWithEmailAndPassword(firebaseAuth, email, password);
    console.log('[Firebase Auth] Mirrored user to Firebase:', email);
  } catch (err: any) {
    // 'auth/email-already-in-use' is fine — user already exists
    if (err.code !== 'auth/email-already-in-use') {
      console.warn('[Firebase Auth] Mirror failed:', err.message);
    }
  }
}

/** Sign out from Firebase */
export async function firebaseSignOut(): Promise<void> {
  try {
    await firebaseAuth.signOut();
  } catch {}
}

/** Dual password reset — Supabase first, Firebase fallback */
export async function dualResetPassword(email: string, supabaseClient: any): Promise<{ success: boolean; source: string; error?: string }> {
  // Try Supabase first
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`
    });
    if (!error) {
      // Also try Firebase reset in background
      sendPasswordResetEmail(firebaseAuth, email).catch(() => {});
      return { success: true, source: 'supabase' };
    }
  } catch {}

  // Fallback to Firebase
  try {
    await sendPasswordResetEmail(firebaseAuth, email);
    return { success: true, source: 'firebase' };
  } catch (err: any) {
    return { success: false, source: 'none', error: err.message };
  }
}

// ═══════════════════════════════════════════════════
// OTP-BASED PASSWORD RESET
// ═══════════════════════════════════════════════════

/** Generate a 6-digit OTP, store in Firebase RTDB with 5-min expiry */
export async function generateOTP(email: string): Promise<{ success: boolean; otp?: string; error?: string }> {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = btoa(email.toLowerCase()).replace(/[.#$/[\]]/g, '_').slice(0, 80);
    await set(ref(firebaseDb, `otp/${key}`), {
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
  try {
    const key = btoa(email.toLowerCase()).replace(/[.#$/[\]]/g, '_').slice(0, 80);
    const snapshot = await get(child(ref(firebaseDb), `otp/${key}`));
    if (!snapshot.exists()) return { valid: false, error: 'No OTP found. Please request a new one.' };

    const data = snapshot.val();
    if (data.used) return { valid: false, error: 'OTP already used. Please request a new one.' };
    if (Date.now() > data.expires_at) return { valid: false, error: 'OTP expired. Please request a new one.' };
    if (data.code !== code) return { valid: false, error: 'Invalid OTP. Please try again.' };

    // Mark as used
    await set(ref(firebaseDb, `otp/${key}/used`), true);
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
    const firebaseUser = firebaseAuth.currentUser;
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
