import React, { useMemo, useState, useEffect, lazy, PropsWithChildren, ReactElement } from 'react';
console.log('[App.tsx] Module loaded');
import { createBrowserRouter, RouterProvider, Outlet, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
// components (lazy loaded)
const Navbar = lazy(() => import('./components/Navbar').then(m => ({ default: m.Navbar })));
const Footer = lazy(() => import('./components/Footer').then(m => ({ default: m.Footer })));

import { AuthProvider, useAuth } from './context/AuthContext';
import { StudentAuthProvider } from './context/StudentAuthContext';
import { DataProvider, useData } from './context/DataContext';
import { CombinedDataProvider, useSystemStatus } from './context/CombinedDataProvider';
import { ToastProvider } from './components/ToastProvider';
import { SavingProgressProvider } from './context/SavingProgressContext';
import { ConnectionStatusBanner } from './components/ConnectionStatusBanner';
import { NotificationsPanel } from './components/NotificationsPanel';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineIndicator from './components/OfflineIndicator';
import { NoiseOverlay } from './components/ui/NoiseOverlay';
import { BollywoodThemeOverlay } from './components/ui/BollywoodThemeOverlay';
import { AudioController } from './components/ui/AudioController';
import { Preloader } from './components/ui/Preloader';
import { SmoothScroll } from './components/ui/SmoothScroll';
import { getCachedLogoUrl } from './utils/preloadBrand';
import LockedPageGuard from './components/LockedPageGuard';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { BollywoodLoader } from './components/ui/BollywoodLoader';

// lazy loads
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home }))) as unknown as React.ComponentType<any>;
const Events = lazy(() => import('./pages/Events').then(m => ({ default: (m as any).Events }))) as unknown as React.ComponentType<any>;
const Schedule = lazy(() => import('./pages/Schedule').then(m => ({ default: (m as any).Schedule }))) as unknown as React.ComponentType<any>;
const Gallery = lazy(() => import('./pages/Gallery').then(m => ({ default: (m as any).Gallery }))) as unknown as React.ComponentType<any>;
const HomeBound = lazy(() => import('./pages/HomeBound').then(m => ({ default: (m as any).HomeBound }))) as unknown as React.ComponentType<any>;
const RicoFamily = lazy(() => import('./pages/RicoFamily').then(m => ({ default: (m as any).RicoFamily }))) as unknown as React.ComponentType<any>;
const Sponsors = lazy(() => import('./pages/Sponsors').then(m => ({ default: (m as any).Sponsors }))) as unknown as React.ComponentType<any>;
const Sports = lazy(() => import('./pages/Sports').then(m => ({ default: (m as any).Sports }))) as unknown as React.ComponentType<any>;
const Login = lazy(() => import('./pages/Login').then(m => ({ default: (m as any).Login }))) as unknown as React.ComponentType<any>;
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: (m as any).AdminDashboard }))) as unknown as React.ComponentType<any>;
const CoordinatorLogin = lazy(() => import('./pages/CoordinatorLogin').then(m => ({ default: (m as any).CoordinatorLogin }))) as unknown as React.ComponentType<any>;
const CoordinatorDashboard = lazy(() => import('./components/coordinator/CoordinatorDashboard').then(m => ({ default: (m as any).CoordinatorDashboard }))) as unknown as React.ComponentType<any>;
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout')) as unknown as React.ComponentType<any>;
const DashboardOverview = lazy(() => import('./pages/dashboard/Overview')) as unknown as React.ComponentType<any>;
const DashboardAnnouncements = lazy(() => import('./pages/dashboard/Announcements')) as unknown as React.ComponentType<any>;
const DashboardMessages = lazy(() => import('./pages/dashboard/Messages')) as unknown as React.ComponentType<any>;
const DashboardPasses = lazy(() => import('./pages/dashboard/Passes')) as unknown as React.ComponentType<any>;
const DashboardEvents = lazy(() => import('./pages/dashboard/Events')) as unknown as React.ComponentType<any>;
const DashboardSports = lazy(() => import('./pages/dashboard/Sports')) as unknown as React.ComponentType<any>;
const DashboardSettings = lazy(() => import('./pages/dashboard/Settings')) as unknown as React.ComponentType<any>;
const DashboardVibes = lazy(() => import('./pages/dashboard/Vibes')) as unknown as React.ComponentType<any>;
const DashboardSocialFeed = lazy(() => import('./pages/dashboard/SocialFeed')) as unknown as React.ComponentType<any>;
const DashboardCommunity = lazy(() => import('./pages/dashboard/Community')) as unknown as React.ComponentType<any>;
const StudentLogin = lazy(() => import('./pages/StudentLogin')) as unknown as React.ComponentType<any>;
const CouncilLogin = lazy(() => import('./pages/CouncilLogin').then(m => ({ default: (m as any).default }))) as unknown as React.ComponentType<any>;
const CouncilDashboard = lazy(() => import('./pages/CouncilDashboard').then(m => ({ default: (m as any).default }))) as unknown as React.ComponentType<any>;
const SecurityLogin = lazy(() => import('./pages/SecurityLogin').then(m => ({ default: (m as any).default }))) as unknown as React.ComponentType<any>;
const SecurityDashboard = lazy(() => import('./pages/SecurityDashboard').then(m => ({ default: (m as any).default }))) as unknown as React.ComponentType<any>;
const ComingSoon = lazy(() => import('./pages/ComingSoon').then(m => ({ default: (m as any).ComingSoon }))) as unknown as React.ComponentType<any>;
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: (m as any).NotFound }))) as unknown as React.ComponentType<any>;
const MasterGate = lazy(() => import('./pages/MasterGate').then(m => ({ default: (m as any).MasterGate }))) as unknown as React.ComponentType<any>;
const SportsLogin = lazy(() => import('./pages/SportsLogin').then(m => ({ default: (m as any).SportsLogin }))) as unknown as React.ComponentType<any>;
const ForgotPassword = lazy(() => import('./pages/ForgotPassword')) as unknown as React.ComponentType<any>;
const StudentForgotPassword = lazy(() => import('./pages/StudentForgotPassword').then(m => ({ default: m.StudentForgotPassword }))) as unknown as React.ComponentType<any>;
const StudentResetPassword = lazy(() => import('./pages/StudentResetPassword').then(m => ({ default: m.StudentResetPassword }))) as unknown as React.ComponentType<any>;
const ResetPassword = lazy(() => import('./pages/ResetPassword')) as unknown as React.ComponentType<any>;

