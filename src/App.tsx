import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import React from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home'; // keep Home eager for fast first paint
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './components/ToastProvider';
import { SavingProgressProvider } from './context/SavingProgressContext';
import { ConnectionStatusBanner } from './components/ConnectionStatusBanner';

// Eager imports for maximum reliability (avoids lazy chunk loading issues)
import { Events } from './pages/Events';
import { Schedule } from './pages/Schedule';
import { Gallery } from './pages/Gallery';
import { HomeBound } from './pages/HomeBound';
import { RicoFamily } from './pages/RicoFamily';
import { Sponsors } from './pages/Sponsors';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { ParticlesCursor } from './components/ParticlesCursor';
import { ComingSoon } from './pages/ComingSoon';
import { useData } from './context/DataContext';

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
    const safeRender = (MaybeComponent: any, label: string) => {
      try {
        let C = MaybeComponent;
        if (!C) { console.error(`[App] Component '${label}' undefined at render.`); return null; }
        if (typeof C === 'object' && C && 'default' in C && typeof (C as any).default === 'function') {
          C = (C as any).default;
        }
        const ok = typeof C === 'function' || (C && typeof C === 'object' && ((C as any).$$typeof || (C as any).render));
        if (!ok) { console.error(`[App] Component '${label}' invalid type:`, typeof C, C); return null; }
        return <C />;
      } catch (e) {
        console.error(`[App] Failed to render '${label}':`, e);
        return null;
      }
    };
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin');
    // Allow /login and /login/ (trailing slash) so Coming Soon never blocks login access
    const isLoginRoute = location.pathname === '/login' || location.pathname.startsWith('/login/');
    const { siteSettings } = useData();
    // Ticking clock to re-evaluate Coming Soon routing in real time
    const [nowTs, setNowTs] = React.useState<number>(Date.now());
    React.useEffect(() => {
      if (isAdminRoute || isLoginRoute) return; // no need to tick on admin/login
      let id: number | null = null;
      id = window.setInterval(() => setNowTs(Date.now()), 1000);
      return () => { if (id) window.clearInterval(id); };
    }, [isAdminRoute, isLoginRoute]);
    const hardClosed = !!siteSettings?.site_closed;
    const soonEnabled = !!siteSettings?.coming_soon_enabled;
    const untilTs = siteSettings?.coming_soon_until ? new Date(siteSettings.coming_soon_until).getTime() : null;
    // New rule: if Coming Soon is enabled and a timer exists, we honor the timer and go live when it ends,
    // even if site_closed is still true. Hard close only blocks when no timer is configured.
    const hardCloseBlocks = hardClosed && (!soonEnabled || !untilTs);
    const showComingSoon = !isAdminRoute && !isLoginRoute && (
      hardCloseBlocks || (soonEnabled && (untilTs == null || nowTs < untilTs))
    );

    // Exit overlay animation when we transition from Coming Soon -> Live
    const [overlay, setOverlay] = React.useState<'none' | 'exit'>('none');
    const prevShowRef = React.useRef<boolean>(showComingSoon);
    React.useEffect(() => {
      const prev = prevShowRef.current;
      if (prev && !showComingSoon && !isAdminRoute) {
        setOverlay('exit');
        const id = window.setTimeout(() => setOverlay('none'), 1200);
        return () => window.clearTimeout(id);
      }
      prevShowRef.current = showComingSoon;
    }, [showComingSoon, isAdminRoute]);

    return (
      <RouteErrorBoundary>
        <div className="min-h-screen bg-white">
          {/* Global particles cursor layer */}
          <ParticlesCursor />
          <GlobalErrorBanner />
          {isAdminRoute && safeRender(ConnectionStatusBanner, 'ConnectionStatusBanner')}
          {/* Hide public site chrome on admin pages to avoid overlap */}
          {!isAdminRoute && !showComingSoon && <Navbar />}
          <Routes>
            <Route path="/" element={showComingSoon ? <ComingSoon /> : <Home />} />
            <Route path="/events" element={showComingSoon ? <ComingSoon /> : <Events />} />
            <Route path="/schedule" element={showComingSoon ? <ComingSoon /> : <Schedule />} />
            <Route path="/gallery" element={showComingSoon ? <ComingSoon /> : <Gallery />} />
            <Route path="/home-bound" element={showComingSoon ? <ComingSoon /> : <HomeBound />} />
            <Route path="/rico-family" element={showComingSoon ? <ComingSoon /> : <RicoFamily />} />
            <Route path="/sponsors" element={showComingSoon ? <ComingSoon /> : <Sponsors />} />
            <Route path="/login" element={<Login />} />
            {/* Convenience redirect for users who try /admin/login */}
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/admin" element={<AdminDashboard />} />
            {/* Catch all route for 404 handling */}
            <Route path="*" element={showComingSoon ? <ComingSoon /> : <Home />} />
          </Routes>
          {!isAdminRoute && !showComingSoon && <Footer />}

          {/* Coming Soon -> Live exit overlay animation */}
          {!isAdminRoute && overlay === 'exit' && (
            <div className="pointer-events-none fixed inset-0 z-[9999]">
              <div className="absolute inset-0 bg-black animate-[csExit_1.2s_ease-out_forwards]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[40vw] h-[40vw] max-w-[560px] max-h-[560px] rounded-full bg-gradient-to-r from-pink-500/30 via-white/20 to-cyan-400/30 blur-3xl animate-[ripple_1.2s_ease-out_forwards]" />
              </div>
              <style>{`
                @keyframes csExit { from { opacity: 1 } to { opacity: 0 } }
                @keyframes ripple { from { transform: scale(0.9); opacity: 0.9 } to { transform: scale(1.1); opacity: 0 } }
              `}</style>
            </div>
          )}
        </div>
      </RouteErrorBoundary>
    );
  };

  return (
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <SavingProgressProvider>
            <Router>
              <AppShell />
            </Router>
          </SavingProgressProvider>
        </ToastProvider>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;