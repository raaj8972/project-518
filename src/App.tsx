import { createBrowserRouter, RouterProvider, Outlet, useLocation } from 'react-router-dom';
import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home'; // keep Home eager for fast first paint
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { useData } from './context/DataContext';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ToastProvider';
import { SavingProgressProvider } from './context/SavingProgressContext';
import { ConnectionStatusBanner } from './components/ConnectionStatusBanner';
import { NotificationsPanel } from './components/NotificationsPanel';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineIndicator from './components/OfflineIndicator';
import { CustomCursor } from './components/ui/CustomCursor';
import { NoiseOverlay } from './components/ui/NoiseOverlay';
import { AudioController } from './components/ui/AudioController';
import { Preloader } from './components/ui/Preloader';
import { SmoothScroll } from './components/ui/SmoothScroll';
import { getCachedLogoUrl } from './utils/preloadBrand';


// Convert heavy/non-critical routes to lazy-loaded to keep the initial bundle small
const Events = React.lazy(() => import('./pages/Events').then(m => ({ default: (m as any).Events }))) as unknown as React.ComponentType<any>;
const Schedule = React.lazy(() => import('./pages/Schedule').then(m => ({ default: (m as any).Schedule }))) as unknown as React.ComponentType<any>;
const Gallery = React.lazy(() => import('./pages/Gallery').then(m => ({ default: (m as any).Gallery }))) as unknown as React.ComponentType<any>;
const HomeBound = React.lazy(() => import('./pages/HomeBound').then(m => ({ default: (m as any).HomeBound }))) as unknown as React.ComponentType<any>;
const RicoFamily = React.lazy(() => import('./pages/RicoFamily').then(m => ({ default: (m as any).RicoFamily }))) as unknown as React.ComponentType<any>;
const Sponsors = React.lazy(() => import('./pages/Sponsors').then(m => ({ default: (m as any).Sponsors }))) as unknown as React.ComponentType<any>;
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: (m as any).Login }))) as unknown as React.ComponentType<any>;
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard').then(m => ({ default: (m as any).AdminDashboard }))) as unknown as React.ComponentType<any>;
const CoordinatorLogin = React.lazy(() => import('./pages/CoordinatorLogin').then(m => ({ default: (m as any).CoordinatorLogin }))) as unknown as React.ComponentType<any>;
const CoordinatorDashboard = React.lazy(() => import('./components/coordinator/CoordinatorDashboard').then(m => ({ default: (m as any).CoordinatorDashboard }))) as unknown as React.ComponentType<any>;
const CouncilLogin = React.lazy(() => import('./pages/CouncilLogin').then(m => ({ default: (m as any).default }))) as unknown as React.ComponentType<any>;
const CouncilDashboard = React.lazy(() => import('./pages/CouncilDashboard').then(m => ({ default: (m as any).default }))) as unknown as React.ComponentType<any>;


// Security System Pages
const SecurityLogin = React.lazy(() => import('./pages/SecurityLogin').then(m => ({ default: (m as any).default }))) as unknown as React.ComponentType<any>;
const SecurityDashboard = React.lazy(() => import('./pages/SecurityDashboard').then(m => ({ default: (m as any).default }))) as unknown as React.ComponentType<any>;
const PassRegistration = React.lazy(() => import('./pages/PassRegistration').then(m => ({ default: (m as any).default }))) as unknown as React.ComponentType<any>;
const PassDownload = React.lazy(() => import('./pages/PassDownload').then(m => ({ default: (m as any).default }))) as unknown as React.ComponentType<any>;

const ComingSoon = React.lazy(() => import('./pages/ComingSoon').then(m => ({ default: (m as any).ComingSoon }))) as unknown as React.ComponentType<any>;
const NotFound = React.lazy(() => import('./pages/NotFound').then(m => ({ default: (m as any).NotFound }))) as unknown as React.ComponentType<any>;
const MasterGate = React.lazy(() => import('./pages/MasterGate').then(m => ({ default: (m as any).MasterGate }))) as unknown as React.ComponentType<any>;