// Minimal Error Boundary
class RouteErrorBoundary extends React.Component<PropsWithChildren<{}>, { hasError: boolean; message?: string; isChunkError?: boolean }> {
  constructor(props: PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    const msg = error?.message || 'Something went wrong.';
    const isChunkError = msg.includes('Failed to fetch dynamically imported module') || msg.includes('network');
    return { hasError: true, message: msg, isChunkError };
  }
  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError || !navigator.onLine) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-[#0a0a0a] text-white">
            <h2 className="text-2xl font-bold mb-2">Network Error</h2>
            <p className="text-gray-400 mb-6">Check your connection and try again.</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white rounded-lg">Try Again</button>
          </div>
        );
      }
      return <div className="flex items-center justify-center py-24 text-red-600">{this.state.message}</div>;
    }
    return this.props.children as ReactElement;
  }
}

const AppShell: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const core = useData();
  const { stage, isReady } = useSystemStatus();
  const [msg, setMsg] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(getCachedLogoUrl() ?? undefined);
  const [splashVisible, setSplashVisible] = useState(true);

  // Use orchestrated system status for the blocking loader
  const systemReady = isReady;
  const combinedLoading = !systemReady;


  const isAdminOrOwner = useMemo(() => {
    try {
      const uid = user?.id;
      if (!uid || !Array.isArray(core.adminUsers)) return false;
      if (user?.user_metadata?.is_super_admin) return true;
      return !!core.adminUsers.find((a: any) => a.user_id === uid && (a.role === 'owner' || a.role === 'admin' || a.is_primary));
    } catch { return false; }
  }, [user, core.adminUsers]);

  // Loading Orchestration Monitor
  useEffect(() => {
    if (isReady && splashVisible) {
      console.log('[App] System reached operational stage. Transitioning to UI...');
    }
    
    // Safety failsafe to ensure app activation even if a secondary context hangs
    // This is now absolute: after 7 seconds, we ALWAYS reveal the UI.
    const failsafeTimeout = setTimeout(() => {
      if (splashVisible) {
        console.warn(`[App] Emergency Splash Timeout (Stage: ${stage}, Ready: ${isReady}). Forcing activation.`);
        setSplashVisible(false);
      }
    }, 7000); // 7 second absolute wait max
    
    return () => clearTimeout(failsafeTimeout);
  }, [isReady, splashVisible, stage]);

  useEffect(() => {
    const handleRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason?.message || String(e.reason);
      if (reason.toLowerCase().includes('abort')) return;
      console.error('Unhandled Rejection:', reason);
      if (isAdminOrOwner) setMsg(reason);
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, [isAdminOrOwner]);

  useEffect(() => {
    const fresh = (core.homepageSettings as any)?.brand_logo_url;
    if (fresh) setLogoUrl(fresh);
  }, [core.homepageSettings]);

  useEffect(() => {
    document.body.style.overflow = '';
    document.body.classList.remove('dg-scroll-lock');
  }, [location.pathname]);

  const gateActive = useMemo(() => {
    if (core.siteSettings?.site_closed) return true;
    if (!core.siteSettings?.coming_soon_enabled) return false;
    const untilStr = core.siteSettings?.coming_soon_until as any;
    if (!untilStr) return true;
    return Date.now() < new Date(untilStr).getTime();
  }, [core.siteSettings]);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLoginRoute = location.pathname === '/login';

  return (
    <RouteErrorBoundary>
      <div className="min-h-screen bg-[#0a0a0a]">
        <NoiseOverlay />
        <BollywoodThemeOverlay />
        <AudioController />
        
        {msg && isAdminOrOwner && (
          <div className="fixed top-0 inset-x-0 z-[10000] bg-rose-600/95 text-white text-sm px-4 py-2 flex justify-between">
            <span>{msg}</span>
            <button onClick={() => setMsg(null)} className="ml-4 underline">Dismiss</button>
          </div>
        )}
        
        <ConnectionStatusBanner />
        <NotificationsPanel />
        <React.Suspense fallback={<div className="h-20 bg-[#0a0a0a]" />}>
          <Navbar />
        </React.Suspense>

        
        <main id="main-content" className="relative">
          {gateActive && !isAdminRoute && !isLoginRoute && !isAdminOrOwner ? (
            <React.Suspense fallback={<div className="min-h-screen" />}><ComingSoon /></React.Suspense>
          ) : (
            <Outlet />
          )}
        </main>
        
        <React.Suspense fallback={<div className="h-64 bg-[#0a0a0a]" />}>
          <Footer />
        </React.Suspense>

        {splashVisible && (
          <ThemeAwareLoader 
            loading={combinedLoading}
            stage={stage}
            onComplete={() => setSplashVisible(false)}
            logoUrl={logoUrl} 
          />
        )}
      </div>
    </RouteErrorBoundary>
  );
};

