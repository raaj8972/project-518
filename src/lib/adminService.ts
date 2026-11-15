// Firebase imports removed for Supabase Auth migration

import { dualInsert, dualUpdate, dualRead } from './dualDb';
import { isMasterOwner } from '../constants/owners';


export interface AdminPermissions {
  allowed_pages?: string[];
  page_access_configured?: boolean;
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
  async inviteAdmin(email: string, displayName: string, role: 'owner' | 'admin', allowedPages: string[], token: string) {
    const response = await fetch('/api/create-admin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ email: email.trim().toLowerCase(), displayName, role, allowedPages }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not send admin invitation');
    return result as { success: boolean; invitation: { id: string; email: string }; delivery: string; message: string };
  },
  async manageInvitations(action: string, payload: Record<string, unknown>, token: string) {
    const response = await fetch('/api/admin-invitations', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, ...payload }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not update admin access');
    return result;
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
    if (!token) throw new Error('Sign in as an owner to remove admin accounts.');
    const response = await fetch('/api/delete-admin-user', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ user_id: userId }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not revoke admin access');
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
    
    // Access checks always hit the authoritative tables; cached rows must not restore a deleted account.
    const { supabase } = await import('./supabase');
    const normalized = email.trim().toLowerCase();
    const {data: member,error: memberError} = await supabase.from('admin_users').select('user_id,role,display_name').eq('email',normalized).maybeSingle();
    if(memberError) throw memberError;
    if(member) return {allowed:true,role:member.role || 'admin',display_name:member.display_name || undefined};
    const {data: permitted,error: permitError} = await supabase.from('allowed_admins').select('role,display_name,permissions').eq('email',normalized).maybeSingle();
    if(permitError) throw permitError;
    if(permitted) return {allowed:true,role:permitted.role || 'admin',display_name:permitted.display_name || undefined,permissions:permitted.permissions as AdminPermissions || {}};
    return { allowed: false, role: '' };
  }
};