// Minimal Error Boundary to prevent a blank screen if a lazy route fails
class RouteErrorBoundary extends React.Component<React.PropsWithChildren<{}>, { hasError: boolean; message?: string; isChunkError?: boolean }> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    const msg = error?.message || 'Something went wrong.';
    const isChunkError = 
      msg.includes('Failed to fetch dynamically imported module') || 
      msg.includes('Importing a module script failed') ||
      msg.toLowerCase().includes('network');
    
    return { hasError: true, message: msg, isChunkError };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('Route error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      // If it looks like a network/chunk error, show a friendly Offline UI
      if (this.state.isChunkError || !navigator.onLine) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">You're Offline</h2>
            <p className="text-gray-600 mb-6 max-w-md">
              We couldn't load this page because of a network issue. Please check your internet connection.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        );
      }
      return <div className="flex items-center justify-center py-24 text-red-600">{this.state.message}</div>;
    }
    return this.props.children as React.ReactElement;
  }
}

// Capture non-React errors (e.g., unhandled rejections) to avoid silent blank screen
const GlobalErrorBanner: React.FC = () => {
  const [msg, setMsg] = React.useState<string | null>(null);
  const { adminUsers } = useData() as any;
  const { user } = useAuth();

  // Only show global runtime error banner to admin/owner users
  const isAdminOrOwner = React.useMemo(() => {
    try {
      const uid = user?.id;
      if (!uid || !Array.isArray(adminUsers)) return false;
      return !!adminUsers.find((a: any) => a.user_id === uid && (a.role === 'owner' || a.role === 'admin' || a.is_primary));
    } catch {
      return false;
    }
  }, [user, adminUsers]);

  // Prefetch admin chunk in the background for admin users to make the
  // admin dashboard feel snappy when they navigate there. We do this on
  // idle and avoid prefetching on save-data or very slow connections.
  React.useEffect(() => {
    // Prioritize preloading Events and RicoFamily pages for all users
    // to ensure smooth navigation after the splash screen.
    const prefetchPublic = async () => {
      try {
        // Events is high priority
        await import('./pages/Events');
        // RicoFamily is next
        await import('./pages/RicoFamily');
        // Other public pages
        await import('./pages/Schedule');
        await import('./pages/Gallery');
        await import('./pages/Sponsors');

        // PREFETCH ALL LOGIN PAGES
        await import('./pages/Login');
        await import('./pages/CoordinatorLogin');
        await import('./pages/CouncilLogin');
        await import('./pages/SecurityLogin');
      } catch {}
    };
    // Start prefetching public pages immediately (low priority compared to critical render)
    if (typeof (window as any).requestIdleCallback === 'function') {
      (window as any).requestIdleCallback(() => prefetchPublic(), { timeout: 2000 });
    } else {
      setTimeout(prefetchPublic, 500);
    }

    if (!isAdminOrOwner) return;
    try {
      const conn = (navigator as any).connection;
      if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return; // avoid heavy background download
    } catch {}

    const doPrefetch = () => {
      // dynamic import of the admin page will warm the admin chunk
      import('./pages/AdminDashboard').catch(() => { /* ignore prefetch errors */ });
    };

    if (typeof (window as any).requestIdleCallback === 'function') {
      const id = (window as any).requestIdleCallback(() => doPrefetch(), { timeout: 4000 });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    const t = setTimeout(doPrefetch, 3000);
    return () => clearTimeout(t);
  }, [isAdminOrOwner]);

  React.useEffect(() => {
    const onErr = (e: ErrorEvent) => {
      setMsg(e.message || 'A runtime error occurred. Check console.');
      console.error('Global error:', e);
    };
    const onRej = (e: PromiseRejectionEvent) => {
      const reason = (e.reason && (e.reason.message || String(e.reason))) || 'Unhandled promise rejection';
      
      // Ignore benign "The operation was aborted" errors (common from cancelling video.play())
      if (reason.includes('The operation was aborted') || reason.includes('AbortError')) {
        return;
      }

      console.error('Unhandled rejection:', e.reason);
      // Surface a clearer message for invalid/expired refresh tokens so admins know to re-login
      const low = String(reason || '').toLowerCase();
      if (low.includes('invalid refresh token') || low.includes('refresh token not found') || low.includes('refresh token')) {
        setMsg('Authentication error: your session is no longer valid. Please sign out and sign in again.');
      } else {
        setMsg(reason);
      }

      // Auto-recover from stale HTML vs new asset chunk mismatch:
      // If a dynamic import or chunk load fails (common after deploys), reload once with a cache-busting param.
      try {
        const text = String(reason || '').toLowerCase();
        const isChunkErr =
          text.includes('failed to fetch dynamically imported module') ||
          text.includes('chunkloaderror') ||
          text.includes('loading chunk') ||
          text.includes('import()') ||
          /assets\/.*\.js/.test(text);
        const already = sessionStorage.getItem('chunk-reload');
        if (isChunkErr && already !== '1') {
          // Only reload if we are ONLINE. If offline, the RouteErrorBoundary will handle it.
          // Reloading while offline just kills the app.
          if (navigator.onLine) {
            sessionStorage.setItem('chunk-reload', '1');
            const url = new URL(window.location.href);
            url.searchParams.set('v', String(Date.now()));
            window.location.replace(url.toString());
          }
        }
      } catch {}
    };
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    // Capture resource load failures (images/fonts/scripts/styles) which
    // often don't surface as ErrorEvent with a message. We use capture phase
    // so we can inspect the target element which failed to load.
    const onResourceError = (ev: Event) => {
      try {
        const t = ev.target as any;
        if (!t) return;
        // image, script, link, video, audio
        const url = t?.src || t?.href;
        if (!url) return;
        // Log a friendly, discoverable message; only show to admins via banner
        console.warn('Resource failed to load:', url, t);
        if (isAdminOrOwner) setMsg(`Resource failed to load: ${url}`);
      } catch (e) { /* ignore */ }
    };
    window.addEventListener('error', onResourceError, true);
    return () => {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
      window.removeEventListener('error', onResourceError, true);
    };
  }, []);

  if (!msg) return null;
  if (!isAdminOrOwner) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[10000] bg-rose-600/95 backdrop-blur text-white text-sm px-4 py-2 shadow">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <span>{msg}</span>
        <button onClick={() => setMsg(null)} className="ml-4 bg-white/20 hover:bg-white/30 rounded px-2 py-1 text-xs">Dismiss</button>
      </div>
    </div>
  );
};