const ThemeAwareLoader: React.FC<any> = (props) => {
  const { theme } = useTheme();
  return theme === 'bollywood' ? (
    <BollywoodLoader {...props} />
  ) : (
    <Preloader {...props} />
  );
};

const InnerRouter: React.FC = () => {
  const router = useMemo(() => createBrowserRouter([
    {
      path: '/',
      element: <AppShell />,
      children: [
        { index: true, element: <React.Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}><Home /></React.Suspense> },
        { path: 'events', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><LockedPageGuard pageKey="events"><Events /></LockedPageGuard></React.Suspense> },
        { path: 'schedule', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><LockedPageGuard pageKey="schedule"><Schedule /></LockedPageGuard></React.Suspense> },
        { path: 'gallery', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><LockedPageGuard pageKey="gallery"><Gallery /></LockedPageGuard></React.Suspense> },
        { path: 'home-bound', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><LockedPageGuard pageKey="home-bound"><HomeBound /></LockedPageGuard></React.Suspense> },
        { path: 'rico-family', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><LockedPageGuard pageKey="rico-family"><RicoFamily /></LockedPageGuard></React.Suspense> },
        { path: 'sponsors', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><LockedPageGuard pageKey="sponsors"><Sponsors /></LockedPageGuard></React.Suspense> },
        { path: 'sports', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><LockedPageGuard pageKey="sports"><Sports /></LockedPageGuard></React.Suspense> },
        { path: 'login', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><Login /></React.Suspense> },
        { path: 'student/login', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><StudentLogin /></React.Suspense> },
        { 
          path: 'dashboard', 
          element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><DashboardLayout /></React.Suspense>,
          children: [
            { index: true, element: <React.Suspense fallback={null}><DashboardOverview /></React.Suspense> },
            { path: 'announcements', element: <React.Suspense fallback={null}><DashboardAnnouncements /></React.Suspense> },
            { path: 'messages', element: <React.Suspense fallback={null}><DashboardMessages /></React.Suspense> },
            { path: 'passes', element: <React.Suspense fallback={null}><DashboardPasses /></React.Suspense> },
            { path: 'events', element: <React.Suspense fallback={null}><DashboardEvents /></React.Suspense> },
            { path: 'sports', element: <React.Suspense fallback={null}><DashboardSports /></React.Suspense> },
            { path: 'vibes', element: <React.Suspense fallback={null}><DashboardVibes /></React.Suspense> },
            { path: 'socialfeed', element: <React.Suspense fallback={null}><DashboardSocialFeed /></React.Suspense> },
            { path: 'community', element: <React.Suspense fallback={null}><DashboardCommunity /></React.Suspense> },
            { path: 'settings', element: <React.Suspense fallback={null}><DashboardSettings /></React.Suspense> },
          ]
        },
        { path: 'coordinator', element: <React.Suspense fallback={null}><CoordinatorLogin /></React.Suspense> },
        { path: 'coordinator/dashboard', element: <React.Suspense fallback={null}><CoordinatorDashboard /></React.Suspense> },
        { path: 'admin/*', element: <React.Suspense fallback={null}><AdminDashboard /></React.Suspense> },
        { path: 'sports-admin', element: <React.Suspense fallback={null}><SportsLogin /></React.Suspense> },
        { path: 'security-login', element: <React.Suspense fallback={null}><SecurityLogin /></React.Suspense> },
        { path: 'security-dashboard', element: <React.Suspense fallback={null}><SecurityDashboard /></React.Suspense> },
        { path: 'health', element: <React.Suspense fallback={null}><Home /></React.Suspense> },
        { path: 'master-node-access', element: <React.Suspense fallback={null}><MasterGate /></React.Suspense> },
        { path: 'forgot-password', element: <React.Suspense fallback={null}><ForgotPassword /></React.Suspense> },
        { path: 'student/forgot-password', element: <React.Suspense fallback={null}><StudentForgotPassword /></React.Suspense> },
        { path: 'student/reset-password', element: <React.Suspense fallback={null}><StudentResetPassword /></React.Suspense> },
        { path: 'reset-password', element: <React.Suspense fallback={null}><ResetPassword /></React.Suspense> },
        { path: '*', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><NotFound /></React.Suspense> }
      ]
    },
    { path: 'council', element: <React.Suspense fallback={null}><CouncilLogin /></React.Suspense> },
    { path: 'council-dashboard', element: <React.Suspense fallback={null}><CouncilDashboard /></React.Suspense> }
  ], {
    future: { v7_startTransition: true, v7_relativeSplatPath: true }
  } as any), []);

  return <RouterProvider router={router} />;
};

export default function App() {
  // Quick preview override: if the URL contains ?theme=bollywood or ?theme=cyberpunk
  // we force the body class so you can preview the landing page without changing site settings.
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const forced = params.get('theme');
      if (forced === 'bollywood') {
        document.body.classList.add('theme-bollywood');
        document.body.classList.remove('theme-cyberpunk');
      } else if (forced === 'cyberpunk') {
        document.body.classList.add('theme-cyberpunk');
        document.body.classList.remove('theme-bollywood');
      }
    } catch (e) {
      // ignore if window is unavailable
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <StudentAuthProvider>
          <CombinedDataProvider>
            <DataProvider>

              <ToastProvider>
                <SavingProgressProvider>
                  <HelmetProvider>
                    <ThemeProvider>
                    <OfflineIndicator />
                    <SmoothScroll>
                      <InnerRouter />
                    </SmoothScroll>
                    </ThemeProvider>
                  </HelmetProvider>
                </SavingProgressProvider>
              </ToastProvider>
            </DataProvider>
          </CombinedDataProvider>
        </StudentAuthProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}