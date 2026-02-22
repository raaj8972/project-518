import { BRAND_NAME, BRAND_YEAR } from '../../constants/brand';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../ToastProvider';
import { LogOut, Save, MessageCircle, Link as LinkIcon, ExternalLink, Users, Sunrise, Sun, Sunset, Moon, Shield, Search, Download, X, CheckCircle, XCircle, RefreshCw, AlertTriangle, Wifi, SendHorizonal, Mail, Phone, ToggleLeft, ToggleRight, Lock, Unlock } from 'lucide-react';
import { exportCoordinatorRegistrationsToPDF } from '../../utils/pdfExport';

// WhatsApp Logo SVG Component
const WhatsAppLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

export const CoordinatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  // We still use useData for events (public) but NOT for registrations (RLS protected)
  const { events, updateEvent } = useData() as any; 
  const { push } = useToast();
  
  const [session, setSession] = useState<{ eventId: number; eventTitle: string; token?: string } | null>(null);
  const [whatsappLink, setWhatsappLink] = useState('');
  const [linkSaving, setLinkSaving] = useState(false);
  
  // Local state for registrations fetched via RPC
  const [rpcRegistrations, setRpcRegistrations] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // New features state
  const [activeTab, setActiveTab] = useState<'approved' | 'pending' | 'rejected'>('approved');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReg, setSelectedReg] = useState<any | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [eventDetails, setEventDetails] = useState<any | null>(null);
  const [eventCoordinators, setEventCoordinators] = useState<Array<{name: string; phone: string | null}>>([]);

  // Feature state
  const [isRetrying, setIsRetrying] = useState(false);
  const [tokenWarning, setTokenWarning] = useState(false);
  const [newRegsCount, setNewRegsCount] = useState(0); // real-time new count
  const [invitedSet, setInvitedSet] = useState<Set<string>>(new Set()); // bulk invite session tracking
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);
  const [isTogglingReg, setIsTogglingReg] = useState(false);

  // Load session and fetch data (with offline-first caching)
  const fetchData = useCallback(async (sessionData: any, mounted: { current: boolean }) => {
    if (!sessionData?.token) {
      setErrorMsg('Session expired. Please logout and login again.');
      setIsLoadingData(false);
      return;
    }

    // Offline-first: load cached data immediately so UI isn't blank
    const cacheKey = `coord_regs_${sessionData.eventId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try { setRpcRegistrations(JSON.parse(cached)); } catch {}
    }

    if (mounted.current) setIsLoadingData(true);
    try {
      const { supabase } = await import('../../lib/supabase');

      const [coordResult, regsResult] = await Promise.all([
        supabase
          .from('event_coordinators')
          .select('name, phone')
          .eq('event_id', sessionData.eventId)
          .order('order_position', { ascending: true }),
        supabase.rpc('get_coordinator_registrations', {
          event_id_param: sessionData.eventId,
          token_param: sessionData.token,
        }),
      ]);

      if (!mounted.current) return;

      if (coordResult.data) setEventCoordinators(coordResult.data);

      if (regsResult.error) {
        // Keep cached data visible; just show error banner
        setErrorMsg(regsResult.error.message || 'Failed to refresh data.');
      } else {
        const fresh = regsResult.data || [];
        setRpcRegistrations(fresh);
        setErrorMsg(null);
        // Update cache
        sessionStorage.setItem(cacheKey, JSON.stringify(fresh));
        // Count new items vs cached
        if (cached) {
          try {
            const oldCount = JSON.parse(cached).length;
            const diff = fresh.length - oldCount;
            if (diff > 0) setNewRegsCount(diff);
          } catch {}
        }
      }
    } catch {
      if (mounted.current) setErrorMsg('System error loading data');
    } finally {
      if (mounted.current) setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    const mounted = { current: true };

    const loadData = async () => {
      try {
        const stored = sessionStorage.getItem('coordinator_session');
        if (!stored) { navigate('/coordinator'); return; }

        const data = JSON.parse(stored);

        // Check if token expired (client-side check)
        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
          sessionStorage.removeItem('coordinator_session');
          push({ message: 'Session expired. Please login again.', type: 'error' });
          navigate('/coordinator');
          return;
        }

        if (mounted.current) setSession(data);

        // Load event details from cached context
        const event = events.find((e: any) => e.id === data.eventId);
        if (event && mounted.current) {
          setEventDetails(event);
          if (event.whatsapp_group_link) setWhatsappLink(event.whatsapp_group_link);
          if (typeof event.registration_open === 'boolean') setRegistrationOpen(event.registration_open);
        }

        await fetchData(data, mounted);

        // Token expiry warning: warn 5 minutes before expiry
        if (data.expiresAt) {
          const msLeft = new Date(data.expiresAt).getTime() - Date.now() - 5 * 60 * 1000;
          if (msLeft > 0) {
            const warnTimer = setTimeout(() => {
              if (mounted.current) setTokenWarning(true);
            }, msLeft);
            return () => clearTimeout(warnTimer);
          } else {
            // Less than 5 min remaining — show warning immediately
            if (mounted.current) setTokenWarning(true);
          }
        }
      } catch {
        if (mounted.current) setErrorMsg('System error loading data');
        if (mounted.current) setIsLoadingData(false);
      }
    };

    loadData();

    return () => { mounted.current = false; };
  }, [navigate, events, fetchData]);

  // Real-time subscription for new registrations
  useEffect(() => {
    if (!session) return;
    let sub: any;
    const setupRealtime = async () => {
      const { supabase } = await import('../../lib/supabase');
      sub = supabase
        .channel(`coord-regs-${session.eventId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'registrations', filter: `event_id=eq.${session.eventId}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newReg = payload.new;
              setRpcRegistrations(prev => {
                // Avoid duplicates
                if (prev.some((r: any) => r.reg_id === newReg.id)) return prev;
                setNewRegsCount(n => n + 1);
                return [newReg, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              setRpcRegistrations(prev =>
                prev.map((r: any) => r.reg_id === payload.new.id ? { ...r, status: payload.new.status } : r)
              );
            }
          }
        )
        .subscribe();
    };
    setupRealtime();
    return () => { if (sub) sub.unsubscribe(); };
  }, [session]);


  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLoadingData && session) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isLoadingData, session]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const welcomeSplash = useMemo(() => {
    const greeting = getGreeting();
    const hour = currentTime.getHours();
    
    const GreetingIcon = (() => {
      if (hour >= 5 && hour < 10) return Sunrise;
      if (hour >= 10 && hour < 16) return Sun;
      if (hour >= 16 && hour < 19) return Sunset;
      return Moon;
    })();

    const themeColor = (() => {
      if (hour >= 5 && hour < 17) return 'from-amber-400 via-orange-500 to-rose-500';
      return 'from-indigo-600 via-purple-700 to-slate-900';
    })();

    // Try to use the event poster as a background hint if available
    const bgStyle = eventDetails?.poster_url 
      ? { backgroundImage: `url(${eventDetails.poster_url})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15 }
      : {};

    return (
      <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br ${themeColor} transition-all duration-1000 ${!showSplash ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'}`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" style={bgStyle}></div>
        <div className="absolute inset-0 bg-black/30 backdrop-blur-md mix-blend-multiply"></div>
        <div className="relative text-center px-4">
          <div className="mb-8 inline-block animate-bounce duration-[2000ms]">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white/20 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-white/30">
               <GreetingIcon className="w-12 h-12 sm:w-16 sm:h-16 text-white drop-shadow-md" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter drop-shadow-lg">
              {greeting},
              {eventCoordinators.length > 0 ? (
                <span className="text-purple-300"> {eventCoordinators.map(c => c.name.split(' ')[0]).join(' & ')}</span>
              ) : (
                <span className="text-white/80"> Coordinator</span>
              )}
            </h2>
            <p className="text-xl sm:text-2xl font-bold text-white/60 tracking-tight">
              Initializing {session?.eventTitle} Portal
            </p>
          </div>

          <div className="mt-12 flex flex-col items-center gap-6">
            <div className="flex items-center gap-3 px-6 py-3 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 text-white/90 text-sm font-black tracking-widest uppercase">
              <Shield className="w-4 h-4 text-green-400" />
              Coordinator Gateway Active
            </div>
            
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-white animate-progress-indefinite rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [showSplash, eventDetails, eventCoordinators, session, currentTime]);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('coordinator_session');
    navigate('/coordinator');
    push({ message: 'Logged out successfully', type: 'success' });
  }, [navigate, push]);

  const handleRetry = useCallback(async () => {
    const stored = sessionStorage.getItem('coordinator_session');
    if (!stored) { navigate('/coordinator'); return; }
    const data = JSON.parse(stored);
    setIsRetrying(true);
    setErrorMsg(null);
    const mounted = { current: true };
    await fetchData(data, mounted);
    setIsRetrying(false);
  }, [navigate, fetchData]);

  const handleSaveLink = useCallback(async () => {
    if (!session) return;
    try {
      setLinkSaving(true);
      const { supabase } = await import('../../lib/supabase');
      const { error } = await supabase.rpc('update_event_whatsapp_link', {
        event_id_param: session.eventId,
        token_param: session.token,
        new_link: whatsappLink
      });
      if (error) throw error;
      push({ message: 'WhatsApp link updated!', type: 'success' });
    } catch {
      push({ message: 'Failed to save link', type: 'error' });
    } finally {
      setLinkSaving(false);
    }
  }, [session, whatsappLink, push]);

  // Update registration status (Approve/Reject)
  const handleUpdateStatus = useCallback(async (regId: string, newStatus: 'approved' | 'rejected') => {
    if (!session) return;
    try {
      setIsUpdatingStatus(regId);
      const { supabase } = await import('../../lib/supabase');
      const { error } = await supabase.rpc('update_coordinator_registration_status', {
        p_reg_id: regId,
        p_event_id: session.eventId,
        p_token: session.token,
        p_new_status: newStatus
      });
      if (error) throw error;
      setRpcRegistrations(prev =>
        prev.map(r => r.reg_id === regId ? { ...r, status: newStatus } : r)
      );
      push({ message: `Registration ${newStatus} successfully!`, type: 'success' });
      if (selectedReg && selectedReg.reg_id === regId) {
        setSelectedReg((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (e: any) {
      push({ message: e.message || `Failed to mark as ${newStatus}`, type: 'error' });
    } finally {
      setIsUpdatingStatus(null);
    }
  }, [session, selectedReg, push]);

  // Registration open/close toggle
  const handleToggleRegistration = useCallback(async () => {
    if (!session?.eventId || isTogglingReg) return;
    const newValue = !registrationOpen;
    setIsTogglingReg(true);
    try {
      // Call Netlify function (uses service role to bypass RLS),
      // passing coordinator token for server-side validation
      const res = await fetch('/.netlify/functions/coordinator-toggle-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: session.eventId,
          token: session.token,
          registration_open: newValue
        })
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to update');
      }
      // Update local UI state
      setRegistrationOpen(newValue);
      // Patch DataContext in-memory events so Events page & Admin reflect change immediately
      if (typeof updateEvent === 'function') {
        await updateEvent(session.eventId, { registration_open: newValue });
      }
      push({
        message: newValue ? '✅ Registration is now OPEN' : '🔒 Registration is now CLOSED',
        type: newValue ? 'success' : 'info'
      });
    } catch (e: any) {
      push({ message: e.message || 'Failed to update registration status', type: 'error' });
    } finally {
      setIsTogglingReg(false);
    }
  }, [session, registrationOpen, isTogglingReg, push, updateEvent]);

  // Process registrations stats & filters
  const { filteredRegs, approvedCount, pendingCount, rejectedCount } = useMemo(() => {
    const approved = rpcRegistrations.filter((r: any) => r.status?.toLowerCase() === 'approved');
    const pending = rpcRegistrations.filter((r: any) => r.status?.toLowerCase() === 'pending');
    const rejected = rpcRegistrations.filter((r: any) => r.status?.toLowerCase() === 'rejected');
    
    let baseList = [];
    if (activeTab === 'approved') baseList = approved;
    else if (activeTab === 'pending') baseList = pending;
    else baseList = rejected;

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      baseList = baseList.filter(reg => 
        (reg.full_name && reg.full_name.toLowerCase().includes(q)) ||
        (reg.phone && reg.phone.includes(q)) ||
        (reg.reg_id && reg.reg_id.toLowerCase().includes(q))
      );
    }
    
    return {
      filteredRegs: baseList.sort((a: any, b: any) => a.full_name?.localeCompare(b.full_name)),
      approvedCount: approved.length,
      pendingCount: pending.length,
      rejectedCount: rejected.length
    };
  }, [rpcRegistrations, activeTab, searchQuery]);

  const handleExportPDF = () => {
    if (!filteredRegs.length) {
      push({ message: "No data to export", type: "error" });
      return;
    }
    const title = `${session?.eventTitle} - ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Participants`;
    exportCoordinatorRegistrationsToPDF(filteredRegs, {
      title,
      filename: `${session?.eventTitle.replace(/\s+/g, '_')}_${activeTab}_participants.pdf`
    });
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col relative text-white selection:bg-purple-500/30">
      {/* Dynamic Event Background */}
      {eventDetails?.motion_poster_url ? (
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          preload="auto"
          className="fixed inset-0 z-0 w-full h-full object-cover opacity-60 pointer-events-none"
          style={{ filter: 'blur(4px)' }}
        >
          <source src={eventDetails.motion_poster_url} type="video/mp4" />
        </video>
      ) : eventDetails?.poster_url ? (
        <div 
          className="fixed inset-0 z-0 opacity-20 pointer-events-none"
          style={{ 
            backgroundImage: `url(${eventDetails.poster_url})`, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center',
            filter: 'blur(10px)'
          }}
        />
      ) : null}
      <div className="fixed inset-0 z-0 bg-black/40 pointer-events-none" />

      {welcomeSplash}
      
      {/* Header with dynamic theme */}
      <header className="bg-black/40 backdrop-blur-xl shadow-lg border-b border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-3">
            {/* Left: title + event badge + coordinator chips */}
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-white tracking-tight">Coordinator Dashboard</h1>
              <p className="text-xs sm:text-sm font-medium text-purple-400 bg-purple-500/10 inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full mt-1.5 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] max-w-full truncate">
                <Shield className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{session.eventTitle}</span>
              </p>
              {/* Coordinator names */}
              {eventCoordinators.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {eventCoordinators.map((coord, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/80 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full"
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-purple-500/40 flex items-center justify-center text-[9px] font-bold text-purple-200 flex-shrink-0">
                        {coord.name.charAt(0)}
                      </span>
                      <span className="truncate max-w-[100px] sm:max-w-none">{coord.name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* Right: logout */}
            <button
              onClick={handleLogout}
              className="flex-shrink-0 flex items-center text-sm font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-red-500/20 px-3 py-2 rounded-lg transition-all border border-transparent hover:border-red-500/30"
              title="Logout"
            >
              <LogOut size={16} className="sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6 relative z-10">
        {/* WhatsApp Link Section */}
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-green-500/20 transition-colors duration-700" />
          <div className="relative">
            <h3 className="text-xs sm:text-sm font-bold text-white mb-3 flex items-center gap-2 uppercase tracking-wider">
              <MessageCircle size={16} className="text-green-500" />
              Communication Hub
            </h3>
            {/* Input + action buttons — all on one row on mobile */}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1 min-w-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon size={14} className="text-gray-500" />
                </div>
                <input
                  type="url"
                  value={whatsappLink}
                  onChange={(e) => setWhatsappLink(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all text-sm"
                  placeholder="https://chat.whatsapp.com/..."
                />
              </div>
              <button
                onClick={handleSaveLink}
                disabled={linkSaving}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 sm:px-5 py-2.5 border border-transparent text-sm font-bold rounded-xl text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)]"
              >
                <Save size={15} />
                <span className="hidden sm:inline">{linkSaving ? 'Saving...' : 'Save Link'}</span>
                <span className="sm:hidden">{linkSaving ? '...' : 'Save'}</span>
              </button>
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 border border-white/10 rounded-xl text-gray-300 bg-white/5 hover:bg-white/10 transition-all"
                  title="Test Link"
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
            <p className="mt-2 text-xs text-green-400/80 font-medium">
              This link will be sent to candidates via email upon approval, if they are eligible.
            </p>
          </div>
        </div>

        {/* Registration Open/Close Toggle Card */}
        {registrationOpen !== null && (
          <div className={`rounded-2xl border shadow-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
            registrationOpen
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${registrationOpen ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {registrationOpen ? <Unlock className="w-5 h-5 text-green-400" /> : <Lock className="w-5 h-5 text-red-400" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-white text-sm">Registration Gate</h3>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    registrationOpen ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'
                  }`}>
                    {registrationOpen ? 'OPEN' : 'CLOSED'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {registrationOpen
                    ? 'Participants can currently register for this event.'
                    : 'Registrations are closed. Participants cannot register.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleRegistration}
              disabled={isTogglingReg}
              className={`flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                registrationOpen
                  ? 'bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30'
                  : 'bg-green-500/20 border-green-500/30 text-green-300 hover:bg-green-500/30'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isTogglingReg ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : registrationOpen ? (
                <><ToggleRight className="w-5 h-5" /> Close Registration</>
              ) : (
                <><ToggleLeft className="w-5 h-5" /> Open Registration</>
              )}
            </button>
          </div>
        )}

        {/* Main Interface */}
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/2" />
          <div className="p-3 sm:p-6 lg:p-8 relative">
            <div className="flex items-center justify-between gap-2 mb-5 sm:mb-8">
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">Participant Gateway</h2>
                <p className="text-xs sm:text-sm font-medium text-gray-400 mt-0.5">
                  {rpcRegistrations.length} registered candidates
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Token Expiry Warning Banner */}
              {tokenWarning && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 flex items-start sm:items-center justify-between gap-2">
                  <div className="flex items-start sm:items-center gap-2 text-amber-400 text-xs sm:text-sm font-semibold">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-pulse mt-0.5 sm:mt-0" />
                    <span>Session expires in &lt;5 min. Save your work.</span>
                  </div>
                  <button onClick={handleLogout} className="flex-shrink-0 text-xs font-bold text-white bg-amber-500/30 hover:bg-amber-500/50 px-2.5 py-1 rounded-lg transition-all border border-amber-500/30">
                    Re-Login
                  </button>
                </div>
              )}

              {/* Real-time new registrations badge */}
              {newRegsCount > 0 && (
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3 mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-indigo-300 text-sm font-semibold">
                    <Wifi className="w-4 h-4 animate-pulse" />
                    {newRegsCount} new registration{newRegsCount > 1 ? 's' : ''} received in real-time!
                  </div>
                  <button onClick={() => setNewRegsCount(0)} className="text-xs text-indigo-300/60 hover:text-indigo-300 transition-colors flex-shrink-0">
                    Dismiss
                  </button>
                </div>
              )}

              {/* Error Message with Retry */}
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 text-red-400 text-sm flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xl block mt-[-2px]">⚠️</span>
                    <span>{errorMsg}</span>
                  </div>
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold text-red-300 border border-red-500/30 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                    {isRetrying ? 'Retrying...' : 'Retry'}
                  </button>
                </div>
              )}

              {/* Filters / Search and Tabs */}
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-black/20 p-2 border border-white/5 rounded-2xl">
                <div className="flex gap-1 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                  {(['approved', 'pending', 'rejected'] as const).map((tab) => {
                    const count = tab === 'approved' ? approvedCount : tab === 'pending' ? pendingCount : rejectedCount;
                    const isPending = tab === 'pending' && count > 0;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap capitalize
                          ${activeTab === tab 
                            ? tab === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' :
                              tab === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]' :
                              'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                            : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
                          }`}
                      >
                        {tab}
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-black
                          ${isPending
                            ? 'bg-yellow-400 text-yellow-900 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.6)]'
                            : 'bg-white/10 text-gray-300'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto mt-2 lg:mt-0 px-2 lg:px-0 pb-2 lg:pb-0">
                  <div className="relative flex-grow lg:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search name, phone, or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm"
                    />
                  </div>
                  
                  <button
                    onClick={handleExportPDF}
                    className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 hover:border-white/20 transition-all font-bold text-sm"
                  >
                    <Download className="w-4 h-4 text-purple-400" />
                    <span className="hidden sm:inline">Export List</span>
                    <span className="sm:hidden">PDF</span>
                  </button>

                  {/* Bulk Invite button — only in Approved tab when link is set */}
                  {activeTab === 'approved' && whatsappLink && approvedCount > 0 && (
                    <button
                      onClick={() => setShowBulkInvite(true)}
                      className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 hover:bg-green-500/20 hover:border-green-500/40 transition-all font-bold text-sm shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                    >
                      <SendHorizonal className="w-4 h-4" />
                      <span className="hidden sm:inline">Bulk Invite</span>
                      <span className="sm:hidden">Invite</span>
                      {invitedSet.size > 0 && (
                        <span className="bg-green-400 text-green-900 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                          {invitedSet.size}/{approvedCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Participants List */}
              {isLoadingData && rpcRegistrations.length === 0 ? (
                // Skeleton loader — only when truly no data yet
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 animate-pulse">
                      <div className="w-6 h-4 bg-white/10 rounded" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/10 rounded w-1/3" />
                        <div className="h-3 bg-white/5 rounded w-1/4" />
                      </div>
                      <div className="h-4 bg-white/10 rounded w-24" />
                    </div>
                  ))}
                </div>
              ) : filteredRegs.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-black/20 rounded-2xl border border-dashed border-white/20">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                  <p className="font-bold text-gray-300">No {activeTab} participants found.</p>
                  {searchQuery && <p className="text-sm mt-1 text-gray-500">Try clearing your search query.</p>}
                </div>
              ) : (
                <>
                  {/* Mobile View - Cards */}
                  <div className="block md:hidden space-y-3">
                    {filteredRegs.map((reg: any, index: number) => (
                      <div 
                        key={reg.reg_id} 
                        className={`bg-black/40 backdrop-blur-md rounded-xl p-4 shadow-lg transition-all border
                          ${activeTab === 'pending' ? 'border-yellow-500/30' : 'border-white/10'}`}
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div 
                              className="flex-1 cursor-pointer" 
                              onClick={() => setSelectedReg(reg)}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">#{index + 1}</span>
                                <h3 className="font-bold text-white leading-tight">
                                  {reg.full_name}
                                  <span className="ml-2 text-xs text-purple-400 font-medium inline-block">View</span>
                                </h3>
                              </div>
                              <div className="text-sm text-gray-400 mt-1">{reg.college || reg.institution || 'No institution'}</div>
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mt-2">
                                <span>{reg.phone}</span>
                                {reg.phone && whatsappLink && activeTab === 'approved' && (
                                  <a
                                    href={`https://wa.me/91${reg.phone.replace(/[^0-9]/g, '').replace(/^91/, '')}?text=${encodeURIComponent(`Hello ${reg.full_name.split(' ')[0]}! 👋\n\nYou have successfully registered for *${session.eventTitle}* at ${BRAND_NAME} ${BRAND_YEAR}! 🎭\n\nPlease join the official WhatsApp group for important updates:\n\n${whatsappLink}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 rounded p-1.5 transition-colors border border-green-500/20"
                                    title="Send WhatsApp group link"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <WhatsAppLogo className="w-5 h-5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Pending Actions */}
                          {activeTab === 'pending' && (
                            <div className="flex gap-2 pt-3 border-t border-gray-100 mt-1">
                               <button
                                 disabled={isUpdatingStatus === reg.reg_id}
                                 onClick={() => handleUpdateStatus(reg.reg_id, 'approved')}
                                 className="flex-1 flex items-center justify-center gap-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                               >
                                  <CheckCircle className="w-4 h-4" /> Approve
                               </button>
                               <button
                                 disabled={isUpdatingStatus === reg.reg_id}
                                 onClick={() => handleUpdateStatus(reg.reg_id, 'rejected')}
                                 className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                               >
                                  <XCircle className="w-4 h-4" /> Reject
                               </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View - Table */}
                  <div className="hidden md:block border border-white/10 rounded-xl overflow-hidden shadow-2xl bg-black/40 backdrop-blur-md">
                    <table className="min-w-full divide-y divide-white/10">
                      <thead className="bg-black/40 border-b border-white/10">
                        <tr>
                          <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">#</th>
                          <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Participant Details</th>
                          <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Contact</th>
                          {activeTab === 'pending' && (
                            <th className="px-5 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredRegs.map((reg: any, index: number) => (
                          <tr 
                            key={reg.reg_id} 
                            className={`hover:bg-white/5 transition-colors cursor-pointer group`}
                            onClick={() => setSelectedReg(reg)}
                          >
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-400 font-bold">
                              {index + 1}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <div className="font-bold text-white group-hover:text-purple-300 transition-colors">{reg.full_name}</div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">View</span>
                              </div>
                              <div className="text-xs text-gray-400 mt-1 max-w-xs truncate" title={reg.college || reg.institution}>
                                {reg.college || reg.institution || <span className="text-gray-500 italic">No institution listed</span>}
                              </div>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-300">
                              <div className="font-medium">{reg.phone}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="text-xs text-gray-400 truncate max-w-[150px]" title={reg.email}>{reg.email}</div>
                                {reg.phone && whatsappLink && activeTab === 'approved' && (
                                  <a
                                    href={`https://wa.me/91${reg.phone.replace(/[^0-9]/g, '').replace(/^91/, '')}?text=${encodeURIComponent(`Hello ${reg.full_name.split(' ')[0]}! 👋\n\nYou have successfully registered for *${session.eventTitle}* at ${BRAND_NAME} ${BRAND_YEAR}! 🎭\n\nPlease join the official WhatsApp group for important updates:\n\n${whatsappLink}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 rounded px-2 py-1 transition-colors border border-transparent hover:border-green-500/30"
                                    title="Send WhatsApp group link"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <WhatsAppLogo className="w-3.5 h-3.5 mr-1" /> <span className="text-xs font-bold tracking-wide uppercase">Invite</span>
                                  </a>
                                )}
                              </div>
                            </td>
                            {activeTab === 'pending' && (
                              <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-end gap-2">
                                  <button
                                     disabled={isUpdatingStatus === reg.reg_id}
                                     onClick={() => handleUpdateStatus(reg.reg_id, 'approved')}
                                     className="inline-flex bg-green-50 text-green-700 hover:bg-green-600 hover:text-white border border-green-200 hover:border-transparent px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50"
                                  >
                                    Approve
                                  </button>
                                  <button
                                     disabled={isUpdatingStatus === reg.reg_id}
                                     onClick={() => handleUpdateStatus(reg.reg_id, 'rejected')}
                                     className="inline-flex bg-red-50 text-red-700 hover:bg-red-600 hover:text-white border border-red-200 hover:border-transparent px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Detailed Modal View */}
      {selectedReg && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-950/95 backdrop-blur-xl border border-white/10 sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95svh] sm:max-h-[90vh] overflow-hidden flex flex-col rounded-t-2xl">
             
             {/* Modal Header */}
             <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10 flex justify-between items-center bg-white/5">
               <div className="flex-1 min-w-0">
                 <h2 className="text-base sm:text-xl font-bold text-white truncate">{selectedReg.full_name}</h2>
                 <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">ID: {selectedReg.reg_id}</p>
               </div>
               <button 
                 onClick={() => setSelectedReg(null)}
                 className="ml-3 flex-shrink-0 text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
               >
                 <X className="w-5 h-5" />
               </button>
             </div>

             {/* Modal Body */}
             <div className="px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto flex-1">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Basic Info */}
                 <div className="space-y-4">
                   <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2 border-b border-white/10 pb-2">Basic Info</h3>
                   <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                     <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Email</p>
                     <p className="text-sm font-medium text-gray-200 break-all">{selectedReg.email || 'N/A'}</p>
                   </div>
                   <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                     <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Phone</p>
                     <p className="text-sm font-medium text-gray-200">{selectedReg.phone || 'N/A'}</p>
                   </div>
                   <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                     <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Institution</p>
                     <p className="text-sm font-medium text-gray-200">{selectedReg.institution || selectedReg.college || 'N/A'}</p>
                   </div>
                   {selectedReg.gender && (
                     <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                       <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Gender</p>
                       <p className="text-sm font-medium text-gray-200 capitalize">{selectedReg.gender}</p>
                     </div>
                   )}
                 </div>

                 {/* Registration Info */}
                 <div className="space-y-4">
                   <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2 border-b border-white/10 pb-2">Registration Details</h3>
                   <div className="bg-white/5 rounded-lg p-3 border border-white/5 flex flex-col gap-2">
                     <div className="flex gap-3 items-center">
                       <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Status</p>
                       <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          selectedReg.status?.toLowerCase() === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/20' :
                          selectedReg.status?.toLowerCase() === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' :
                          'bg-red-500/20 text-red-400 border border-red-500/20'
                       }`}>
                         {selectedReg.status}
                       </span>
                     </div>
                     <div>
                       <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1 mt-2">Registered On</p>
                       <p className="text-sm font-medium text-gray-200">{new Date(selectedReg.created_at).toLocaleString()}</p>
                     </div>
                   </div>
                   {/* Payment if available */}
                   {(selectedReg.amount > 0 || selectedReg.payment_status) && (
                     <div className="bg-gradient-to-br from-white/10 to-white/5 p-4 rounded-lg border border-white/10 shadow-inner">
                       <p className="text-[10px] text-purple-300 uppercase tracking-widest font-black mb-2 flex items-center gap-2">
                         <Shield className="w-3 h-3" /> Payment Details
                       </p>
                       <div className="grid grid-cols-2 gap-2 mb-2">
                         {selectedReg.amount > 0 && (
                           <div>
                             <p className="text-[10px] text-gray-400 uppercase">Amount</p>
                             <p className="text-base font-bold text-white tracking-wide">₹{selectedReg.amount}</p>
                           </div>
                         )}
                         {selectedReg.payment_status && (
                           <div>
                             <p className="text-[10px] text-gray-400 uppercase">Status</p>
                             <p className="text-sm text-gray-300 mt-0.5 capitalize font-medium">{selectedReg.payment_status}</p>
                           </div>
                         )}
                       </div>
                       {selectedReg.payment_reference && (
                         <div className="mt-3 pt-3 border-t border-white/10">
                           <p className="text-[10px] text-gray-400 uppercase mb-1">Transaction Ref</p>
                           <p className="text-xs text-purple-300 font-mono break-all bg-black/40 p-1.5 rounded">{selectedReg.payment_reference}</p>
                         </div>
                       )}
                     </div>
                   )}
                 </div>
               </div>

               {/* Custom Fields */}
               {selectedReg.custom_answers && Object.keys(selectedReg.custom_answers).length > 0 && (
                 <div className="mt-6 pt-6 border-t border-white/10">
                   <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-4 flex items-center gap-2">
                     <MessageCircle className="w-4 h-4" /> Additional Information
                   </h3>
                   <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                     {Object.entries(selectedReg.custom_answers).map(([key, value]) => (
                       <div key={key} className="bg-white/5 p-3 rounded-lg border border-white/5">
                         <dt className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{key.replace(/_/g, ' ')}</dt>
                         <dd className="text-sm font-medium text-gray-200 break-words">{String(value)}</dd>
                       </div>
                     ))}
                   </dl>
                 </div>
               )}
               
               {/* Team Info */}
               {selectedReg.team_members && Array.isArray(selectedReg.team_members) && selectedReg.team_members.length > 0 && (
                 <div className="mt-6 pt-6 border-t border-white/10">
                   <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-4 flex items-center gap-2">
                     <Users className="w-4 h-4" /> Team Members <span className="text-gray-500 font-normal ml-2">({selectedReg.team_members.length})</span>
                   </h3>
                   <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
                     {selectedReg.team_members.map((member: any, idx: number) => (
                        <div key={idx} className="p-4 hover:bg-white/5 transition-colors">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-xs">
                               {idx + 1}
                             </div>
                             <div>
                               <div className="text-sm font-bold text-gray-200">{member.name || member.full_name}</div>
                               <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-400">
                                 {member.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {member.email}</span>}
                                 {member.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {member.phone}</span>}
                               </div>
                             </div>
                           </div>
                        </div>
                     ))}
                   </div>
                 </div>
               )}
             </div>

             {/* Modal Footer actions (mostly for pending) */}
             <div className="px-6 py-5 bg-white/5 border-t border-white/10 flex justify-end gap-3">
                {selectedReg.status?.toLowerCase() === 'pending' && (
                  <>
                     <button
                       disabled={isUpdatingStatus === selectedReg.reg_id}
                       onClick={() => handleUpdateStatus(selectedReg.reg_id, 'rejected')}
                       className="px-5 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                     >
                       <X className="w-4 h-4 mr-1.5" /> Reject
                     </button>
                     <button
                       disabled={isUpdatingStatus === selectedReg.reg_id}
                       onClick={() => handleUpdateStatus(selectedReg.reg_id, 'approved')}
                       className="px-5 py-2.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/40 hover:border-green-500/60 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center shadow-[0_0_20px_rgba(34,197,94,0.15)]"
                     >
                       <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                     </button>
                  </>
                )}
                {selectedReg.status?.toLowerCase() !== 'pending' && (
                  <button 
                    onClick={() => setSelectedReg(null)}
                    className="px-6 py-2.5 bg-white/10 text-white hover:bg-white/20 border border-white/10 rounded-xl text-sm font-bold transition-all"
                  >
                    Close
                  </button>
                )}
             </div>
          </div>
        </div>
      )}

      {/* Bulk WhatsApp Invite Modal */}
      {showBulkInvite && session && whatsappLink && (() => {
        const eligible = rpcRegistrations.filter(
          (r: any) => r.status?.toLowerCase() === 'approved' && r.phone
        );
        const sentCount = eligible.filter((r: any) => invitedSet.has(r.reg_id)).length;
        const progress = eligible.length > 0 ? Math.round((sentCount / eligible.length) * 100) : 0;

        return (
          <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-950/95 backdrop-blur-xl border border-white/10 sm:rounded-2xl rounded-t-2xl shadow-2xl w-full sm:max-w-lg max-h-[90svh] flex flex-col">
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div>
                  <h2 className="font-black text-white text-base flex items-center gap-2">
                    <SendHorizonal className="w-4 h-4 text-green-400" />
                    Bulk WhatsApp Invite
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">{eligible.length} approved participants with phone numbers</p>
                </div>
                <button onClick={() => setShowBulkInvite(false)} className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress */}
              <div className="px-5 py-3 border-b border-white/5 bg-black/20">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-gray-400">Progress</span>
                  <span className={sentCount === eligible.length && eligible.length > 0 ? 'text-green-400' : 'text-white'}>
                    {sentCount} / {eligible.length} sent
                  </span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Participant list */}
              <div className="overflow-y-auto flex-1 divide-y divide-white/5">
                {eligible.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 text-sm">No approved participants with phone numbers found.</div>
                ) : (
                  eligible.map((reg: any) => {
                    const isSent = invitedSet.has(reg.reg_id);
                    const phone = reg.phone.replace(/[^0-9]/g, '').replace(/^91/, '');
                    const waLink = `https://wa.me/91${phone}?text=${encodeURIComponent(
                      `Hello ${reg.full_name.split(' ')[0]}! 👋\n\nYou have been approved for *${session.eventTitle}* at ${BRAND_NAME} ${BRAND_YEAR}! 🎭\n\nJoin the official WhatsApp group for important updates:\n\n${whatsappLink}`
                    )}`;
                    return (
                      <div key={reg.reg_id} className={`flex items-center justify-between gap-3 px-5 py-3 transition-colors ${isSent ? 'bg-green-500/5' : 'hover:bg-white/5'}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{reg.full_name}</p>
                          <p className="text-xs text-gray-400 truncate">{reg.phone}</p>
                        </div>
                        {isSent ? (
                          <span className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg">
                            <CheckCircle className="w-3.5 h-3.5" /> Sent
                          </span>
                        ) : (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setInvitedSet(prev => new Set([...prev, reg.reg_id]))}
                            className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded-lg transition-all shadow-[0_0_12px_rgba(22,163,74,0.3)]"
                          >
                            <WhatsAppLogo className="w-3.5 h-3.5" /> Send
                          </a>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-white/10 bg-white/5 flex items-center justify-between gap-3">
                {sentCount > 0 && (
                  <button
                    onClick={() => setInvitedSet(new Set())}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Reset progress
                  </button>
                )}
                <button
                  onClick={() => setShowBulkInvite(false)}
                  className="ml-auto px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-bold text-white transition-all"
                >
                  {sentCount === eligible.length && eligible.length > 0 ? '🎉 All Sent! Close' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
