import React, { ReactNode, useState, useEffect, createContext, useContext } from 'react';
import { CoreDataProvider, useCoreData } from './CoreDataContext';
import { EventsProvider, useEventsData } from './EventsContext';
import { PersonnelProvider, usePersonnelData } from './PersonnelContext';
import { GalleryProvider } from './GalleryContext';
import { ManagementProvider, useManagementData } from './ManagementContext';
import { SportsProvider, useSportsData } from './SportsContext';
import { AnnualSportsProvider } from './AnnualSportsContext';

interface SystemStatusContextType {
  stage: number;
  isReady: boolean;
}

const SystemStatusContext = createContext<SystemStatusContextType | undefined>(undefined);

export const useSystemStatus = () => {
  const context = useContext(SystemStatusContext);
  if (!context) throw new Error('useSystemStatus must be used within CombinedDataProvider');
  return context;
};

const StageAdvancer = ({ stage, setStage }: { stage: number, setStage: (n: number) => void }) => {
  const core = useCoreData();
  const personnel = usePersonnelData();
  const events = useEventsData();
  const management = useManagementData();
  const sports = useSportsData();

  // Stage Transitions with staggered delays to prevent connection saturation
  useEffect(() => {
    // Stage 0 -> 1 (Personnel & Events)
    if (stage === 0 && core.isLoaded && !core.loading) {
      const timer = setTimeout(() => {
        console.log('[Orchestration] Transitioning to Stage 1: Personnel & Events');
        setStage(1);
      }, 1200);
      return () => clearTimeout(timer);
    }
    
    // Stage 1 -> 2 (Management & Sports)
    if (stage === 1 && personnel.isLoaded && !personnel.loading && events.isLoaded && !events.loading) {
      const timer = setTimeout(() => {
        console.log('[Orchestration] Transitioning to Stage 2: Management & Sports');
        setStage(2);
      }, 1200);
      return () => clearTimeout(timer);
    }
    
    // Stage 2 -> 3 (Gallery)
    if (stage === 2 && sports.isLoaded && !sports.loading && management.isLoaded && !management.loading) {
      const timer = setTimeout(() => {
        console.log('[Orchestration] Transitioning to Stage 3: Gallery');
        setStage(3);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [
    stage, setStage,
    core.isLoaded, core.loading,
    personnel.isLoaded, personnel.loading,
    events.isLoaded, events.loading,
    sports.isLoaded, sports.loading,
    management.isLoaded, management.loading
  ]);

  return null;
};

export const CombinedDataProvider = ({ children }: { children: ReactNode }) => {
  const [stage, setStage] = useState(0);

  const value = {
    stage,
    isReady: stage >= 3
  };

  return (
    <SystemStatusContext.Provider value={value}>
      <CoreDataProvider>
        <EventsProvider enabled={stage >= 1}>
          <PersonnelProvider enabled={stage >= 1}>
            <ManagementProvider enabled={stage >= 2}>
              <SportsProvider enabled={stage >= 2}>
                <AnnualSportsProvider enabled={stage >= 2}>
                  <GalleryProvider enabled={stage >= 3}>
                    <StageAdvancer stage={stage} setStage={setStage} />
                    {children}
                  </GalleryProvider>
                </AnnualSportsProvider>
              </SportsProvider>
            </ManagementProvider>
          </PersonnelProvider>
        </EventsProvider>
      </CoreDataProvider>
    </SystemStatusContext.Provider>
  );
};
