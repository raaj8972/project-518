import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { dualInsert, dualUpdate, dualDelete } from '../lib/dualDb';
import { 
  SportsSeason, SportsTeam, SportsPlayer, SportsRegistration, SportsMatch,
  AnnualSportsEvent, AnnualSportsRegistration, AnnualSportsMatch 
} from '../types/data';
import { useCoreData } from './CoreDataContext';
import { useAuth } from './AuthContext';
import { fetchSupabaseBatch } from '../utils/dataUtils';

interface SportsContextType {
  sportsSeasons: SportsSeason[];
  sportsTeams: SportsTeam[];
  sportsPlayers: SportsPlayer[];
  sportsRegistrations: SportsRegistration[];
  sportsMatches: SportsMatch[];
  loading: boolean;
  isLoaded: boolean;
  
  // Annual Sports
  annualSportsEvents: AnnualSportsEvent[];
  annualSportsRegistrations: AnnualSportsRegistration[];
  annualSportsMatches: AnnualSportsMatch[];
  
  // Seasons
  addSportsSeason: (season: Partial<SportsSeason>) => Promise<any>;
  updateSportsSeason: (id: number, season: Partial<SportsSeason>) => Promise<any>;
  deleteSportsSeason: (id: number) => Promise<void>;
  
  // Teams
  addSportsTeam: (team: Partial<SportsTeam>) => Promise<any>;
  updateSportsTeam: (id: number, team: Partial<SportsTeam>) => Promise<any>;
  deleteSportsTeam: (id: number) => Promise<void>;
  
  // Players
  addSportsPlayer: (player: Partial<SportsPlayer>) => Promise<any>;
  updateSportsPlayer: (id: number, player: Partial<SportsPlayer>) => Promise<any>;
  deleteSportsPlayer: (id: number) => Promise<void>;
  
  // Registrations
  addSportsRegistration: (reg: Partial<SportsRegistration>) => Promise<any>;
  updateSportsRegistration: (id: number, reg: Partial<SportsRegistration>) => Promise<any>;
  deleteSportsRegistration: (id: number) => Promise<void>;
  
  // Matches
  addSportsMatch: (match: Partial<SportsMatch>) => Promise<any>;
  updateSportsMatch: (id: number, match: Partial<SportsMatch>) => Promise<any>;
  deleteSportsMatch: (id: number) => Promise<void>;

  // Annual Matches
  addAnnualSportsMatch: (match: Partial<AnnualSportsMatch>) => Promise<any>;
  updateAnnualSportsMatch: (id: number, match: Partial<AnnualSportsMatch>) => Promise<any>;
  deleteAnnualSportsMatch: (id: number) => Promise<void>;
}

const SportsContext = createContext<SportsContextType | undefined>(undefined);

// [DEDUPE] Use window bridge for singleton Context
const PrimarySportsContext = ((typeof window !== 'undefined') 
  ? ((window as any).__SPORTS_CONTEXT__ || ((window as any).__SPORTS_CONTEXT__ = SportsContext))
  : SportsContext) as React.Context<SportsContextType | undefined>;

export const useSportsData = () => {
  const context = useContext(PrimarySportsContext);
  if (context === undefined) {
    throw new Error('useSportsData must be used within a SportsProvider');
  }
  return context;
};

