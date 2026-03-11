import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { dualRead, dualUpsert, dualDelete } from '../lib/dualDb';
import { AnnualSportsEvent, AnnualSportsRegistration } from '../types/data';
import { useCoreData } from './CoreDataContext';
import toast from 'react-hot-toast';

interface AnnualSportsContextType {
  annualEvents: AnnualSportsEvent[];
  annualRegistrations: AnnualSportsRegistration[];
  loading: boolean;
  
  // Events
  addAnnualEvent: (eventData: Partial<AnnualSportsEvent>) => Promise<void>;
  updateAnnualEvent: (id: string, patch: Partial<AnnualSportsEvent>) => Promise<void>;
  deleteAnnualEvent: (id: string) => Promise<void>;
  
  // Registrations
  addAnnualRegistration: (registration: Partial<AnnualSportsRegistration>) => Promise<AnnualSportsRegistration | null>;
  updateAnnualRegistrationStatus: (id: string, status: 'approved' | 'rejected' | 'pending') => Promise<void>;
  deleteAnnualRegistration: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AnnualSportsContext = createContext<AnnualSportsContextType | undefined>(undefined);

export const useAnnualSports = () => {
  const context = useContext(AnnualSportsContext);
  if (context === undefined) {
    throw new Error('useAnnualSports must be used within an AnnualSportsProvider');
  }
  return context;
};

export const AnnualSportsProvider = ({ children }: { children: ReactNode }) => {
  const { refreshTrigger } = useCoreData();
  const [annualEvents, setAnnualEvents] = useState<AnnualSportsEvent[]>([]);
  const [annualRegistrations, setAnnualRegistrations] = useState<AnnualSportsRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnualSportsData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch using dual-sync layer
      const [eventsRes, registrationsRes] = await Promise.all([
        dualRead({ 
          table: 'annual_sports_events', 
          order: ['name', { ascending: true }] 
        }),
        dualRead({ 
          table: 'annual_sports_registrations', 
          order: ['created_at', { ascending: false }] 
        })
      ]);

      setAnnualEvents(eventsRes.data || []);
      setAnnualRegistrations(registrationsRes.data || []);
    } catch (err) {
      console.error('[AnnualSportsContext] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnualSportsData();
  }, [fetchAnnualSportsData, refreshTrigger]);

  const addAnnualEvent = async (eventData: Partial<AnnualSportsEvent>) => {
    await dualUpsert('annual_sports_events', eventData);
    await fetchAnnualSportsData();
  };

  const updateAnnualEvent = async (id: string, patch: Partial<AnnualSportsEvent>) => {
    await dualUpsert('annual_sports_events', { id, ...patch });
    await fetchAnnualSportsData();
  };

  const deleteAnnualEvent = async (id: string) => {
    await dualDelete('annual_sports_events', id);
    await fetchAnnualSportsData();
  };

  const addAnnualRegistration = async (registration: Partial<AnnualSportsRegistration>) => {
    // Duplicate Detection
    const isDuplicate = annualRegistrations.some(r => 
      r.event_id === registration.event_id && 
      r.status !== 'rejected' &&
      (
        (registration.email && r.email?.toLowerCase() === registration.email.toLowerCase()) ||
        (registration.roll_no && r.roll_no?.toLowerCase() === registration.roll_no.toLowerCase()) ||
        (registration.phone && r.phone === registration.phone)
      )
    );

    if (isDuplicate) {
      toast.error('You have already registered for this event!');
      throw new Error('Duplicate registration detected.');
    }

    const result = await dualUpsert('annual_sports_registrations', registration);
    await fetchAnnualSportsData();
    toast.success('Registration submitted successfully!');
    return Array.isArray(result) ? result[0] : result;
  };

  const updateAnnualRegistrationStatus = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    await dualUpsert('annual_sports_registrations', { id, status });
    await fetchAnnualSportsData();
  };

  const deleteAnnualRegistration = async (id: string) => {
    await dualDelete('annual_sports_registrations', id);
    await fetchAnnualSportsData();
  };

  const value: AnnualSportsContextType = {
    annualEvents,
    annualRegistrations,
    loading,
    addAnnualEvent,
    updateAnnualEvent,
    deleteAnnualEvent,
    addAnnualRegistration,
    updateAnnualRegistrationStatus,
    deleteAnnualRegistration,
    refreshData: fetchAnnualSportsData
  };

  return <AnnualSportsContext.Provider value={value}>{children}</AnnualSportsContext.Provider>;
};
