import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { 
  FacultyHead, CoreCommittee, CoreTeamMember, SportsCommittee, 
  SportsTeamMember, BandMember, GuestArtist
} from '../types/data';
import { useCoreData } from './CoreDataContext';
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

export const usePersonnelData = () => {
  const context = useContext(PersonnelContext);
  if (context === undefined) {
    throw new Error('usePersonnelData must be used within a PersonnelProvider');
  }
  return context;
};

export const PersonnelProvider = ({ children }: { children: ReactNode }) => {
  const { refreshTrigger } = useCoreData();
  const [facultyHeads, setFacultyHeads] = useState<FacultyHead[]>([]);
  const [coreCommittees, setCoreCommittees] = useState<CoreCommittee[]>([]);
  const [coreTeamMembers, setCoreTeamMembers] = useState<CoreTeamMember[]>([]);
  const [sportsCommittees, setSportsCommittees] = useState<SportsCommittee[]>([]);
  const [sportsTeamMembers, setSportsTeamMembers] = useState<SportsTeamMember[]>([]);
  const [bandMembers, setBandMembers] = useState<BandMember[]>([]);
  const [guestArtists, setGuestArtists] = useState<GuestArtist[]>([]);
  const [chiefGuests, setChiefGuests] = useState<any[]>([]);

  const fetchPersonnelData = useCallback(async () => {
    try {
      const [facultyRes, coreCommitteesRes, coreTeamRes, sportsCommitteesRes, sportsTeamRes, bandRes, guestRes, chiefRes] = await Promise.all([
        fetchSupabaseBatch<FacultyHead>('faculty_heads'),
        fetchSupabaseBatch<CoreCommittee>('core_committees'),
        fetchSupabaseBatch<CoreTeamMember>('core_team_members'),
        fetchSupabaseBatch<SportsCommittee>('sports_committees', { order: { column: 'order_position', ascending: true } }),
        fetchSupabaseBatch<SportsTeamMember>('sports_team_members', { order: { column: 'order_position', ascending: true } }),
        fetchSupabaseBatch<BandMember>('band_members', { order: { column: 'order_position', ascending: true } }),
        fetchSupabaseBatch<GuestArtist>('guest_artists', { order: { column: 'order_position', ascending: true } }),
        fetchSupabaseBatch<any>('chief_guests', { order: { column: 'order_position', ascending: true } })
      ]);

      if (!facultyRes.error) setFacultyHeads(facultyRes.data || []);
      if (!coreCommitteesRes.error) setCoreCommittees(coreCommitteesRes.data || []);
      if (!coreTeamRes.error) setCoreTeamMembers(coreTeamRes.data || []);
      if (!sportsCommitteesRes.error) setSportsCommittees(sportsCommitteesRes.data || []);
      if (!sportsTeamRes.error) setSportsTeamMembers(sportsTeamRes.data || []);
      if (!bandRes.error) setBandMembers(bandRes.data || []);
      if (!guestRes.error) setGuestArtists(guestRes.data || []);
      if (!chiefRes.error) setChiefGuests(chiefRes.data || []);

    } catch (err) {
      console.error('[PersonnelContext] Failed to fetch personnel data', err);
    }
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchPersonnelData();
    }
  }, [refreshTrigger, fetchPersonnelData]);

  // Faculty
  const addFacultyHead = async (head: Partial<FacultyHead>) => {
    const { error } = await supabase.from('faculty_heads').insert(head);
    if (error) throw error;
    await fetchPersonnelData();
  };

  const updateFacultyHead = async (id: number, head: Partial<FacultyHead>) => {
    const { error } = await supabase.from('faculty_heads').update(head).eq('id', id);
    if (error) throw error;
    await fetchPersonnelData();
  };

  const deleteFacultyHead = async (id: number) => {
    const { error } = await supabase.from('faculty_heads').delete().eq('id', id);
    if (error) throw error;
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
    addFacultyHead,
    updateFacultyHead,
    deleteFacultyHead,
    addCoreCommittee: async (committee) => {
      const { error } = await supabase.from('core_committees').insert(committee);
      if (error) throw error;
      await fetchPersonnelData();
    },
    updateCoreCommittee: async (id, committee) => {
      const { error } = await supabase.from('core_committees').update(committee).eq('id', id);
      if (error) throw error;
      await fetchPersonnelData();
    },
    deleteCoreCommittee: async (id) => {
      const { error } = await supabase.from('core_committees').delete().eq('id', id);
      if (error) throw error;
      await fetchPersonnelData();
    },
    addCoreTeamMember: async (member) => {
      const { error } = await supabase.from('core_team_members').insert(member);
      if (error) throw error;
      await fetchPersonnelData();
    },
    updateCoreTeamMember: async (id, member) => {
      const { error } = await supabase.from('core_team_members').update(member).eq('id', id);
      if (error) throw error;
      await fetchPersonnelData();
    },
    deleteCoreTeamMember: async (id) => {
      const { error } = await supabase.from('core_team_members').delete().eq('id', id);
      if (error) throw error;
      await fetchPersonnelData();
    },
    addSportsCommittee: async (committee) => {
      const { error } = await supabase.from('sports_committees').insert(committee);
      if (error) throw error;
      await fetchPersonnelData();
    },
    updateSportsCommittee: async (id, committee) => {
      const { error } = await supabase.from('sports_committees').update(committee).eq('id', id);
      if (error) throw error;
      await fetchPersonnelData();
    },
    deleteSportsCommittee: async (id) => {
      const { error } = await supabase.from('sports_committees').delete().eq('id', id);
      if (error) throw error;
      await fetchPersonnelData();
    },
    addSportsTeamMember: async (member) => {
      const { error } = await supabase.from('sports_team_members').insert(member);
      if (error) throw error;
      await fetchPersonnelData();
    },
    updateSportsTeamMember: async (id, member) => {
      const { error } = await supabase.from('sports_team_members').update(member).eq('id', id);
      if (error) throw error;
      await fetchPersonnelData();
    },
    deleteSportsTeamMember: async (id) => {
      const { error } = await supabase.from('sports_team_members').delete().eq('id', id);
      if (error) throw error;
      await fetchPersonnelData();
    },
    addBandMember: async (member) => {
      const { error } = await supabase.from('band_members').insert(member);
      if (error) throw error;
      await fetchPersonnelData();
    },
    updateBandMember: async (id, member) => {
      const { error } = await supabase.from('band_members').update(member).eq('id', id);
      if (error) throw error;
      await fetchPersonnelData();
    },
    deleteBandMember: async (id) => {
      const { error } = await supabase.from('band_members').delete().eq('id', id);
      if (error) throw error;
      await fetchPersonnelData();
    },
    addChiefGuest: async (guest) => {
      const { error } = await supabase.from('chief_guests').insert(guest);
      if (error) throw error;
      await fetchPersonnelData();
    },
    updateChiefGuest: async (id, guest) => {
      const { error } = await supabase.from('chief_guests').update(guest).eq('id', id);
      if (error) throw error;
      await fetchPersonnelData();
    },
    deleteChiefGuest: async (id) => {
      const { error } = await supabase.from('chief_guests').delete().eq('id', id);
      if (error) throw error;
      await fetchPersonnelData();
    }
  };

  return <PersonnelContext.Provider value={value}>{children}</PersonnelContext.Provider>;
};
