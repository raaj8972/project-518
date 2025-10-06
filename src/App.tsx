import { createBrowserRouter, RouterProvider, Outlet, useLocation } from 'react-router-dom';
import React from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home'; // keep Home eager for fast first paint
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { useData } from './context/DataContext';
import { ToastProvider } from './components/ToastProvider';
import { SavingProgressProvider } from './context/SavingProgressContext';
import { ConnectionStatusBanner } from './components/ConnectionStatusBanner';
import { NotificationsPanel } from './components/NotificationsPanel';

// Eager imports for maximum reliability (avoids lazy chunk loading issues)
import { Events } from './pages/Events';
import { Schedule } from './pages/Schedule';
import { Gallery } from './pages/Gallery';
import { HomeBound } from './pages/HomeBound';
import { RicoFamily } from './pages/RicoFamily';
import { Sponsors } from './pages/Sponsors';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { ComingSoon } from './pages/ComingSoon';

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
  React.useEffect(() => {
    const onErr = (e: ErrorEvent) => {
      setMsg(e.message || 'A runtime error occurred. Check console.');
      console.error('Global error:', e);
    };
    const onRej = (e: PromiseRejectionEvent) => {
      const reason = (e.reason && (e.reason.message || String(e.reason))) || 'Unhandled promise rejection';
      setMsg(reason);
      console.error('Unhandled rejection:', e.reason);
    };
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    return () => {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
    };
  }, []);
  if (!msg) return null;
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
    const { siteSettings } = useData();
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
              {/* Public notifications panel (viewer-facing) */}
              {!isAdminRoute && <NotificationsPanel />}
              {/* Hide public site chrome on admin pages to avoid overlap */}
                  {!isAdminRoute && <Navbar />}
                  <Outlet />
              {!isAdminRoute && <Footer />}
            </>
          )}
        </div>
      </RouteErrorBoundary>
    );
  };

  // Build a router and opt-in to the v7_relativeSplatPath future early to silence warnings
  const router = createBrowserRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <Home /> },
          { path: 'events', element: <Events /> },
          { path: 'schedule', element: <Schedule /> },
          { path: 'gallery', element: <Gallery /> },
          { path: 'home-bound', element: <HomeBound /> },
          { path: 'rico-family', element: <RicoFamily /> },
          { path: 'sponsors', element: <Sponsors /> },
          { path: 'login', element: <Login /> },
          { path: 'admin', element: <AdminDashboard /> },
          { path: 'health', element: <Home /> },
          { path: '*', element: <Home /> }
        ]
      }
    ],
    { future: { v7_relativeSplatPath: true } }
  );

  return (
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <SavingProgressProvider>
            <RouterProvider router={router} />
          </SavingProgressProvider>
        </ToastProvider>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;