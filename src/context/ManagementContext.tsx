import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { dualInsert, dualUpdate, dualDelete, dualUpsert, dualRead } from '../lib/dualDb';
import { supabase } from '../lib/supabase';
import { 
  Sponsor, SponsorshipPackage, SponsorshipSettings, Registration,
  Audition, Membership, ContactSection
} from '../types/data';
import { useCoreData } from './CoreDataContext';
import { useAuth } from './AuthContext';
import { fetchAllRegistrations, fetchSupabaseBatch } from '../utils/dataUtils';
import { AdminService } from '../lib/adminService';
import { useDomainRealtime } from '../hooks/useDomainRealtime';

interface ManagementContextType {
  sponsors: Sponsor[];
  sponsorshipPackages: SponsorshipPackage[];
  sponsorshipSettings: SponsorshipSettings | null;
  registrations: Registration[];
  auditions: Audition[];
  memberships: Membership[];
  adminUsers: any[];
  loading: boolean;
  isLoaded: boolean;
  
  // Sponsors
  addSponsor: (sponsor: Partial<Sponsor>) => Promise<Sponsor>;
  updateSponsor: (id: number, sponsor: Partial<Sponsor>) => Promise<void>;
  deleteSponsor: (id: number) => Promise<void>;
  toggleSponsorFeatured: (id: number) => Promise<void>;
  
  // Registrations
  addRegistration: (registration: Partial<Registration>) => Promise<void>;
  updateRegistrationStatus: (id: string, status: 'approved' | 'rejected' | 'pending') => Promise<void>;
  deleteRegistration: (id: string) => Promise<void>;

  // Auditions & Memberships
  updateAuditionStatus: (id: string, status: 'pending' | 'reviewed' | 'contacted') => Promise<void>;
  deleteAudition: (id: string) => Promise<void>;
  updateMembershipStatus: (id: string, status: 'pending' | 'reviewed' | 'accepted') => Promise<void>;
  deleteMembership: (id: string) => Promise<void>;

  // Sponsorship Management
  updateSponsorshipSettings: (patch: Partial<SponsorshipSettings>) => Promise<void>;
  addSponsorshipPackage: (pkg: Partial<SponsorshipPackage>) => Promise<void>;
  updateSponsorshipPackage: (id: number, patch: Partial<SponsorshipPackage>) => Promise<void>;
  deleteSponsorshipPackage: (id: number) => Promise<void>;

  // Admin Management
  refreshAdminUsers: () => Promise<void>;
  addAdminUser: (userId: string, email: string, role?: 'owner' | 'admin') => Promise<void>;
  removeAdminUser: (userId: string) => Promise<void>;
  addAdminByEmail: (email: string) => Promise<void>;
  createAdminAccount: (email: string, allowedPages: string[], role?: 'owner' | 'admin', displayName?: string) => Promise<{ success: boolean; invitation: { id: string; email: string }; delivery: string; message: string }>;
  updateAdminEmail: (userId: string, newEmail: string) => Promise<void>;
  listAdminPermissions: () => Promise<any[]>;
  setAdminPermission: (userId: string, flags: any) => Promise<void>;
  updateAdminRole: (userId: string, role: 'owner' | 'admin') => Promise<void>;
  updateAdminPassword: (userId: string, password: string) => Promise<void>;
  resetRegistrationIdSequence: () => Promise<void>;

  // Missing Registration Methods
  bulkApproveRegistrations: (ids: string[]) => Promise<void>;
  bulkRejectRegistrations: (ids: string[]) => Promise<void>;
  bulkDeleteRegistrations: (ids: string[]) => Promise<void>;
  restoreRegistration: (id: string) => Promise<void>;
  permanentDeleteRegistration: (id: string) => Promise<void>;
  bulkRestoreRegistrations: (ids: string[]) => Promise<void>;
  bulkPermanentDeleteRegistrations: (ids: string[]) => Promise<void>;

