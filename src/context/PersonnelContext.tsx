import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { dualInsert, dualUpdate, dualDelete } from '../lib/dualDb';
import { supabase } from '../lib/supabase';
import { 
  FacultyHead, CoreCommittee, CoreTeamMember, SportsCommittee, 
  SportsTeamMember, BandMember, GuestArtist
} from '../types/data';
import { useCoreData } from './CoreDataContext';
import { useAuth } from './AuthContext';
import { fetchSupabaseBatch } from '../utils/dataUtils';

interface PersonnelContextType {
  facultyHeads: FacultyHead[];
  coreCommittees: CoreCommittee[];
  coreTeamMembers: CoreTeamMember[];
  sportsCommittees: SportsCommittee[];
  sportsTeamMembers: SportsTeamMember[];
  bandMembers: BandMember[];
  guestArtists: GuestArtist[];
  chiefGuests: any[];
  loading: boolean;
  
  // Faculty
  addFacultyHead: (head: Partial<FacultyHead>) => Promise<void>;
  updateFacultyHead: (id: number, head: Partial<FacultyHead>) => Promise<void>;
  deleteFacultyHead: (id: number) => Promise<void>;
  
  // Core Team
  addCoreCommittee: (committee: Partial<CoreCommittee>) => Promise<void>;
  updateCoreCommittee: (id: number, committee: Partial<CoreCommittee>) => Promise<void>;
  deleteCoreCommittee: (id: number) => Promise<void>;
  
  addCoreTeamMember: (member: Partial<CoreTeamMember>) => Promise<void>;
  updateCoreTeamMember: (id: number, member: Partial<CoreTeamMember>) => Promise<void>;
  deleteCoreTeamMember: (id: number) => Promise<void>;
  
  // Sports
  addSportsCommittee: (committee: Partial<SportsCommittee>) => Promise<void>;
  updateSportsCommittee: (id: number, committee: Partial<SportsCommittee>) => Promise<void>;
  deleteSportsCommittee: (id: number) => Promise<void>;
  
  addSportsTeamMember: (member: Partial<SportsTeamMember>) => Promise<void>;
  updateSportsTeamMember: (id: number, member: Partial<SportsTeamMember>) => Promise<void>;
  deleteSportsTeamMember: (id: number) => Promise<void>;
  
  // Band
  addBandMember: (member: Partial<BandMember>) => Promise<void>;
  updateBandMember: (id: number, member: Partial<BandMember>) => Promise<void>;
  deleteBandMember: (id: number) => Promise<void>;

  // Chief Guests
  addChiefGuest: (guest: any) => Promise<void>;
  updateChiefGuest: (id: number, guest: any) => Promise<void>;
  deleteChiefGuest: (id: number) => Promise<void>;
}

const PersonnelContext = createContext<PersonnelContextType | undefined>(undefined);

// [DEDUPE] Ensure singleton Context across module duplication
const PrimaryPersonnelContext = ((typeof window !== 'undefined') 
  ? ((window as any).__PERSONNEL_CONTEXT__ || ((window as any).__PERSONNEL_CONTEXT__ = PersonnelContext))
  : PersonnelContext) as React.Context<PersonnelContextType | undefined>;

export const usePersonnelData = () => {
  const context = useContext(PrimaryPersonnelContext);
  if (context === undefined) {
    throw new Error('usePersonnelData must be used within a PersonnelProvider');
  }
  return context;
};

