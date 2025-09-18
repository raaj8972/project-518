import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import React from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home'; // keep Home eager for fast first paint
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './components/ToastProvider';
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

    return (
      <RouteErrorBoundary>
        <div className="min-h-screen bg-white">
          {/* Global particles cursor layer */}
          <ParticlesCursor />
          <GlobalErrorBanner />
          <ConnectionStatusBanner />
          {/* Hide public site chrome on admin pages to avoid overlap */}
          {!isAdminRoute && <Navbar />}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<Events />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/home-bound" element={<HomeBound />} />
            <Route path="/rico-family" element={<RicoFamily />} />
            <Route path="/sponsors" element={<Sponsors />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminDashboard />} />
            {/* Catch all route for 404 handling */}
            <Route path="*" element={<Home />} />
          </Routes>
          {!isAdminRoute && <Footer />}
        </div>
      </RouteErrorBoundary>
    );
  };

  return (
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <Router>
            <AppShell />
          </Router>
        </ToastProvider>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;