function App() {
  // Inner shell to use routing hooks (must be inside <Router>)
  const AppShell: React.FC = () => {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin');
    const isLoginRoute = location.pathname === '/login';
    const isSecurityRoute = location.pathname.startsWith('/security-');
    const isHealthRoute = location.pathname === '/health';
    const { user } = useAuth();
    const { siteSettings, loading, adminUsers, homepageSettings } = useData();

    // Seed logo URL from localStorage cache immediately (zero latency),
    // then update once homepageSettings arrives from Supabase.
    const [logoUrl, setLogoUrl] = React.useState<string | undefined>(
      getCachedLogoUrl() ?? undefined
    );
    React.useEffect(() => {
      const fresh = (homepageSettings as any)?.brand_logo_url;
      if (fresh) setLogoUrl(fresh);
    }, [homepageSettings]);
    
    // Determine if current user is an admin/owner to bypass maintenance
    const isAdminOrOwner = React.useMemo(() => {
      try {
        const uid = user?.id;
        if (!uid || !Array.isArray(adminUsers)) return false;
        // Check for super admin metadata or admin table entry
        if (user?.user_metadata?.is_super_admin) return true;
        return !!adminUsers.find((a: any) => a.user_id === uid && (a.role === 'owner' || a.role === 'admin' || a.is_primary));
      } catch {
        return false;
      }
    }, [user, adminUsers]);

    const [splashVisible, setSplashVisible] = React.useState<boolean>(true);

    // Render the app shell normally but render the splash as a fixed overlay on top
    // so site chrome (navbar) remains visible above it. We intentionally avoid SVGs
    // and use CSS + simple HTML for the animated neon spinner and text.
    // Tick so time-based Coming Soon auto-lifts when time passes
    const [now, setNow] = React.useState<number>(Date.now());
    React.useEffect(() => {
      const hasTimer = !!siteSettings?.coming_soon_enabled && !!siteSettings?.coming_soon_until;
      if (!hasTimer) return;
      const id = setInterval(() => setNow(Date.now()), 30_000);
      return () => clearInterval(id);
    }, [siteSettings?.coming_soon_enabled, siteSettings?.coming_soon_until]);
    const gateActive = React.useMemo(() => {
      const closed = !!siteSettings?.site_closed;
      if (closed) return true;
      if (!siteSettings?.coming_soon_enabled) return false;
      const untilStr = siteSettings?.coming_soon_until as any;
      if (!untilStr) return true; // enabled with no end time => gate stays on
      const untilMs = new Date(untilStr).getTime();
      if (Number.isNaN(untilMs)) return true; // malformed date => be safe and gate
      return now < untilMs;
    }, [siteSettings?.site_closed, siteSettings?.coming_soon_enabled, siteSettings?.coming_soon_until, now]);

    return (
      <RouteErrorBoundary>
        <div className="min-h-screen bg-[#0a0a0a]">
          <NoiseOverlay />
          <CustomCursor />
          <AudioController />
          <GlobalErrorBanner />
          <ConnectionStatusBanner />
          {/* If site is gated for maintenance/coming soon and not an allowed route, show the Coming Soon page */}
          {/* Admin Bypass: If user is admin/owner, they can access site even if gated */}
          {gateActive && !isAdminRoute && !isLoginRoute && !isHealthRoute && !isAdminOrOwner ? (
            <ComingSoon />
          ) : (
            <>
              {/* Public notifications panel (viewer-facing). DataContext will filter admin_only rows for non-admins. */}
              {!isAdminRoute && !isSecurityRoute && <NotificationsPanel />}
              {/* Hide public site chrome on admin and security pages to avoid overlap */}
              {!isAdminRoute && !isSecurityRoute && !location.pathname.startsWith('/coordinator/dashboard') && <div className="relative z-50"><Navbar /></div>}
                  <Outlet />
              {!isAdminRoute && !isSecurityRoute && <Footer />}
              {/* Splash overlay (non-SVG cyberpunk style). It sits behind the Navbar (Navbar wrapped with z-50 above).
                  We use inline styles for the conic gradient spinner mask so we avoid SVG altogether. */}
              {splashVisible && <Preloader loading={loading} onComplete={() => setSplashVisible(false)} logoUrl={logoUrl} />}
            </>
          )}
        </div>
      </RouteErrorBoundary>
    );
  };

  // Router is created inside an inner component so route elements are instantiated
  // after providers (DataProvider) are mounted. This avoids calling hooks like
  // useData() while rendering outside of the provider tree.
  const InnerRouter: React.FC = () => {
    const router = React.useMemo(() => createBrowserRouter(
      [
        {
          path: '/',
          element: <AppShell />,
          children: [
            { index: true, element: <Home /> },
            { path: 'events', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><Events /></React.Suspense> },
            { path: 'schedule', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><Schedule /></React.Suspense> },
            { path: 'gallery', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><Gallery /></React.Suspense> },
            { path: 'home-bound', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><HomeBound /></React.Suspense> },
            { path: 'rico-family', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><RicoFamily /></React.Suspense> },
            { path: 'sponsors', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><Sponsors /></React.Suspense> },
            { path: 'login', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><Login /></React.Suspense> },
            { path: 'coordinator', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><CoordinatorLogin /></React.Suspense> },
            { path: 'coordinator/dashboard', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><CoordinatorDashboard /></React.Suspense> },
            { path: 'admin', element: <React.Suspense fallback={<div className="p-8">Loading admin…</div>}><AdminDashboard /></React.Suspense> },
            { path: 'security-login', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><SecurityLogin /></React.Suspense> },
            { path: 'security-dashboard', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><SecurityDashboard /></React.Suspense> },
            { path: 'pass-registration', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><PassRegistration /></React.Suspense> },
            { path: 'pass-download', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><PassDownload /></React.Suspense> },
            { path: 'health', element: <Home /> },
            { path: 'master-node-access', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><MasterGate /></React.Suspense> },
            { path: '*', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><NotFound /></React.Suspense> }
          ]
        },
        // Council Dashboard - Standalone (No AppShell/Navbar)
        { path: 'council', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><CouncilLogin /></React.Suspense> },
        { path: 'council-dashboard', element: <React.Suspense fallback={<div className="p-8">Loading…</div>}><CouncilDashboard /></React.Suspense> }
      ],
      ({
        future: {
          v7_startTransition: true,
          // keep other v7 future flags if desired
          v7_relativeSplatPath: true
        }
      } as any)
    ), []);

    return <RouterProvider router={router} />;
  };

  return (
    <ErrorBoundary>
      <AuthProvider>
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
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;