export const PersonnelProvider = ({ children }: { children: ReactNode }) => {
  const { refreshTrigger } = useCoreData();
  const { user } = useAuth();
  const [facultyHeads, setFacultyHeads] = useState<FacultyHead[]>([]);
  const [coreCommittees, setCoreCommittees] = useState<CoreCommittee[]>([]);
  const [coreTeamMembers, setCoreTeamMembers] = useState<CoreTeamMember[]>([]);
  const [sportsCommittees, setSportsCommittees] = useState<SportsCommittee[]>([]);
  const [sportsTeamMembers, setSportsTeamMembers] = useState<SportsTeamMember[]>([]);
  const [bandMembers, setBandMembers] = useState<BandMember[]>([]);
  const [guestArtists, setGuestArtists] = useState<GuestArtist[]>([]);
  const [chiefGuests, setChiefGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPersonnelData = useCallback(async () => {
    setLoading(true);
    console.log('[PersonnelContext] fetchPersonnelData started');
    const start = Date.now();
    try {
      const [facultyRes, coreCommitteesRes, coreTeamRes, sportsCommitteesRes, sportsTeamRes, bandRes, guestRes, chiefRes] = await Promise.all([
        fetchSupabaseBatch<FacultyHead>('faculty_heads').then(r => { console.log('✔ faculty_heads'); return r; }),
        fetchSupabaseBatch<CoreCommittee>('core_committees').then(r => { console.log('✔ core_committees'); return r; }),
        fetchSupabaseBatch<CoreTeamMember>('core_team_members').then(r => { console.log('✔ core_team_members'); return r; }),
        fetchSupabaseBatch<SportsCommittee>('sports_committees', { order: { column: 'order_position', ascending: true } }).then(r => { console.log('✔ sports_committees'); return r; }),
        fetchSupabaseBatch<SportsTeamMember>('sports_team_members', { order: { column: 'order_position', ascending: true } }).then(r => { console.log('✔ sports_team_members'); return r; }),
        fetchSupabaseBatch<BandMember>('band_members', { order: { column: 'order_position', ascending: true } }).then(r => { console.log('✔ band_members'); return r; }),
        fetchSupabaseBatch<GuestArtist>('guest_artists', { order: { column: 'order_position', ascending: true } }).then(r => { console.log('✔ guest_artists'); return r; }),
        fetchSupabaseBatch<any>('chief_guests', { order: { column: 'order_position', ascending: true } }).then(r => { console.log('✔ chief_guests'); return r; })
      ]);

      if (!facultyRes.error) setFacultyHeads(facultyRes.data || []);
      if (!coreCommitteesRes.error) setCoreCommittees(coreCommitteesRes.data || []);
      if (!coreTeamRes.error) setCoreTeamMembers(coreTeamRes.data || []);
      if (!sportsCommitteesRes.error) setSportsCommittees(sportsCommitteesRes.data || []);
      if (!sportsTeamRes.error) setSportsTeamMembers(sportsTeamRes.data || []);
      if (!bandRes.error) setBandMembers(bandRes.data || []);
      if (!guestRes.error) setGuestArtists(guestRes.data || []);
      if (!chiefRes.error) setChiefGuests(chiefRes.data || []);

      console.log(`[PersonnelContext] Data fetched in ${Date.now() - start}ms`);
    } catch (err) {
      console.error('[PersonnelContext] Failed to fetch personnel data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0 || user?.id) {
      fetchPersonnelData();
    }
  }, [refreshTrigger, user?.id, fetchPersonnelData]);

  // Real-time: re-fetch when any personnel table changes
  useEffect(() => {
    const channel = supabase
      .channel('personnel-context-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faculty_heads' }, () => fetchPersonnelData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'core_committees' }, () => fetchPersonnelData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'core_team_members' }, () => fetchPersonnelData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sports_committees' }, () => fetchPersonnelData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sports_team_members' }, () => fetchPersonnelData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'band_members' }, () => fetchPersonnelData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_artists' }, () => fetchPersonnelData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chief_guests' }, () => fetchPersonnelData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPersonnelData]);

  // Faculty
  const addFacultyHead = async (head: Partial<FacultyHead>) => {
    await dualInsert('faculty_heads', head);
    await fetchPersonnelData();
  };

  const updateFacultyHead = async (id: number, head: Partial<FacultyHead>) => {
    await dualUpdate('faculty_heads', id, head);
    await fetchPersonnelData();
  };

  const deleteFacultyHead = async (id: number) => {
    await dualDelete('faculty_heads', id);
    await fetchPersonnelData();
  };

  const value: PersonnelContextType = {
    facultyHeads,
    coreCommittees,
    coreTeamMembers,
    sportsCommittees,
    sportsTeamMembers,
    bandMembers,
    guestArtists,
    chiefGuests,
    loading,
    addFacultyHead,
    updateFacultyHead,
    deleteFacultyHead,
    addCoreCommittee: async (committee) => {
      await dualInsert('core_committees', committee);
      await fetchPersonnelData();
    },
    updateCoreCommittee: async (id, committee) => {
      await dualUpdate('core_committees', id, committee);
      await fetchPersonnelData();
    },
    deleteCoreCommittee: async (id) => {
      await dualDelete('core_committees', id);
      await fetchPersonnelData();
    },
    addCoreTeamMember: async (member) => {
      await dualInsert('core_team_members', member);
      await fetchPersonnelData();
    },
    updateCoreTeamMember: async (id, member) => {
      await dualUpdate('core_team_members', id, member);
      await fetchPersonnelData();
    },
    deleteCoreTeamMember: async (id) => {
      await dualDelete('core_team_members', id);
      await fetchPersonnelData();
    },
    addSportsCommittee: async (committee) => {
      await dualInsert('sports_committees', committee);
      await fetchPersonnelData();
    },
    updateSportsCommittee: async (id, committee) => {
      await dualUpdate('sports_committees', id, committee);
      await fetchPersonnelData();
    },
    deleteSportsCommittee: async (id) => {
      await dualDelete('sports_committees', id);
      await fetchPersonnelData();
    },
    addSportsTeamMember: async (member) => {
      await dualInsert('sports_team_members', member);
      await fetchPersonnelData();
    },
    updateSportsTeamMember: async (id, member) => {
      await dualUpdate('sports_team_members', id, member);
      await fetchPersonnelData();
    },
    deleteSportsTeamMember: async (id) => {
      await dualDelete('sports_team_members', id);
      await fetchPersonnelData();
    },
    addBandMember: async (member) => {
      await dualInsert('band_members', member);
      await fetchPersonnelData();
    },
    updateBandMember: async (id, member) => {
      await dualUpdate('band_members', id, member);
      await fetchPersonnelData();
    },
    deleteBandMember: async (id) => {
      await dualDelete('band_members', id);
      await fetchPersonnelData();
    },
    addChiefGuest: async (guest) => {
      await dualInsert('chief_guests', guest);
      await fetchPersonnelData();
    },
    updateChiefGuest: async (id, guest) => {
      await dualUpdate('chief_guests', id, guest);
      await fetchPersonnelData();
    },
    deleteChiefGuest: async (id) => {
      await dualDelete('chief_guests', id);
      await fetchPersonnelData();
    }
  };

  return <PrimaryPersonnelContext.Provider value={value}>{children}</PrimaryPersonnelContext.Provider>;
};