  // Contact Sections
  addContactSection: (section: Partial<ContactSection>) => Promise<void>;
  updateContactSection: (id: number, section: Partial<ContactSection>) => Promise<void>;
  deleteContactSection: (id: number) => Promise<void>;
}

const ManagementContext = createContext<ManagementContextType | undefined>(undefined);

// [DEDUPE] Use window bridge for singleton Context
const PrimaryManagementContext = ((typeof window !== 'undefined') 
  ? ((window as any).__MANAGEMENT_CONTEXT__ || ((window as any).__MANAGEMENT_CONTEXT__ = ManagementContext))
  : ManagementContext) as React.Context<ManagementContextType | undefined>;

export const useManagementData = () => {
  const context = useContext(PrimaryManagementContext);
  if (context === undefined) {
    throw new Error('useManagementData must be used within a ManagementProvider');
  }
  return context;
};

export function ManagementProvider({ children, enabled = true, includePrivate = true }: { children: ReactNode, enabled?: boolean, includePrivate?: boolean }) {
  const { refreshTrigger } = useCoreData();
  const { user, getValidToken } = useAuth();
  const privateScope = includePrivate ? `${user?.id}:${user?.user_metadata?.role}` : 'public';
  const currentScope = useRef(privateScope);
  currentScope.current = privateScope;
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [sponsorshipPackages, setSponsorshipPackages] = useState<SponsorshipPackage[]>([]);
  const [sponsorshipSettings, setSponsorshipSettings] = useState<SponsorshipSettings | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchManagementData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    console.log('[ManagementContext] fetchManagementData started');
    const start = Date.now();

    try {
      const reads: Promise<unknown>[] = [
        fetchSupabaseBatch<Sponsor>('sponsors').then(r => setSponsors(r.data || [])),
        fetchSupabaseBatch<SponsorshipPackage>('sponsorship_packages', { order: { column: 'order_position', ascending: true } }).then(r => setSponsorshipPackages(r.data || [])),
        dualRead({ table: 'sponsorship_settings', eq: ['id', 1], maybeSingle: true }).then(r => setSponsorshipSettings(r.data)),
      ];
      if (includePrivate) reads.push(
        fetchAllRegistrations().then(r => { if (currentScope.current === privateScope) setRegistrations(r.data || []); }),
        dualRead({ table: 'auditions', order: ['created_at', { ascending: false }] }).then(r => { if (currentScope.current === privateScope) setAuditions(r.data || []); }),
        dualRead({ table: 'memberships', order: ['created_at', { ascending: false }] }).then(r => { if (currentScope.current === privateScope) setMemberships(r.data || []); }),
        AdminService.getAllAdmins().then(data => { if (currentScope.current === privateScope) setAdminUsers(data); }),
      );
      await Promise.allSettled(reads);

      console.log(`[ManagementContext] Data fetched in ${Date.now() - start}ms`);
    } catch (err) {
      console.error('[ManagementContext] Failed to fetch management data:', err);
    } finally {
      setLoading(false);
      setIsLoaded(true);
    }
  }, [enabled, includePrivate, privateScope]);

  useEffect(() => {
    if (enabled) {
      fetchManagementData();
    }
  }, [refreshTrigger, user?.id, fetchManagementData, enabled]);

  useEffect(() => {
    if (!includePrivate) {
      setRegistrations([]); setAuditions([]); setMemberships([]); setAdminUsers([]);
    }
  }, [includePrivate]);
  useDomainRealtime('management-context-realtime', enabled,
    includePrivate ? ['sponsors', 'sponsorship_packages', 'sponsorship_settings', 'registrations', 'auditions', 'memberships', 'admin_users', 'admin_permissions'] : ['sponsors', 'sponsorship_packages', 'sponsorship_settings'],
    fetchManagementData);

  const addSponsor = async (sponsor: Partial<Sponsor>) => {
    const created = await dualInsert('sponsors', sponsor);
    if (!created?.id) throw new Error('Sponsor was not created. Please retry.');
    await fetchManagementData();
    return created as Sponsor;
  };

  const updateSponsor = async (id: number, sponsor: Partial<Sponsor>) => {
    await dualUpdate('sponsors', id, sponsor);
    await fetchManagementData();
  };

  const deleteSponsor = async (id: number) => {
    await dualDelete('sponsors', id);
    await fetchManagementData();
  };

  const toggleSponsorFeatured = async (id: number) => {
    const current = sponsors.find(s => s.id === id);
    if (current) {
      await dualUpdate('sponsors', id, { featured: !current.featured });
      await fetchManagementData();
    }
  };

  const addRegistration = async (registration: Partial<Registration>) => {
    await dualUpsert('registrations', registration);
    await fetchManagementData();
  };

  const updateRegistrationStatus = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    await dualUpdate('registrations', id, { status });
    await fetchManagementData();
  };

  const updateSponsorshipSettings = async (patch: Partial<SponsorshipSettings>) => {
    await dualUpsert('sponsorship_settings', { id: 1, ...patch });
    await fetchManagementData();
  };

  const addSponsorshipPackage = async (pkg: Partial<SponsorshipPackage>) => {
    await dualInsert('sponsorship_packages', pkg);
    await fetchManagementData();
  };

  const updateSponsorshipPackage = async (id: number, patch: Partial<SponsorshipPackage>) => {
    await dualUpdate('sponsorship_packages', id, patch);
    await fetchManagementData();
  };

  const deleteSponsorshipPackage = async (id: number) => {
    await dualDelete('sponsorship_packages', id);
    await fetchManagementData();
  };

  const deleteRegistration = async (id: string) => {
    await dualDelete('registrations', id);
    await fetchManagementData();
  };

  const updateAuditionStatus = async (id: string, status: 'pending' | 'reviewed' | 'contacted') => {
    await dualUpdate('auditions', id, { status });
    await fetchManagementData();
  };

  const deleteAudition = async (id: string) => {
    await dualDelete('auditions', id);
    await fetchManagementData();
  };

  const updateMembershipStatus = async (id: string, status: 'pending' | 'reviewed' | 'accepted') => {
    await dualUpdate('memberships', id, { status });
    await fetchManagementData();
  };

  const deleteMembership = async (id: string) => {
    await dualDelete('memberships', id);
    await fetchManagementData();
  };

  const refreshAdminUsers = useCallback(async () => {
    await fetchManagementData();
  }, [fetchManagementData]);

  const addAdminUser = async (userId: string, email: string, role: 'owner' | 'admin' = 'admin') => {
    await AdminService.authorizeExistingUser(userId, email, role);
    await fetchManagementData();
  };

  const removeAdminUser = async (userId: string) => {
    const token = await getValidToken();
    await AdminService.removeAdmin(userId, token || undefined);
    await fetchManagementData();
  };

  const addAdminByEmail = async (email: string) => {
    // For now, if we don't have a UID, we encourage using createAdminAccount
    // or finding the UID from the portal. Direct email-to-UID mapping is usually server-side.
    // For local dev, we use a placeholder or prompt the user.
    const mockUid = `manual-entry-${Date.now()}`;
    await AdminService.authorizeExistingUser(mockUid, email);
    await fetchManagementData();
  };

  const createAdminAccount = async (email: string, allowedPages: string[], role: 'owner' | 'admin' = 'admin', displayName = '') => {
    const token = await getValidToken();
    if (!token) throw new Error('Sign in as an owner to invite an admin.');
    return AdminService.inviteAdmin(email, displayName, role, allowedPages, token);
  };

  const updateAdminEmail = async (userId: string, newEmail: string) => {
    const token = await getValidToken();
    const res = await fetch('/.netlify/functions/update-admin-email', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 

        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ userId, newEmail })
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to update admin email');
    }
    await fetchManagementData();
  };

  const listAdminPermissions = async () => {
    const { data } = await dualRead({ table: 'admin_permissions' });
    return data || [];
  };

  const setAdminPermission = async (userId: string, flags: any) => {
    await AdminService.updatePermissions(userId, flags);
    await fetchManagementData();
  };

  const updateAdminRole = async (userId: string, role: 'owner' | 'admin') => {
    const token = await getValidToken();
    await AdminService.updateRole(userId, role, token || '');
    await fetchManagementData();
  };

  const updateAdminPassword = async (userId: string, password: string) => {
    const token = await getValidToken();
    const res = await fetch('/.netlify/functions/update-admin-password', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ userId, password })
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to update admin password');
    }
  };

  const resetRegistrationIdSequence = async () => {
    const { error } = await supabase.rpc('reset_registration_id_sequence');
    if (error) {
      console.error('[ManagementContext] Failed to reset sequence:', error);
      throw error;
    }
  };

  const bulkApproveRegistrations = async (ids: string[]) => {
    const { error } = await supabase.from('registrations').update({ status: 'approved' }).in('id', ids);
    if (error) throw error;
    await fetchManagementData();
  };

  const bulkRejectRegistrations = async (ids: string[]) => {
    const { error } = await supabase.from('registrations').update({ status: 'rejected' }).in('id', ids);
    if (error) throw error;
    await fetchManagementData();
  };

  const bulkDeleteRegistrations = async (ids: string[]) => {
    const { error } = await supabase.from('registrations').update({ deleted_at: new Date().toISOString() }).in('id', ids);
    if (error) throw error;
    await fetchManagementData();
  };

  const restoreRegistration = async (id: string) => {
    const { error } = await supabase.from('registrations').update({ deleted_at: null }).eq('id', id);
    if (error) throw error;
    await fetchManagementData();
  };

  const permanentDeleteRegistration = async (id: string) => {
    const { error } = await supabase.from('registrations').delete().eq('id', id);
    if (error) throw error;
    await fetchManagementData();
  };

  const bulkRestoreRegistrations = async (ids: string[]) => {
    const { error } = await supabase.from('registrations').update({ deleted_at: null }).in('id', ids);
    if (error) throw error;
    await fetchManagementData();
  };

  const bulkPermanentDeleteRegistrations = async (ids: string[]) => {
    const { error } = await supabase.from('registrations').delete().in('id', ids);
    if (error) throw error;
    await fetchManagementData();
  };

  const addContactSection = async (section: Partial<ContactSection>) => {
    await dualInsert('contact_sections', section);
    await fetchManagementData();
  };

  const updateContactSection = async (id: number, section: Partial<ContactSection>) => {
    await dualUpdate('contact_sections', id, section);
    await fetchManagementData();
  };

  const deleteContactSection = async (id: number) => {
    await dualDelete('contact_sections', id);
    await fetchManagementData();
  };


  const value: ManagementContextType = {
    sponsors,
    sponsorshipPackages,
    sponsorshipSettings,
    registrations,
    auditions,
    memberships,
    adminUsers,
    loading,
    isLoaded,
    addSponsor,
    updateSponsor,
    deleteSponsor,
    toggleSponsorFeatured,
    addRegistration,
    updateRegistrationStatus,
    deleteRegistration,
    updateAuditionStatus,
    deleteAudition,
    updateMembershipStatus,
    deleteMembership,
    updateSponsorshipSettings,
    addSponsorshipPackage,
    updateSponsorshipPackage,
    deleteSponsorshipPackage,
    refreshAdminUsers,
    addAdminUser,
    removeAdminUser,
    addAdminByEmail,
    createAdminAccount,
    updateAdminEmail,
    listAdminPermissions,
    setAdminPermission,
    updateAdminRole,
    updateAdminPassword,
    resetRegistrationIdSequence,
    bulkApproveRegistrations,
    bulkRejectRegistrations,
    bulkDeleteRegistrations,
    restoreRegistration,
    permanentDeleteRegistration,
    bulkRestoreRegistrations,
    bulkPermanentDeleteRegistrations,
    addContactSection,
    updateContactSection,
    deleteContactSection
  };

  return <ManagementContext.Provider value={value}>{children}</ManagementContext.Provider>;
}
