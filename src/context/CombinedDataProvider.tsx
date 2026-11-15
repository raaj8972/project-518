import { ReactNode, useState, useMemo, createContext, useContext } from 'react';
import { CoreDataProvider, useCoreData } from './CoreDataContext';
import { EventsProvider } from './EventsContext';
import { PersonnelProvider } from './PersonnelContext';
import { GalleryProvider } from './GalleryContext';
import { ManagementProvider } from './ManagementContext';
import { SportsProvider } from './SportsContext';
import { AnnualSportsProvider } from './AnnualSportsContext';
import { useAuth } from './AuthContext';
import { getDataScope, pendingLandingPath } from '../utils/dataScope';

interface SystemStatusContextType {
  isReady: boolean;
  pathname: string;
  setPathname: (path: string) => void;
  scope: ReturnType<typeof getDataScope>;
}
const SystemStatusContext = createContext<SystemStatusContextType | undefined>(undefined);
export const useSystemStatus = () => {
  const context = useContext(SystemStatusContext);
  if (!context) throw new Error('useSystemStatus must be used within CombinedDataProvider');
  return context;
};

function ScopedProviders({ children, pathname, setPathname }: { children: ReactNode; pathname: string; setPathname: (path: string) => void }) {
  const core = useCoreData();
  const { isAuthenticated, user } = useAuth();
  const role = user?.user_metadata?.role;
  const privateAdmin = isAuthenticated && (role === 'admin' || role === 'owner');
  const scope = useMemo(() => {
    const target = pendingLandingPath(pathname, (core.siteSettings as any)?.default_landing_page, privateAdmin) || pathname;
    const selected = getDataScope(target, privateAdmin);
    return core.isLoaded ? selected : Object.fromEntries(Object.keys(selected).map(key => [key, false])) as typeof selected;
  }, [pathname, privateAdmin, core.isLoaded, core.siteSettings]);
  const status = useMemo(() => ({ isReady: core.isLoaded, pathname, setPathname, scope }), [core.isLoaded, pathname, setPathname, scope]);
  return (
    <SystemStatusContext.Provider value={status}>
      <EventsProvider enabled={scope.events}>
        <PersonnelProvider enabled={scope.personnel}>
          <ManagementProvider enabled={scope.management} includePrivate={scope.privateManagement}>
            <SportsProvider enabled={scope.sports}>
              <AnnualSportsProvider enabled={scope.annualSports}>
                <GalleryProvider enabled={scope.gallery}>{children}</GalleryProvider>
              </AnnualSportsProvider>
            </SportsProvider>
          </ManagementProvider>
        </PersonnelProvider>
      </EventsProvider>
    </SystemStatusContext.Provider>
  );
}

export function CombinedDataProvider({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState(() => typeof window === 'undefined' ? '/' : window.location.pathname);
  return <CoreDataProvider pathname={pathname}><ScopedProviders pathname={pathname} setPathname={setPathname}>{children}</ScopedProviders></CoreDataProvider>;
}
