import { createBrowserRouter, RouterProvider, Outlet, useLocation } from 'react-router-dom';
import React from 'react';
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

// Convert heavy/non-critical routes to lazy-loaded to keep the initial bundle small
const Events = React.lazy(() => import('./pages/Events').then(m => ({ default: (m as any).Events }))) as unknown as React.ComponentType<any>;
const Schedule = React.lazy(() => import('./pages/Schedule').then(m => ({ default: (m as any).Schedule }))) as unknown as React.ComponentType<any>;
const Gallery = React.lazy(() => import('./pages/Gallery').then(m => ({ default: (m as any).Gallery }))) as unknown as React.ComponentType<any>;
const HomeBound = React.lazy(() => import('./pages/HomeBound').then(m => ({ default: (m as any).HomeBound }))) as unknown as React.ComponentType<any>;
const RicoFamily = React.lazy(() => import('./pages/RicoFamily').then(m => ({ default: (m as any).RicoFamily }))) as unknown as React.ComponentType<any>;
const Sponsors = React.lazy(() => import('./pages/Sponsors').then(m => ({ default: (m as any).Sponsors }))) as unknown as React.ComponentType<any>;
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: (m as any).Login }))) as unknown as React.ComponentType<any>;
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard').then(m => ({ default: (m as any).AdminDashboard }))) as unknown as React.ComponentType<any>;
const ComingSoon = React.lazy(() => import('./pages/ComingSoon').then(m => ({ default: (m as any).ComingSoon }))) as unknown as React.ComponentType<any>;

// Minimal Error Boundary to prevent a blank screen if a lazy route fails
class RouteErrorBoundary extends React.Component<React.PropsWithChildren<{}>, { hasError: boolean; message?: string }>{
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: error?.message || 'Something went wrong.' };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('Route error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
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
      setMsg(reason);
      console.error('Unhandled rejection:', e.reason);

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
          sessionStorage.setItem('chunk-reload', '1');
          const url = new URL(window.location.href);
          url.searchParams.set('v', String(Date.now()));
          window.location.replace(url.toString());
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
    const isHealthRoute = location.pathname === '/health';
    const { siteSettings, loading } = useData();
  // adminUsers and user are not needed here after notification gating logic changed
    // Controlled splash: keep the splash visible at least MIN_SPLASH_MS and fade out
    // over FADE_MS when loading becomes false. This prevents an abrupt switch to
    // the Home UI when the data layer finishes very quickly.
    const MIN_SPLASH_MS = 700; // minimum time to show splash (ms)
    const FADE_MS = 300; // fade-out duration (ms)
    const splashStartRef = React.useRef<number | null>(null);
    const [splashVisible, setSplashVisible] = React.useState<boolean>(loading);
    const [splashHiding, setSplashHiding] = React.useState<boolean>(false);

    React.useEffect(() => {
      if (loading) {
        splashStartRef.current = Date.now();
        setSplashVisible(true);
        setSplashHiding(false);
        return;
      }
      // loading flipped to false -> ensure minimum display and then fade
      const started = splashStartRef.current || Date.now();
      const elapsed = Date.now() - started;
      const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
      const t = setTimeout(() => {
        setSplashHiding(true);
        const t2 = setTimeout(() => setSplashVisible(false), FADE_MS);
        return () => clearTimeout(t2);
      }, remaining);
      return () => clearTimeout(t);
    }, [loading]);

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
        <div className="min-h-screen bg-white">
          {/* particles cursor removed */}
          <GlobalErrorBanner />
          <ConnectionStatusBanner />
          {/* If site is gated for maintenance/coming soon and not an allowed route, show the Coming Soon page */}
          {gateActive && !isAdminRoute && !isLoginRoute && !isHealthRoute ? (
            <ComingSoon />
          ) : (
            <>
              {/* Public notifications panel (viewer-facing). DataContext will filter admin_only rows for non-admins. */}
              {!isAdminRoute && <NotificationsPanel />}
              {/* Hide public site chrome on admin pages to avoid overlap */}
                  {!isAdminRoute && <div className="relative z-50"><Navbar /></div>}
                  <Outlet />
              {!isAdminRoute && <Footer />}
              {/* Splash overlay (non-SVG cyberpunk style). It sits behind the Navbar (Navbar wrapped with z-50 above).
                  We use inline styles for the conic gradient spinner mask so we avoid SVG altogether. */}
              {splashVisible && (
                <div
                  aria-hidden={!loading}
                  style={{ transition: `opacity ${FADE_MS}ms ease` , opacity: splashHiding ? 0 : 1 }}
                  className="fixed inset-0 z-40 flex items-center justify-center bg-black/95 pointer-events-none"
                >
                  <div className="text-center select-none px-4 pointer-events-auto" style={{ transform: 'translateY(48px)' }}>
                    <div
                      className="mx-auto mb-6"
                      style={{ width: 100, height: 100 }}
                    >
                      {/* Conic-gradient ring spinner with a hollow center (mask) */}
                      <div
                        className="rounded-full mx-auto"
                        style={{
                          width: '100%',
                          height: '100%',
                          animation: 'spin 1s linear infinite',
                          // Create a visible top/upper-arc by making the rest transparent
                          background: 'conic-gradient(from -110deg, #00f8ff 0deg 110deg, transparent 110deg 360deg)',
                          filter: 'drop-shadow(0 0 18px rgba(0,248,255,0.28)) drop-shadow(0 0 22px rgba(255,63,193,0.14))'
                        }}
                      >
                        <div style={{
                          width: '60%',
                          height: '60%',
                          margin: '20% auto',
                          borderRadius: '50%',
                          background: 'radial-gradient(circle at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.95) 100%)',
                          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.7)'
                        }} />
                      </div>
                    </div>

                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-wider"
                      style={{
                        background: 'linear-gradient(90deg,#9bd1ff,#e86cff,#9b7bff)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        color: 'transparent',
                        textShadow: '0 2px 12px rgba(155,123,255,0.25)'
                      }}
                    >
                      LOADING RICORRENZA
                    </h2>
                    <div className="mt-2 text-sm font-mono text-cyan-300">Initializing experience...</div>
                  </div>
                </div>
              )}
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
            { path: 'admin', element: <React.Suspense fallback={<div className="p-8">Loading admin…</div>}><AdminDashboard /></React.Suspense> },
            { path: 'health', element: <Home /> },
            { path: '*', element: <Home /> }
          ]
        }
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
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <SavingProgressProvider>
            <InnerRouter />
          </SavingProgressProvider>
        </ToastProvider>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;