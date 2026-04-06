import { ReactNode, useState, useEffect, createContext, useContext } from 'react';
import { CoreDataProvider, useCoreData } from './CoreDataContext';
import { EventsProvider, useEventsData } from './EventsContext';
import { PersonnelProvider, usePersonnelData } from './PersonnelContext';
import { GalleryProvider } from './GalleryContext';
import { ManagementProvider, useManagementData } from './ManagementContext';
import { SportsProvider, useSportsData } from './SportsContext';
import { AnnualSportsProvider, useAnnualSports } from './AnnualSportsContext';

interface SystemStatusContextType {
  stage: number;
  isReady: boolean;
}

const SystemStatusContext = createContext<SystemStatusContextType | undefined>(undefined);

const useSystemStatus = () => {
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
  const annualSports = useAnnualSports();

  // --- Stage-Advancement Failsafe ---
  // If a stage doesn't naturally complete within 2.5s, force it to prevent stuck preloaders.
  useEffect(() => {
    if (stage >= 3) return;

    const failsafe = setTimeout(() => {
      console.warn(`[Orchestration] Failsafe: Forcing Stage ${stage} -> ${stage + 1} due to inactivity.`);
      setStage(stage + 1);
    }, 2500);

    return () => clearTimeout(failsafe);
  }, [stage, setStage]);

  // Stage Transitions with staggered delays to prevent connection saturation
  useEffect(() => {
    // Stage 0 -> 1 (Personnel & Events)
    if (stage === 0 && (core.siteSettings || (core.isLoaded && !core.loading))) {
      const timer = setTimeout(() => {
        console.log('[Orchestration] Transitioning to Stage 1: Personnel & Events');
        setStage(1);
      }, 50); // Minimal delay now that we check for partial readiness
      return () => clearTimeout(timer);
    }
    
    // Stage 1 -> 2 (Management & Sports)
    if (stage === 1 && personnel.isLoaded && !personnel.loading && events.isLoaded && !events.loading) {
      const timer = setTimeout(() => {
        console.log('[Orchestration] Transitioning to Stage 2: Management & Sports');
        setStage(2);
      }, 200);
      return () => clearTimeout(timer);
    }
    
    // Stage 2 -> 3 (Gallery & Beyond)
    if (stage === 2 && 
        sports.isLoaded && !sports.loading && 
        management.isLoaded && !management.loading &&
        annualSports.isLoaded && !annualSports.loading) {
      const timer = setTimeout(() => {
        console.log('[Orchestration] Transitioning to Stage 3: Gallery');
        setStage(3);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [
    stage, setStage,
    core.isLoaded, core.loading,
    personnel.isLoaded, personnel.loading,
    events.isLoaded, events.loading,
    sports.isLoaded, sports.loading,
    management.isLoaded, management.loading,
    annualSports.isLoaded, annualSports.loading
  ]);

  return null;
};

function CombinedDataProvider({ children }: { children: ReactNode }) {
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
}

export { CombinedDataProvider, useSystemStatus };
