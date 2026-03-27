// Firebase imports removed for Supabase Auth migration

import { dualInsert, dualUpdate, dualDelete, dualRead, dualUpsert } from './dualDb';
import { isMasterOwner } from '../constants/owners';


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
  display_name?: string;
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
   */
  async createPrimeAdmin(email: string, password: string, role: 'owner' | 'admin' = 'admin', permissions: AdminPermissions = {}, token: string, displayName?: string): Promise<AdminUser> {
    console.log(`[AdminService] Creating Prime Admin: ${email} with role: ${role} and name: ${displayName}`);
    
    // 1. Create Identity via Backend Service (Supabase Auth)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased to 60s

    try {
      const res = await fetch('/.netlify/functions/create-admin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Master-Key': import.meta.env.VITE_MASTER_BYPASS_KEY || ''
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          password,
          role,
          displayName,
          permissions
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Identity Service Error: ${errorText || 'Unknown failure'}`);
      }

      const responseData = await res.json();
      if (!responseData.success || !responseData.user) throw new Error('Failed to create identity correctly.');

      const userId = responseData.user.user_id;
      const now = new Date().toISOString();

      // Return synthetic AdminUser object for UI update
      return { 
        user_id: userId,
        email: email.trim().toLowerCase(),
        display_name: displayName,
        role: role,
        is_primary: role === 'owner',
        created_at: now,
        permissions 
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
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
    }, 'user_id');
  },

  /**
   * Removes an admin user.
   * Note: This deletes data records. Actual Auth deletion is usually handled via Admin SDK (not browser).
   */
  async removeAdmin(userId: string, token?: string): Promise<void> {
    const { data: user } = await dualRead({ table: 'admin_users', eq: ['user_id', userId], maybeSingle: true });
    if (user?.email && isMasterOwner(user.email)) {
      throw new Error('SYSTEM CRITICAL: Master Owner cannot be terminated from the core node.');
    }

    // 1. Revoke UI/DB permissions immediately
    await Promise.all([
      dualDelete('admin_users', userId, 'user_id'),
      dualDelete('admin_permissions', userId, 'user_id')
    ]);

    // 2. Purge from Backend Identity (Supabase Auth + Firebase Auth)
    if (token) {
      console.log(`[AdminService] Requesting backend identity purge for: ${userId}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s
      try {
        const res = await fetch('/.netlify/functions/delete-admin-user', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Master-Key': import.meta.env.VITE_MASTER_BYPASS_KEY || ''
          },
          body: JSON.stringify({ user_id: userId }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const text = await res.text();
          console.warn('[AdminService] Backend identity purge returned error:', text);
          throw new Error(text || 'Deactivation failed');
        }
      } catch (e: any) {
        clearTimeout(timeoutId);
        console.error('[AdminService] Backend identity purge failed:', e);
        throw e;
      }
    }
  },

  /**
   * Fetches all admins with their permissions joined.
   */
  async getAllAdmins(): Promise<AdminUser[]> {
    let users: any[] = [];
    let perms: any[] = [];

    try {
      const [usersRes, permsRes] = await Promise.all([
        dualRead({ table: 'admin_users' }),
        dualRead({ table: 'admin_permissions' })
      ]);
      users = usersRes.data || [];
      perms = permsRes.data || [];
    } catch (err) {
      console.warn('[AdminService] Fetch failed, falling back to synthesis:', err);
    }

    const mapped = (users || []).map((u: any) => {
      if (!u) return null;
      const uid = u.user_id || u.id;
      if (!uid) return null;
      const userPerms = (perms || []).find((p: any) => p && (p.user_id === uid || p.id === uid));
      return {
        ...u,
        user_id: uid,
        permissions: userPerms || {}
      };
    }).filter(Boolean) as AdminUser[];

    // Synthesize hardcoded primary owner if missing
    const MASTER_EMAILS = ['ricorrenza.theiqcityfestival@gmail.com'];
    MASTER_EMAILS.forEach(email => {
      if (!mapped.some((u: any) => u && u.email?.toLowerCase() === email)) {
        console.log(`[AdminService] Synthesizing system owner for: ${email}`);
        mapped.push({
          user_id: 'hardcoded-owner-raaj',
          email: email,
          display_name: 'Raaj',
          role: 'owner',
          is_primary: true,
          created_at: new Date(2026, 2, 6).toISOString(),
          permissions: {
            can_events: true,
            can_schedule: true,
            can_gallery: true,
            can_sponsors: true,
            can_registrations: true,
            can_registration_photos: true,
            can_faculty: true,
            can_core_team: true,
            can_sports: true,
            can_guest_artists: true,
            can_chief_guests: true,
            can_homebound: true,
            can_security_passes: true
          }
        } as any);
      }
    });

    return mapped;
  },

  /**
   * Updates admin profile data.
   */
  async updateProfile(userId: string, patch: Partial<AdminUser>): Promise<void> {
    await dualUpdate('admin_users', userId, patch, 'user_id');
  },

  /**
   * Updates admin role (owner vs admin)
   */
  async updateRole(userId: string, role: 'owner' | 'admin', token: string): Promise<void> {
    console.log(`[AdminService] Promoting ${userId} to ${role}`);
    const isPrimary = role === 'owner';
    
    // 1. Update DB
    await dualUpdate('admin_users', userId, { role, is_primary: isPrimary }, 'user_id');

    // 2. Sync to Auth Metadata (Best practice for RLS + Identity consistency)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s
    try {
      const res = await fetch('/.netlify/functions/grant-permissions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}`,
          'X-Master-Key': import.meta.env.VITE_MASTER_BYPASS_KEY || ''
        },
        body: JSON.stringify({ userId, role }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const text = await res.text();
        console.warn('[AdminService] Role metadata sync failed:', text);
      }
    } catch (e) {
      clearTimeout(timeoutId);
      console.warn('[AdminService] Role metadata sync failed (non-critical):', e);
    }
  },

  /**
   * Updates admin password across all identity providers.
   * Requires a valid JWT for authorization (Owner for any user, Admin for self).
   */
  async updatePassword(userId: string, password: string, token: string): Promise<void> {
    console.log(`[AdminService] Requesting password update for: ${userId}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased to 60s
    
    try {
      const res = await fetch('/.netlify/functions/update-admin-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Master-Key': import.meta.env.VITE_MASTER_BYPASS_KEY || ''
        },
        body: JSON.stringify({ userId, password }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Identity update failed. This may happen if your session expired or if you lack sufficient privileges.');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Update timed out. The operation may still be processing on the server, please refresh in 30 seconds.');
      }
      throw err;
    }
  },

  /**
   * Helper to identify hardcoded system owners
   */
  isHardcodedOwner(email: string): boolean {
    if (!email) return false;
    if (isMasterOwner(email)) return true;
    const lower = email.toLowerCase().trim();
    const ownerEmails = (import.meta.env.VITE_OWNER_EMAILS || '').toLowerCase().split(',').map((e: string) => e.trim());
    return ownerEmails.includes(lower);
  },

  // ═══════════════════════════════════════════
  // ALLOWED ADMINS WHITELIST (Google Sign-In)
  // Uses Firestore directly — no Supabase table for this
  // ═══════════════════════════════════════════

  /** Add a Gmail to the allowed admins whitelist */
  async addAllowedAdmin(email: string, role: 'owner' | 'admin' = 'admin', displayName?: string, permissions: AdminPermissions = {}): Promise<void> {
    const key = email.toLowerCase().trim().replace(/[.@]/g, '_');
    const { supabase } = await import('./supabase');
    const { error } = await supabase
      .from('allowed_admins')
      .upsert({
        id: key,
        email: email.toLowerCase().trim(),
        role,
        display_name: displayName || email.split('@')[0],
        permissions,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select();
    if (error) throw new Error(error.message);
  },

  /** Update permissions of a whitelisted Gmail */
  async updateAllowedAdminPermissions(email: string, permissions: Partial<AdminPermissions>): Promise<void> {
    const key = email.toLowerCase().trim().replace(/[.@]/g, '_');
    const { supabase } = await import('./supabase');

    // Read current record (maybeSingle returns object, not array)
    const { data } = await supabase
      .from('allowed_admins')
      .select('permissions')
      .eq('id', key)
      .maybeSingle();
    const currentPerms = (data as any)?.permissions || {};

    // Update merged permissions
    const { error } = await supabase
      .from('allowed_admins')
      .update({
        permissions: { ...currentPerms, ...permissions },
        updated_at: new Date().toISOString()
      })
      .eq('id', key);
    if (error) throw new Error(error.message);
  },

  /** Remove a Gmail from the whitelist */
  async removeAllowedAdmin(email: string): Promise<void> {
    const key = email.toLowerCase().trim().replace(/[.@]/g, '_');
    const { supabase } = await import('./supabase');
    const { error } = await supabase.from('allowed_admins').delete().eq('id', key);
    if (error) throw new Error(error.message);
  },

  /** Get all whitelisted admins */
  async getAllowedAdmins(): Promise<{ email: string; role: string; display_name?: string; permissions?: AdminPermissions }[]> {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase
      .from('allowed_admins')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  },

  /** Check if a specific email is whitelisted */
  async isEmailAllowed(email: string): Promise<{ allowed: boolean; role: string; display_name?: string; permissions?: AdminPermissions }> {
    // Hardcoded owners always allowed
    if (this.isHardcodedOwner(email)) {
      return { allowed: true, role: 'owner', display_name: 'System Owner', permissions: {
        can_events: true, can_schedule: true, can_gallery: true, can_sponsors: true, 
        can_registrations: true, can_faculty: true, can_chief_guests: true, can_security_passes: true
      } };
    }
    
    // Direct lookup by ID is O(1) and fetches only 1 record
    const key = email.toLowerCase().trim().replace(/[.@]/g, '_');
    const { data } = await dualRead({ 
      table: 'allowed_admins', 
      eq: ['id', key],
      maybeSingle: true 
    });

    console.log(`[AdminService] isEmailAllowed check for ${email}:`, { key, foundInWhitelist: !!data, role: data?.role });

    if (data) {
      return { allowed: true, role: data.role || 'admin', display_name: data.display_name, permissions: data.permissions || {} };
    }
    
    // Safety Fallback: If user already exists in the admin_users table, they are clearly allowed
    const searchEmail = email.toLowerCase().trim();
    const { data: existingUser } = await dualRead({ 
      table: 'admin_users', 
      eq: ['email', searchEmail],
      maybeSingle: true 
    });

    if (existingUser) {
      console.log(`[AdminService] isEmailAllowed - Found user in admin_users fallback:`, { email, role: existingUser.role });
      return { allowed: true, role: existingUser.role || 'admin', display_name: existingUser.display_name };
    }
    
    console.warn(`[AdminService] isEmailAllowed - NO MATCH found for ${email} in any table.`);
    
    // Fallback: also try to query by exact email string just in case the ID format got messed up
    const { data: fallbackData } = await dualRead({ 
      table: 'allowed_admins', 
      eq: ['email', email.toLowerCase().trim()],
      maybeSingle: true 
    });

    if (fallbackData) {
       return { allowed: true, role: fallbackData.role || 'admin', display_name: fallbackData.display_name };
    }

    return { allowed: false, role: '' };
  }
};
