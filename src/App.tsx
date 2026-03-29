import React, { useMemo, useState, useEffect, lazy, Component, PropsWithChildren, ReactElement } from 'react';
console.log('[App.tsx] Module loaded');
import { createBrowserRouter, RouterProvider, Outlet, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StudentAuthProvider } from './context/StudentAuthContext';
import { DataProvider, useData } from './context/DataContext';
import { ToastProvider } from './components/ToastProvider';
import { SavingProgressProvider } from './context/SavingProgressContext';
import { ConnectionStatusBanner } from './components/ConnectionStatusBanner';
import { NotificationsPanel } from './components/NotificationsPanel';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineIndicator from './components/OfflineIndicator';
import { NoiseOverlay } from './components/ui/NoiseOverlay';
import { AudioController } from './components/ui/AudioController';
import { Preloader } from './components/ui/Preloader';
import { SmoothScroll } from './components/ui/SmoothScroll';
import { getCachedLogoUrl } from './utils/preloadBrand';
import { useEventsData } from './context/EventsContext';
import { usePersonnelData } from './context/PersonnelContext';
import { useGalleryData } from './context/GalleryContext';
import { useManagementData } from './context/ManagementContext';

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
class RouteErrorBoundary extends Component<PropsWithChildren<{}>, { hasError: boolean; message?: string; isChunkError?: boolean }> {
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
  const events = useEventsData();
  const personnel = usePersonnelData();
  const gallery = useGalleryData();
  const management = useManagementData();
  const [msg, setMsg] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(getCachedLogoUrl() ?? undefined);
  const [splashVisible, setSplashVisible] = useState(true);

  // Decoupled massive contexts from the root blocking loader to improve Time to Interactive.
  // Other contexts will now asynchronously populate without freezing the entire site.
  const combinedLoading = core.loading;

  const isAdminOrOwner = useMemo(() => {
    try {
      const uid = user?.id;
      if (!uid || !Array.isArray(core.adminUsers)) return false;
      if (user?.user_metadata?.is_super_admin) return true;
      return !!core.adminUsers.find((a: any) => a.user_id === uid && (a.role === 'owner' || a.role === 'admin' || a.is_primary));
    } catch { return false; }
  }, [user, core.adminUsers]);

  // Loading Monitor & Failsafe
  useEffect(() => {
    let timer: any;
    const interval = setInterval(() => {
      if (splashVisible) {
        console.log('[Loading Monitor]', {
          core: core.loading, events: events.loading,
          personnel: personnel.loading, gallery: gallery.loading,
          management: management.loading, blockingUI: combinedLoading
        });
      }
    }, 2000);

    timer = setTimeout(() => {
      if (splashVisible) {
        console.warn('[Failsafe] Forcing transition...');
        setSplashVisible(false);
      }
    }, 12000);

    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [splashVisible, core.loading, events.loading, personnel.loading, gallery.loading, management.loading, combinedLoading]);

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
        <AudioController />
        
        {msg && isAdminOrOwner && (
          <div className="fixed top-0 inset-x-0 z-[10000] bg-rose-600/95 text-white text-sm px-4 py-2 flex justify-between">
            <span>{msg}</span>
            <button onClick={() => setMsg(null)} className="ml-4 underline">Dismiss</button>
          </div>
        )}
        
        <ConnectionStatusBanner />
        <NotificationsPanel />
        <Navbar />
        
        <main id="main-content" className="relative">
          {gateActive && !isAdminRoute && !isLoginRoute && !isAdminOrOwner ? (
            <React.Suspense fallback={<div className="min-h-screen" />}><ComingSoon /></React.Suspense>
          ) : (
            <Outlet />
          )}
        </main>
        
        <Footer />
        
        {splashVisible && (
          <Preloader 
            loading={combinedLoading}
            onComplete={() => setSplashVisible(false)}
            logoUrl={logoUrl} 
          />
        )}
      </div>
    </RouteErrorBoundary>
  );
};

const InnerRouter: React.FC = () => {
  const router = useMemo(() => createBrowserRouter([
    {
      path: '/',
      element: <AppShell />,
      children: [
        { index: true, element: <React.Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}><Home /></React.Suspense> },
        { path: 'events', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><Events /></React.Suspense> },
        { path: 'schedule', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><Schedule /></React.Suspense> },
        { path: 'gallery', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><Gallery /></React.Suspense> },
        { path: 'home-bound', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><HomeBound /></React.Suspense> },
        { path: 'rico-family', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><RicoFamily /></React.Suspense> },
        { path: 'sponsors', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><Sponsors /></React.Suspense> },
        { path: 'sports', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><Sports /></React.Suspense> },
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
  return (
    <ErrorBoundary>
      <AuthProvider>
        <StudentAuthProvider>
          <DataProvider>
            <ToastProvider>
              <SavingProgressProvider>
                <HelmetProvider>
                  <OfflineIndicator />
                  <SmoothScroll>
                    <InnerRouter />
                  </SmoothScroll>
                </HelmetProvider>
              </SavingProgressProvider>
            </ToastProvider>
          </DataProvider>
        </StudentAuthProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}