import { createAuthUserDirect, db } from './firebase';
import { dualInsert, dualUpdate, dualDelete, dualRead } from './dualDb';
import {
  collection, doc, getDocs, setDoc, deleteDoc,
  query, where
} from 'firebase/firestore';

export interface AdminPermissions {
  can_events?: boolean;
  can_schedule?: boolean;
  can_gallery?: boolean;
  can_sponsors?: boolean;
  can_registrations?: boolean;
  can_registration_photos?: boolean;
  can_faculty?: boolean;
  can_core_team?: boolean;
  can_guest_artists?: boolean;
  can_chief_guests?: boolean;
  can_homebound?: boolean;
  can_sports?: boolean;
  can_security_passes?: boolean;
}

export interface AdminUser {
  user_id: string;
  email: string;
  role: 'owner' | 'admin';
  is_primary?: boolean;
  created_at: string;
  requires_approval?: boolean;
  permissions?: AdminPermissions;
}

/**
 * AdminService
 * High-level orchestration for admin user management.
 * Primarily uses Firebase Auth for identity and Firestore/Supabase for data.
 */
export const AdminService = {
  /**
   * Orchestrates the creation of a new admin account.
   * 1. Creates Auth user in Firebase (using secondary app instance).
   * 2. Initializes admin_users record.
   * 3. Initializes admin_permissions record.
   */
  async createPrimeAdmin(email: string, password: string, role: 'owner' | 'admin' = 'admin', permissions: AdminPermissions = {}): Promise<AdminUser> {
    console.log(`[AdminService] Creating Prime Admin: ${email} with role: ${role}`);
    
    // 1. Create Identity
    const authUser = await createAuthUserDirect(email, password);
    if (!authUser) throw new Error('Failed to create identity in Auth system');

    const userId = authUser.uid;
    const now = new Date().toISOString();

    // 2. Initialize Data Records
    const newAdmin: AdminUser = {
      user_id: userId,
      email: email.trim().toLowerCase(),
      role: role,
      is_primary: role === 'owner',
      created_at: now
    };

    // Use dualInsert to ensure consistency across Firestore/Supabase
    await dualInsert('admin_users', {
      ...newAdmin,
      id: userId // Use UID as doc name
    });

    // 3. Initialize Permissions
    await dualInsert('admin_permissions', {
      id: userId,
      user_id: userId,
      email: email.trim().toLowerCase(),
      ...permissions,
      updated_at: now
    });

    return { ...newAdmin, permissions };
  },

  /**
   * Links an existing Auth user to the admin system.
   */
  async authorizeExistingUser(userId: string, email: string, role: 'owner' | 'admin' = 'admin', permissions: AdminPermissions = {}): Promise<void> {
    const now = new Date().toISOString();
    
    await dualInsert('admin_users', {
      id: userId,
      user_id: userId,
      email: email.trim().toLowerCase(),
      role: role,
      is_primary: role === 'owner',
      created_at: now
    });

    await dualInsert('admin_permissions', {
      id: userId,
      user_id: userId,
      email: email.trim().toLowerCase(),
      ...permissions,
      updated_at: now
    });
  },

  /**
   * Updates admin permissions.
   */
  async updatePermissions(userId: string, permissions: Partial<AdminPermissions>): Promise<void> {
    await dualUpdate('admin_permissions', userId, {
      ...permissions,
      updated_at: new Date().toISOString()
    });
  },

  /**
   * Removes an admin user.
   * Note: This deletes data records. Actual Auth deletion is usually handled via Admin SDK (not browser).
   */
  async removeAdmin(userId: string): Promise<void> {
    await Promise.all([
      dualDelete('admin_users', userId),
      dualDelete('admin_permissions', userId)
    ]);
  },

  /**
   * Fetches all admins with their permissions joined.
   */
  async getAllAdmins(): Promise<AdminUser[]> {
    const [usersRes, permsRes] = await Promise.all([
      dualRead({ table: 'admin_users' }),
      dualRead({ table: 'admin_permissions' })
    ]);

    const users = usersRes.data || [];
    const perms = permsRes.data || [];

    return users.map((u: any) => {
      const userPerms = perms.find((p: any) => p.user_id === u.user_id || p.id === u.user_id);
      return {
        ...u,
        permissions: userPerms || {}
      };
    });
  },

  /**
   * Updates admin profile data.
   */
  async updateProfile(userId: string, patch: Partial<AdminUser>): Promise<void> {
    await dualUpdate('admin_users', userId, patch);
  },

  /**
   * Updates admin role (owner vs admin)
   */
  async updateRole(userId: string, role: 'owner' | 'admin'): Promise<void> {
    console.log(`[AdminService] Promoting ${userId} to ${role}`);
    const isPrimary = role === 'owner';
    await dualUpdate('admin_users', userId, { role, is_primary: isPrimary });
  },

  /**
   * Helper to identify hardcoded system owners
   */
  isHardcodedOwner(email: string): boolean {
    if (!email) return false;
    const lower = email.toLowerCase().trim();
    return lower === 'raja@rico.fun' || lower === 'raaj@rico.fun';
  },

  // ═══════════════════════════════════════════
  // ALLOWED ADMINS WHITELIST (Google Sign-In)
  // Uses Firestore directly — no Supabase table for this
  // ═══════════════════════════════════════════

  /** Add a Gmail to the allowed admins whitelist */
  async addAllowedAdmin(email: string, role: 'owner' | 'admin' = 'admin', displayName?: string): Promise<void> {
    const key = email.toLowerCase().trim().replace(/[.@]/g, '_');
    await setDoc(doc(db, 'allowed_admins', key), {
      id: key,
      email: email.toLowerCase().trim(),
      role,
      display_name: displayName || email.split('@')[0],
      created_at: new Date().toISOString()
    });
  },

  /** Remove a Gmail from the whitelist */
  async removeAllowedAdmin(email: string): Promise<void> {
    const key = email.toLowerCase().trim().replace(/[.@]/g, '_');
    await deleteDoc(doc(db, 'allowed_admins', key));
  },

  /** Get all whitelisted admins */
  async getAllowedAdmins(): Promise<{ email: string; role: string; display_name?: string }[]> {
    const snapshot = await getDocs(collection(db, 'allowed_admins'));
    return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  },

  /** Check if a specific email is whitelisted */
  async isEmailAllowed(email: string): Promise<{ allowed: boolean; role: string; display_name?: string }> {
    // Hardcoded owners always allowed
    if (this.isHardcodedOwner(email)) {
      return { allowed: true, role: 'owner', display_name: 'System Owner' };
    }
    const all = await this.getAllowedAdmins();
    const match = all.find(a => a.email?.toLowerCase().trim() === email.toLowerCase().trim());
    if (match) {
      return { allowed: true, role: match.role || 'admin', display_name: match.display_name };
    }
    return { allowed: false, role: '' };
  }
};
