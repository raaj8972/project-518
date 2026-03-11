import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { dualInsert, dualUpdate, dualDelete } from '../lib/dualDb';
import { 
  SportsSeason, SportsTeam, SportsPlayer, SportsRegistration, SportsMatch 
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
  
  // Seasons
  addSportsSeason: (season: Partial<SportsSeason>) => Promise<void>;
  updateSportsSeason: (id: number, season: Partial<SportsSeason>) => Promise<void>;
  deleteSportsSeason: (id: number) => Promise<void>;
  
  // Teams
  addSportsTeam: (team: Partial<SportsTeam>) => Promise<void>;
  updateSportsTeam: (id: number, team: Partial<SportsTeam>) => Promise<void>;
  deleteSportsTeam: (id: number) => Promise<void>;
  
  // Players
  addSportsPlayer: (player: Partial<SportsPlayer>) => Promise<void>;
  updateSportsPlayer: (id: number, player: Partial<SportsPlayer>) => Promise<void>;
  deleteSportsPlayer: (id: number) => Promise<void>;
  
  // Registrations
  addSportsRegistration: (reg: Partial<SportsRegistration>) => Promise<void>;
  updateSportsRegistration: (id: number, reg: Partial<SportsRegistration>) => Promise<void>;
  deleteSportsRegistration: (id: number) => Promise<void>;
  
  // Matches
  addSportsMatch: (match: Partial<SportsMatch>) => Promise<void>;
  updateSportsMatch: (id: number, match: Partial<SportsMatch>) => Promise<void>;
  deleteSportsMatch: (id: number) => Promise<void>;
}

const SportsContext = createContext<SportsContextType | undefined>(undefined);

export const useSportsData = () => {
  const context = useContext(SportsContext);
  if (context === undefined) {
    throw new Error('useSportsData must be used within a SportsProvider');
  }
  return context;
};

export const SportsProvider = ({ children }: { children: ReactNode }) => {
  const { refreshTrigger } = useCoreData();
  const { user } = useAuth();
  
  const [sportsSeasons, setSportsSeasons] = useState<SportsSeason[]>([]);
  const [sportsTeams, setSportsTeams] = useState<SportsTeam[]>([]);
  const [sportsPlayers, setSportsPlayers] = useState<SportsPlayer[]>([]);
  const [sportsRegistrations, setSportsRegistrations] = useState<SportsRegistration[]>([]);
  const [sportsMatches, setSportsMatches] = useState<SportsMatch[]>([]);

  const fetchSportsData = useCallback(async () => {
    try {
      const [seasonsRes, teamsRes, playersRes, regsRes, matchesRes] = await Promise.all([
        fetchSupabaseBatch<SportsSeason>('sports_seasons', { order: { column: 'created_at', ascending: true } }),
        fetchSupabaseBatch<SportsTeam>('sports_teams', { order: { column: 'created_at', ascending: true } }),
        fetchSupabaseBatch<SportsPlayer>('sports_players', { order: { column: 'created_at', ascending: true } }),
        fetchSupabaseBatch<SportsRegistration>('sports_registrations', { order: { column: 'created_at', ascending: false } }),
        fetchSupabaseBatch<SportsMatch>('sports_matches', { order: { column: 'match_date', ascending: false } })
      ]);

      if (!seasonsRes.error) setSportsSeasons(seasonsRes.data || []);
      if (!teamsRes.error) setSportsTeams(teamsRes.data || []);
      if (!playersRes.error) setSportsPlayers(playersRes.data || []);
      if (!regsRes.error) setSportsRegistrations(regsRes.data || []);
      if (!matchesRes.error) setSportsMatches(matchesRes.data || []);

    } catch (err) {
      console.error('[SportsContext] Failed to fetch sports data', err);
    }
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0 || user?.id) {
      fetchSportsData();
    }
  }, [refreshTrigger, user?.id, fetchSportsData]);

  const value: SportsContextType = {
    sportsSeasons,
    sportsTeams,
    sportsPlayers,
    sportsRegistrations,
    sportsMatches,
    
    addSportsSeason: async (season) => {
      await dualInsert('sports_seasons', season);
      await fetchSportsData();
    },
    updateSportsSeason: async (id, season) => {
      await dualUpdate('sports_seasons', id, season);
      await fetchSportsData();
    },
    deleteSportsSeason: async (id) => {
      await dualDelete('sports_seasons', id);
      await fetchSportsData();
    },
    
    addSportsTeam: async (team) => {
      await dualInsert('sports_teams', team);
      await fetchSportsData();
    },
    updateSportsTeam: async (id, team) => {
      await dualUpdate('sports_teams', id, team);
      await fetchSportsData();
    },
    deleteSportsTeam: async (id) => {
      await dualDelete('sports_teams', id);
      await fetchSportsData();
    },
    
    addSportsPlayer: async (player) => {
      await dualInsert('sports_players', player);
      await fetchSportsData();
    },
    updateSportsPlayer: async (id, player) => {
      await dualUpdate('sports_players', id, player);
      await fetchSportsData();
    },
    deleteSportsPlayer: async (id) => {
      await dualDelete('sports_players', id);
      await fetchSportsData();
    },
    
    addSportsRegistration: async (reg) => {
      await dualInsert('sports_registrations', reg);
      await fetchSportsData();
    },
    updateSportsRegistration: async (id, reg) => {
      await dualUpdate('sports_registrations', id, reg);
      await fetchSportsData();
    },
    deleteSportsRegistration: async (id) => {
      await dualDelete('sports_registrations', id);
      await fetchSportsData();
    },
    
    addSportsMatch: async (match) => {
      await dualInsert('sports_matches', match);
      await fetchSportsData();
    },
    updateSportsMatch: async (id, match) => {
      await dualUpdate('sports_matches', id, match);
      await fetchSportsData();
    },
    deleteSportsMatch: async (id) => {
      await dualDelete('sports_matches', id);
      await fetchSportsData();
    }
  };

  return <SportsContext.Provider value={value}>{children}</SportsContext.Provider>;
};
