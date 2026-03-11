import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { dualInsert, dualUpdate, dualDelete, dualUpsert, dualRead } from '../lib/dualDb';
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
        dualRead({ table: 'sponsorship_settings', eq: ['id', 1], maybeSingle: true }),
        fetchAllRegistrations(),
        dualRead({ table: 'auditions', order: ['created_at', { ascending: false }] }),
        dualRead({ table: 'memberships', order: ['created_at', { ascending: false }] }),
        dualRead({ table: 'admin_users' }) // Needs permissions join logic eventually
      ]);

      if (sponsorsRes.data) setSponsors(sponsorsRes.data || []);
      if (packagesRes.data) setSponsorshipPackages(packagesRes.data || []);
      if (settingsRes.data) setSponsorshipSettings(settingsRes.data || null);
      if (registrationsRes.data) setRegistrations(registrationsRes.data || []);
      if (auditionsRes.data) setAuditions(auditionsRes.data || []);
      if (membershipsRes.data) setMemberships(membershipsRes.data || []);
      if (adminRes.data) {
        // Flatten permissions for easier consumption
        // In Supabase they were nested in admin_permissions array. In Firestore, they are flat on the object.
        const flattenedAdmins = (adminRes.data || []).map((u: any) => ({
          ...u,
          ...(u.admin_permissions?.[0] || u.admin_permissions || {})
        }));
        console.log('[ManagementContext] Fetched admin users:', flattenedAdmins);
        setAdminUsers(flattenedAdmins);
      } else {
        console.warn('[ManagementContext] Admin users data unavailable from primary source');
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
    await dualInsert('sponsors', sponsor);
    await fetchManagementData();
  };

  const updateSponsor = async (id: number, sponsor: Partial<Sponsor>) => {
    await dualUpdate('sponsors', id, sponsor);
    await fetchManagementData();
  };

  const deleteSponsor = async (id: number) => {
    await dualDelete('sponsors', id);
    await fetchManagementData();
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
