import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Sponsor, SponsorshipPackage, SponsorshipSettings, Registration,
  Audition, Membership
} from '../types/data';
import { useCoreData } from './CoreDataContext';
import { useAuth } from './AuthContext';
import { fetchAllRegistrations, fetchSupabaseBatch } from '../utils/dataUtils';

interface ManagementContextType {
  sponsors: Sponsor[];
  sponsorshipPackages: SponsorshipPackage[];
  sponsorshipSettings: SponsorshipSettings | null;
  registrations: Registration[];
  auditions: Audition[];
  memberships: Membership[];
  adminUsers: any[];
  
  // Sponsors
  addSponsor: (sponsor: Partial<Sponsor>) => Promise<void>;
  updateSponsor: (id: number, sponsor: Partial<Sponsor>) => Promise<void>;
  deleteSponsor: (id: number) => Promise<void>;
  
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
}

const ManagementContext = createContext<ManagementContextType | undefined>(undefined);

export const useManagementData = () => {
  const context = useContext(ManagementContext);
  if (context === undefined) {
    throw new Error('useManagementData must be used within a ManagementProvider');
  }
  return context;
};

export const ManagementProvider = ({ children }: { children: ReactNode }) => {
  const { refreshTrigger } = useCoreData();
  const { user } = useAuth();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [sponsorshipPackages, setSponsorshipPackages] = useState<SponsorshipPackage[]>([]);
  const [sponsorshipSettings, setSponsorshipSettings] = useState<SponsorshipSettings | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);

  const fetchManagementData = useCallback(async () => {
    try {
      const [sponsorsRes, packagesRes, settingsRes, registrationsRes, auditionsRes, membershipsRes, adminRes] = await Promise.all([
        fetchSupabaseBatch<Sponsor>('sponsors'),
        fetchSupabaseBatch<SponsorshipPackage>('sponsorship_packages', { order: { column: 'order_position', ascending: true } }),
        supabase.from('sponsorship_settings').select('*, contact_sections (*)').eq('id', 1).maybeSingle(),
        fetchAllRegistrations(),
        supabase.from('auditions').select('*').order('created_at', { ascending: false }),
        supabase.from('memberships').select('*').order('created_at', { ascending: false }),
        supabase.from('admin_users').select('*, admin_permissions(*)') 
      ]);

      if (!sponsorsRes.error) setSponsors(sponsorsRes.data || []);
      if (!packagesRes.error) setSponsorshipPackages(packagesRes.data || []);
      if (!settingsRes.error) setSponsorshipSettings(settingsRes.data || null);
      if (!registrationsRes.error) setRegistrations(registrationsRes.data || []);
      if (!auditionsRes.error) setAuditions(auditionsRes.data || []);
      if (!membershipsRes.error) setMemberships(membershipsRes.data || []);
      if (!adminRes.error) {
        // Flatten permissions for easier consumption
        const flattenedAdmins = (adminRes.data || []).map((u: any) => ({
          ...u,
          ...(u.admin_permissions?.[0] || u.admin_permissions || {})
        }));
        console.log('[ManagementContext] Fetched admin users:', flattenedAdmins);
        setAdminUsers(flattenedAdmins);
      } else {
        console.error('[ManagementContext] Error fetching admin_users:', adminRes.error);
      }

    } catch (err) {
      console.error('[ManagementContext] Failed to fetch management data:', err);
    }
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0 || user?.id) {
      fetchManagementData();
    }
  }, [refreshTrigger, user?.id, fetchManagementData]);

  const addSponsor = async (sponsor: Partial<Sponsor>) => {
    const { error } = await supabase.from('sponsors').insert(sponsor);
    if (error) throw error;
    await fetchManagementData();
  };

  const updateSponsor = async (id: number, sponsor: Partial<Sponsor>) => {
    const { error } = await supabase.from('sponsors').update(sponsor).eq('id', id);
    if (error) throw error;
    await fetchManagementData();
  };

  const deleteSponsor = async (id: number) => {
    const { error } = await supabase.from('sponsors').delete().eq('id', id);
    if (error) throw error;
    await fetchManagementData();
  };

  const addRegistration = async (registration: Partial<Registration>) => {
    const { error } = await supabase.from('registrations').insert(registration);
    if (error) throw error;
    await fetchManagementData();
  };

  const updateRegistrationStatus = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    const { error } = await supabase.from('registrations').update({ status }).eq('id', id);
    if (error) throw error;
    await fetchManagementData();
  };
  const updateSponsorshipSettings = async (patch: Partial<SponsorshipSettings>) => {
    const { error } = await supabase.from('sponsorship_settings').upsert({ id: 1, ...patch });
    if (error) throw error;
    await fetchManagementData();
  };

  const addSponsorshipPackage = async (pkg: Partial<SponsorshipPackage>) => {
    const { error } = await supabase.from('sponsorship_packages').insert(pkg);
    if (error) throw error;
    await fetchManagementData();
  };

  const updateSponsorshipPackage = async (id: number, patch: Partial<SponsorshipPackage>) => {
    const { error } = await supabase.from('sponsorship_packages').update(patch).eq('id', id);
    if (error) throw error;
    await fetchManagementData();
  };

  const deleteSponsorshipPackage = async (id: number) => {
    const { error } = await supabase.from('sponsorship_packages').delete().eq('id', id);
    if (error) throw error;
    await fetchManagementData();
  };

  const deleteRegistration = async (id: string) => {
    const { error } = await supabase.from('registrations').delete().eq('id', id);
    if (error) throw error;
    await fetchManagementData();
  };

  const updateAuditionStatus = async (id: string, status: 'pending' | 'reviewed' | 'contacted') => {
    const { error } = await supabase.from('auditions').update({ status }).eq('id', id);
    if (error) throw error;
    await fetchManagementData();
  };

  const deleteAudition = async (id: string) => {
    const { error } = await supabase.from('auditions').delete().eq('id', id);
    if (error) throw error;
    await fetchManagementData();
  };

  const updateMembershipStatus = async (id: string, status: 'pending' | 'reviewed' | 'accepted') => {
    const { error } = await supabase.from('memberships').update({ status }).eq('id', id);
    if (error) throw error;
    await fetchManagementData();
  };

  const deleteMembership = async (id: string) => {
    const { error } = await supabase.from('memberships').delete().eq('id', id);
    if (error) throw error;
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
    addSponsor,
    updateSponsor,
    deleteSponsor,
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
    deleteSponsorshipPackage
  };

  return <ManagementContext.Provider value={value}>{children}</ManagementContext.Provider>;
};