export function SportsProvider({ children, enabled = true }: { children: ReactNode, enabled?: boolean }) {
  const { refreshTrigger } = useCoreData();
  const { user } = useAuth();
  
  const [sportsSeasons, setSportsSeasons] = useState<SportsSeason[]>([]);
  const [sportsTeams, setSportsTeams] = useState<SportsTeam[]>([]);
  const [sportsPlayers, setSportsPlayers] = useState<SportsPlayer[]>([]);
  const [sportsRegistrations, setSportsRegistrations] = useState<SportsRegistration[]>([]);
  const [sportsMatches, setSportsMatches] = useState<SportsMatch[]>([]);
  
  const [annualSportsEvents, setAnnualSportsEvents] = useState<AnnualSportsEvent[]>([]);
  const [annualSportsRegistrations, setAnnualSportsRegistrations] = useState<AnnualSportsRegistration[]>([]);
  const [annualSportsMatches, setAnnualSportsMatches] = useState<AnnualSportsMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchSportsData = useCallback(async () => {
    if (!enabled) return;
    try {
      const results = await Promise.all([
        fetchSupabaseBatch<SportsSeason>('sports_seasons', { order: { column: 'created_at', ascending: true } }),
        fetchSupabaseBatch<SportsTeam>('sports_teams', { order: { column: 'created_at', ascending: true } }),
        fetchSupabaseBatch<SportsPlayer>('sports_players', { order: { column: 'created_at', ascending: true } }),
        fetchSupabaseBatch<SportsRegistration>('sports_registrations', { order: { column: 'created_at', ascending: false } }),
        fetchSupabaseBatch<SportsMatch>('sports_matches', { order: { column: 'match_date', ascending: false } }),
        fetchSupabaseBatch<AnnualSportsEvent>('annual_sports_events', { order: { column: 'created_at', ascending: true } }),
        fetchSupabaseBatch<AnnualSportsRegistration>('annual_sports_registrations', { order: { column: 'created_at', ascending: false } }),
        fetchSupabaseBatch<AnnualSportsMatch>('annual_sports_matches', { order: { column: 'match_date', ascending: false } })
      ]);

      const [seasonsRes, teamsRes, playersRes, regsRes, matchesRes, eventsRes, annualRegsRes, annualMatchesRes] = results;

      if (!seasonsRes.error) setSportsSeasons(seasonsRes.data || []);
      if (!teamsRes.error) setSportsTeams(teamsRes.data || []);
      if (!playersRes.error) setSportsPlayers(playersRes.data || []);
      if (!regsRes.error) setSportsRegistrations(regsRes.data || []);
      if (!matchesRes.error) setSportsMatches(matchesRes.data || []);
      
      if (!eventsRes.error) setAnnualSportsEvents(eventsRes.data || []);
      if (!annualRegsRes.error) setAnnualSportsRegistrations(annualRegsRes.data || []);
      if (!annualMatchesRes.error) setAnnualSportsMatches(annualMatchesRes.data || []);

    } finally {
      setLoading(false);
      setIsLoaded(true);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      fetchSportsData();
    }
  }, [refreshTrigger, user?.id, fetchSportsData, enabled]);

  const value: SportsContextType = {
    sportsSeasons,
    sportsTeams,
    sportsPlayers,
    sportsRegistrations,
    sportsMatches,
    annualSportsEvents,
    annualSportsRegistrations,
    annualSportsMatches,
    loading,
    isLoaded,
    
    addSportsSeason: async (season) => {
      const res = await dualInsert('sports_seasons', season);
      await fetchSportsData();
      return res?.[0];
    },
    updateSportsSeason: async (id, season) => {
      const res = await dualUpdate('sports_seasons', id, season);
      await fetchSportsData();
      return res?.[0];
    },
    deleteSportsSeason: async (id) => {
      await dualDelete('sports_seasons', id);
      await fetchSportsData();
    },
    
    addSportsTeam: async (team) => {
      const res = await dualInsert('sports_teams', team);
      await fetchSportsData();
      return res?.[0];
    },
    updateSportsTeam: async (id, team) => {
      const res = await dualUpdate('sports_teams', id, team);
      await fetchSportsData();
      return res?.[0];
    },
    deleteSportsTeam: async (id) => {
      await dualDelete('sports_teams', id);
      await fetchSportsData();
    },
    
    addSportsPlayer: async (player) => {
      const res = await dualInsert('sports_players', player);
      await fetchSportsData();
      return res?.[0];
    },
    updateSportsPlayer: async (id, player) => {
      const res = await dualUpdate('sports_players', id, player);
      await fetchSportsData();
      return res?.[0];
    },
    deleteSportsPlayer: async (id) => {
      await dualDelete('sports_players', id);
      await fetchSportsData();
    },
    
    addSportsRegistration: async (reg) => {
      const res = await dualInsert('sports_registrations', reg);
      await fetchSportsData();
      return res?.[0];
    },
    updateSportsRegistration: async (id, reg) => {
      const res = await dualUpdate('sports_registrations', id, reg);
      await fetchSportsData();
      return res?.[0];
    },
    deleteSportsRegistration: async (id) => {
      await dualDelete('sports_registrations', id);
      await fetchSportsData();
    },
    
    addSportsMatch: async (match) => {
      const res = await dualInsert('sports_matches', match);
      await fetchSportsData();
      return res?.[0];
    },
    updateSportsMatch: async (id, match) => {
      const res = await dualUpdate('sports_matches', id, match);
      await fetchSportsData();
      return res?.[0];
    },
    deleteSportsMatch: async (id) => {
      await dualDelete('sports_matches', id);
      await fetchSportsData();
    },

    addAnnualSportsMatch: async (match) => {
      const res = await dualInsert('annual_sports_matches', match);
      await fetchSportsData();
      return res?.[0];
    },
    updateAnnualSportsMatch: async (id, match) => {
      const res = await dualUpdate('annual_sports_matches', id, match);
      await fetchSportsData();
      return res?.[0];
    },
    deleteAnnualSportsMatch: async (id) => {
      await dualDelete('annual_sports_matches', id);
      await fetchSportsData();
    }
  };

  return <SportsContext.Provider value={value}>{children}</SportsContext.Provider>;
}
