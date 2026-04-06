import { BRAND_NAME, BRAND_YEAR } from '../../constants/brand';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../ToastProvider';
import { dualRead, dualUpdate } from '../../lib/dualDb';
import { LogOut, Save, MessageCircle, Link as LinkIcon, ExternalLink, Users, Sunrise, Sun, Sunset, Moon, Shield, Search, Download, X, CheckCircle, XCircle, RefreshCw, AlertTriangle, Wifi, SendHorizonal, Mail, Phone, ToggleLeft, ToggleRight, Lock, Unlock, Filter, ChevronDown } from 'lucide-react';
import { exportCoordinatorRegistrationsToPDF } from '../../utils/pdfExport';
import { AnnouncementsPanel } from '../shared/AnnouncementsPanel';
import { ChatPanel } from '../shared/ChatPanel';
import { sanitizeUrl } from '../../utils/dataUtils';

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
  const [activeSection, setActiveSection] = useState<'participants' | 'chat' | 'announcements' | 'settings'>('participants');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');

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
      const [coordResult, regsResult] = await Promise.all([
        dualRead({
          table: 'event_coordinators',
          eq: ['event_id', sessionData.eventId],
          // Temporarily removed order_position to avoid 400 error if column is missing
          // order: ['order_position', { ascending: true }]
        }).catch(err => {
          console.error('Coord fetch failed:', err);
          return { data: [], source: 'error' };
        }),
        dualRead({
          table: 'registrations',
          eq: ['event_id', sessionData.eventId]
        }).catch(err => {
          console.error('Regs fetch failed:', err);
          return { data: [], source: 'error' };
        }),
      ]);

      if (!mounted.current) return;

      if (coordResult.data) setEventCoordinators(coordResult.data);

      if (!regsResult.data && regsResult.source === 'firestore') {
        // Handle failure if needed, though dualRead already returns [] or null
        setErrorMsg('Failed to refresh data.');
      } else {
        // Transform Firestore data to match expected RPC structure
        const fresh = (regsResult.data || []).map((r: any) => ({
          reg_id: r.id,
          full_name: r.full_name,
          phone: r.phone,
          college: r.college || r.institution,
          batch: r.participant_type || r.batch || '',
          status: r.status,
          created_at: r.created_at
        }));
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
      if (hour >= 5 && hour < 17) return 'from-indigo-600 via-violet-600 to-cyan-600';
      return 'from-indigo-900 via-violet-950 to-black';
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
                <span className="text-cyan-300"> {eventCoordinators.map(c => c.name.split(' ')[0]).join(' & ')}</span>
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
              <Shield className="w-4 h-4 text-cyan-400" />
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
    window.location.href = '/coordinator';
  }, []);

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
      await dualUpdate('events', session.eventId, { whatsapp_group_link: whatsappLink });
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
      await dualUpdate('registrations', regId, { status: newStatus });
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
      await dualUpdate('events', session.eventId, { registration_open: newValue });
      
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
  const stats = useMemo(() => {
    const approved = rpcRegistrations.filter((r: any) => r.status?.toLowerCase() === 'approved');
    const pending = rpcRegistrations.filter((r: any) => r.status?.toLowerCase() === 'pending');
    const rejected = rpcRegistrations.filter((r: any) => r.status?.toLowerCase() === 'rejected');
    
    let baseList = [];
    if (activeTab === 'approved') baseList = approved;
    else if (activeTab === 'pending') baseList = pending;
    else baseList = rejected;

    // Apply batch filter
    if (selectedBatch !== 'all') {
      baseList = baseList.filter(reg => (reg.batch || '').toLowerCase() === selectedBatch.toLowerCase());
    }

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
      rejectedCount: rejected.length,
      batchOptions: Array.from(new Set(rpcRegistrations.map((r: any) => r.batch).filter(Boolean))).sort()
    };
  }, [rpcRegistrations, activeTab, searchQuery, selectedBatch]);

  const { filteredRegs, approvedCount, pendingCount, rejectedCount, batchOptions } = stats;

  const handleExportPDF = () => {
    if (registrationOpen === true) {
      push({ 
        message: "🔒 Please close registration before exporting the final participant list.", 
        type: "info" 
      });
      return;
    }
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
      {eventDetails?.motion_poster_url && eventDetails?.prefer_video ? (
        <video autoPlay loop muted playsInline preload="auto"
          className="fixed inset-0 z-0 w-full h-full object-cover opacity-60 pointer-events-none"
          style={{ filter: 'blur(4px)' }}
          poster={sanitizeUrl(eventDetails.image)}>
          <source src={sanitizeUrl(eventDetails.motion_poster_url)} type="video/mp4" />
        </video>
      ) : eventDetails?.image ? (
        <div className="fixed inset-0 z-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: `url(${sanitizeUrl(eventDetails.image)})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(10px)' }}
        />
      ) : null}
      <div className="fixed inset-0 z-0 bg-black/40 pointer-events-none" />

      {/* Aurora orbs — only visible when no video background */}
      {!(eventDetails?.motion_poster_url && eventDetails?.prefer_video) && (
        <>
          <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none z-0"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none z-0"
            style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full pointer-events-none z-0"
            style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        </>
      )}

      {welcomeSplash}

      {/* ══ MAIN LAYOUT ══ */}
      <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">

        {/* ─── DESKTOP SIDEBAR ─── */}
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 flex-shrink-0 sticky top-0 h-screen border-r border-white/[0.08] bg-black/30 backdrop-blur-2xl overflow-y-auto">
          {/* Event identity */}
          <div className="p-6 border-b border-white/[0.08]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 leading-none">Coordinator Portal</p>
                <h1 className="text-sm font-black text-white truncate leading-tight mt-0.5">{session.eventTitle}</h1>
              </div>
            </div>
            {eventCoordinators.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {eventCoordinators.map((coord, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/70 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                    <span className="w-4 h-4 rounded-full bg-purple-500/40 flex items-center justify-center text-[9px] font-black text-purple-200 flex-shrink-0">{coord.name.charAt(0)}</span>
                    <span className="truncate max-w-[120px]">{coord.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="p-4 border-b border-white/[0.08] grid grid-cols-3 gap-2">
            {([
              { label: 'Approved', count: approvedCount, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
              { label: 'Pending', count: pendingCount, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
              { label: 'Rejected', count: rejectedCount, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
            ] as const).map(s => (
              <div key={s.label} className={`rounded-xl border p-2.5 text-center ${s.bg}`}>
                <div className={`text-xl font-black ${s.color}`}>{s.count}</div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Registration pill */}
          {registrationOpen !== null && (
            <div className="px-4 pt-4">
              <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${registrationOpen ? 'bg-indigo-500/[0.08] border-indigo-500/20' : 'bg-violet-500/[0.08] border-violet-500/20'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  {registrationOpen ? <Unlock className="w-4 h-4 text-indigo-400 flex-shrink-0" /> : <Lock className="w-4 h-4 text-violet-400 flex-shrink-0" />}
                  <div>
                    <div className="text-xs font-black text-white leading-none">Registration</div>
                    <div className={`text-[10px] font-black mt-0.5 ${registrationOpen ? 'text-indigo-400' : 'text-violet-400'}`}>{registrationOpen ? 'OPEN' : 'CLOSED'}</div>
                  </div>
                </div>
                <button onClick={handleToggleRegistration} disabled={isTogglingReg}
                  className={`flex-shrink-0 text-xs font-black px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${registrationOpen ? 'bg-violet-500/15 border-violet-500/30 text-violet-300 hover:bg-violet-500/25' : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25'}`}>
                  {isTogglingReg ? <RefreshCw className="w-3 h-3 animate-spin" /> : registrationOpen ? 'Close' : 'Open'}
                </button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="p-4 space-y-1 flex-1 pt-4">
            {([
              { key: 'participants', label: 'Participants', icon: Users },
              { key: 'chat', label: 'Student Chat', icon: MessageCircle },
              { key: 'announcements', label: 'Announcements', icon: Mail },
              { key: 'settings', label: 'Event Settings', icon: LinkIcon },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveSection(key)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left border ${activeSection === key ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
                {key === 'participants' && pendingCount > 0 && (
                  <span className="ml-auto text-[10px] font-black bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full animate-pulse">{pendingCount}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-white/[0.08]">
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 transition-all">
              <LogOut className="w-4 h-4" />Logout
            </button>
          </div>
        </aside>

        {/* ─── MOBILE HEADER ─── */}
        <header className="lg:hidden sticky top-0 z-50 bg-black/60 backdrop-blur-2xl border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 leading-none">Coordinator</p>
              <h1 className="text-sm font-black text-white truncate">{session.eventTitle}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {registrationOpen !== null && (
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border ${registrationOpen ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400' : 'bg-violet-500/15 border-violet-500/30 text-violet-400'}`}>
                Reg {registrationOpen ? 'Open' : 'Closed'}
              </span>
            )}
            <button onClick={handleLogout} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-indigo-500/20 border border-white/10 transition-all text-gray-400 hover:text-indigo-300">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ─── MAIN CONTENT ─── */}
        <main className="flex-1 min-w-0 overflow-y-auto pb-24 lg:pb-8">
          <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 space-y-6">

            {/* Alert banners */}
            <div className="space-y-3">
              {tokenWarning && (
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-cyan-400 text-sm font-bold">
                    <AlertTriangle className="w-4 h-4 animate-pulse flex-shrink-0" />
                    Session expires in &lt;5 min. Save your work.
                  </div>
                  <button onClick={handleLogout} className="flex-shrink-0 text-xs font-black text-white bg-cyan-500/30 hover:bg-cyan-500/50 px-3 py-1.5 rounded-xl border border-cyan-500/30 transition-all">Re-Login</button>
                </div>
              )}
              {newRegsCount > 0 && (
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-indigo-300 text-sm font-bold">
                    <Wifi className="w-4 h-4 animate-pulse flex-shrink-0" />
                    {newRegsCount} new registration{newRegsCount > 1 ? 's' : ''} received live!
                  </div>
                  <button onClick={() => setNewRegsCount(0)} className="text-xs text-indigo-300/60 hover:text-indigo-300 transition-colors">Dismiss</button>
                </div>
              )}
              {errorMsg && (
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 text-violet-400 text-sm"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />{errorMsg}</div>
                  <button onClick={handleRetry} disabled={isRetrying} className="flex-shrink-0 flex items-center gap-1.5 text-xs font-black text-violet-300 border border-violet-500/30 hover:bg-violet-500/20 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50">
                    <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />{isRetrying ? 'Retrying...' : 'Retry'}
                  </button>
                </div>
              )}
            </div>

            {/* ══ PARTICIPANTS ══ */}
            {activeSection === 'participants' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">Participant Gateway</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{rpcRegistrations.length} total registrations</p>
                  </div>
                  <div className="flex gap-2 lg:hidden">
                    <span className="text-xs font-black px-2 py-1 rounded-lg bg-green-500/15 border border-green-500/25 text-green-400">{approvedCount} ✓</span>
                    {pendingCount > 0 && <span className="text-xs font-black px-2 py-1 rounded-lg bg-yellow-500/15 border border-yellow-500/25 text-yellow-400 animate-pulse">{pendingCount} !</span>}
                  </div>
                </div>

                {/* Filters bar */}
                <div className="bg-black/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-3 space-y-3">
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                    {(['approved', 'pending', 'rejected'] as const).map((tab) => {
                      const count = tab === 'approved' ? approvedCount : tab === 'pending' ? pendingCount : rejectedCount;
                      const active = activeTab === tab;
                      const colorActive = tab === 'approved' ? 'text-indigo-400 bg-indigo-500/20 border-indigo-500/30' : tab === 'pending' ? 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30' : 'text-violet-400 bg-violet-500/20 border-violet-500/30';
                      return (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                          className={`relative px-4 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap capitalize flex items-center gap-2 border ${active ? colorActive : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border-transparent'}`}>
                          {tab}
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${tab === 'pending' && count > 0 ? 'bg-yellow-400 text-yellow-900 animate-pulse' : 'bg-white/10 text-gray-300'}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type="text" placeholder="Search name, phone, or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm" />
                    </div>
                    
                    {/* Batch Filter Dropdown */}
                    <div className="relative group min-w-[140px]">
                      <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                      <select 
                        value={selectedBatch} 
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        className="w-full pl-9 pr-6 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm font-bold truncate"
                      >
                        <option value="all">All Batches</option>
                        {batchOptions.map((opt: string) => (
                          <option key={opt} value={opt} className="bg-gray-900">{opt}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleExportPDF} 
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-bold text-sm flex-shrink-0 border ${
                          registrationOpen ? 'bg-white/5 border-white/10 text-gray-500 opacity-60 cursor-not-allowed' : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        {registrationOpen ? <Lock className="w-4 h-4 text-gray-500" /> : <Download className="w-4 h-4 text-cyan-400" />}
                        <span className="hidden sm:inline">{registrationOpen ? 'Close Reg to Export' : 'Export PDF'}</span>
                        <span className="sm:hidden">{registrationOpen ? 'Locked' : 'PDF'}</span>
                      </button>
                      {activeTab === 'approved' && whatsappLink && approvedCount > 0 && (
                        <button onClick={() => setShowBulkInvite(true)} className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 hover:bg-green-500/20 transition-all font-bold text-sm flex-shrink-0">
                          <SendHorizonal className="w-4 h-4" /><span className="hidden sm:inline">Bulk Invite</span><span className="sm:hidden">Invite</span>
                          {invitedSet.size > 0 && <span className="bg-green-400 text-green-900 text-[10px] font-black px-1.5 py-0.5 rounded-full">{invitedSet.size}/{approvedCount}</span>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* List */}
                {isLoadingData && rpcRegistrations.length === 0 ? (
                  <div className="space-y-2">{[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
                      <div className="flex-1 space-y-2"><div className="h-4 bg-white/10 rounded w-1/3" /><div className="h-3 bg-white/5 rounded w-1/4" /></div>
                      <div className="h-6 bg-white/10 rounded-full w-20" />
                    </div>
                  ))}</div>
                ) : filteredRegs.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 bg-black/30 backdrop-blur-xl rounded-2xl border border-dashed border-white/10">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                    <p className="font-black text-gray-300">No {activeTab} participants</p>
                    {searchQuery && <p className="text-sm mt-1 text-gray-500">Try clearing your search.</p>}
                  </div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="block md:hidden space-y-2">
                      {filteredRegs.map((reg: any, index: number) => (
                        <div key={reg.reg_id}
                          className={`bg-black/50 backdrop-blur-xl rounded-2xl border transition-all cursor-pointer hover:border-indigo-500/30 ${activeTab === 'pending' ? 'border-amber-500/25' : 'border-white/[0.08]'}`}
                          onClick={() => setSelectedReg(reg)}>
                          <div className="p-4 flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/25 flex items-center justify-center flex-shrink-0 text-sm font-black text-indigo-300">
                              {reg.full_name?.charAt(0) || '#'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] text-gray-500 font-bold">#{index + 1}</span>
                                <h3 className="font-black text-white text-sm truncate">{reg.full_name}</h3>
                              </div>
                              <p className="text-xs text-gray-400 font-bold truncate tracking-wide">{reg.batch || 'No batch listed'}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-sm font-medium text-gray-300">{reg.phone}</span>
                                {reg.phone && whatsappLink && activeTab === 'approved' && (
                                  <a href={`https://wa.me/91${reg.phone.replace(/[^0-9]/g, '').replace(/^91/, '')}?text=${encodeURIComponent(`Hello ${reg.full_name.split(' ')[0]}! 👋\n\nYou have successfully registered for *${session.eventTitle}* at ${BRAND_NAME} ${BRAND_YEAR}! 🎭\n\nPlease join the official WhatsApp group for important updates:\n\n${whatsappLink}`)}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-lg p-1.5 border border-green-500/20 transition-colors"
                                    onClick={(e) => e.stopPropagation()}>
                                    <WhatsAppLogo className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                          {activeTab === 'pending' && (
                            <div className="flex gap-2 px-4 pb-4 border-t border-yellow-500/10">
                              <button disabled={isUpdatingStatus === reg.reg_id} onClick={(e) => { e.stopPropagation(); handleUpdateStatus(reg.reg_id, 'approved'); }}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/25 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-50 mt-3">
                                <CheckCircle className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button disabled={isUpdatingStatus === reg.reg_id} onClick={(e) => { e.stopPropagation(); handleUpdateStatus(reg.reg_id, 'rejected'); }}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 border border-violet-500/25 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-50 mt-3">
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block bg-black/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden">
                      <table className="min-w-full">
                        <thead className="border-b border-white/[0.08]">
                          <tr>
                            <th className="px-5 py-3.5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">#</th>
                            <th className="px-5 py-3.5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Participant</th>
                            <th className="px-5 py-3.5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Contact</th>
                            {activeTab === 'pending' && <th className="px-5 py-3.5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredRegs.map((reg: any, index: number) => (
                            <tr key={reg.reg_id} className="hover:bg-white/[0.04] transition-colors cursor-pointer group" onClick={() => setSelectedReg(reg)}>
                              <td className="px-5 py-4 text-sm text-gray-500 font-black">{index + 1}</td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-sm font-black text-indigo-300 flex-shrink-0">
                                    {reg.full_name?.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-black text-white group-hover:text-cyan-300 transition-colors text-sm">{reg.full_name}</div>
                                    <div className="text-xs text-gray-400 font-bold truncate max-w-xs mt-0.5 tracking-wide">{reg.batch || 'No batch listed'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-sm text-gray-300">
                                <div className="font-medium">{reg.phone}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="text-xs text-gray-500 truncate max-w-[140px]">{reg.email}</div>
                                  {reg.phone && whatsappLink && activeTab === 'approved' && (
                                    <a href={`https://wa.me/91${reg.phone.replace(/[^0-9]/g, '').replace(/^91/, '')}?text=${encodeURIComponent(`Hello ${reg.full_name.split(' ')[0]}! 👋\n\nYou have successfully registered for *${session.eventTitle}* at ${BRAND_NAME} ${BRAND_YEAR}! 🎭\n\nPlease join the official WhatsApp group for important updates:\n\n${whatsappLink}`)}`}
                                      target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 rounded-lg px-2 py-1 transition-colors border border-transparent hover:border-green-500/25"
                                      onClick={(e) => e.stopPropagation()}>
                                      <WhatsAppLogo className="w-3.5 h-3.5 mr-1" /><span className="text-[10px] font-black uppercase">Invite</span>
                                    </a>
                                  )}
                                </div>
                              </td>
                              {activeTab === 'pending' && (
                                <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex justify-end gap-2">
                                    <button disabled={isUpdatingStatus === reg.reg_id} onClick={() => handleUpdateStatus(reg.reg_id, 'approved')}
                                      className="px-3 py-1.5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 hover:bg-indigo-500/25 rounded-xl text-xs font-black transition-all disabled:opacity-50">Approve</button>
                                    <button disabled={isUpdatingStatus === reg.reg_id} onClick={() => handleUpdateStatus(reg.reg_id, 'rejected')}
                                      className="px-3 py-1.5 bg-violet-500/15 text-violet-400 border border-violet-500/25 hover:bg-violet-500/25 rounded-xl text-xs font-black transition-all disabled:opacity-50">Reject</button>
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
            )}

            {/* ══ CHAT ══ */}
            {activeSection === 'chat' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Student Inbox</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Chat with registered students</p>
                </div>
                <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
                  <ChatPanel themeAccent="indigo" eventId={session?.eventId?.toString()} />
                </div>
              </div>
            )}

            {/* ══ ANNOUNCEMENTS ══ */}
            {activeSection === 'announcements' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Announcements</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Broadcast important updates to participants</p>
                </div>
                <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-5">
                  <AnnouncementsPanel mode="coordinator" eventTitle={session?.eventTitle} eventId={session?.eventId?.toString()} />
                </div>
              </div>
            )}

            {/* ══ SETTINGS ══ */}
            {activeSection === 'settings' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Event Settings</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Manage event-level controls</p>
                </div>

                {/* WhatsApp card */}
                <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/[0.06] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  <h3 className="text-sm font-black text-white mb-1 flex items-center gap-2 uppercase tracking-wider">
                    <MessageCircle size={15} className="text-cyan-500" />WhatsApp Group Link
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">This link is sent to approved participants when you invite them.</p>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <LinkIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input type="url" value={whatsappLink} onChange={(e) => setWhatsappLink(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-sm"
                        placeholder="https://chat.whatsapp.com/..." />
                    </div>
                    <button onClick={handleSaveLink} disabled={linkSaving} className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-black rounded-xl text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                      <Save size={15} />{linkSaving ? 'Saving...' : 'Save'}
                    </button>
                    {whatsappLink && (
                      <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                        className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 border border-white/10 rounded-xl text-gray-300 bg-white/5 hover:bg-white/10 transition-all">
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Registration toggle */}
                {registrationOpen !== null && (
                  <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${registrationOpen ? 'bg-cyan-500/[0.08] border-cyan-500/20' : 'bg-violet-500/[0.08] border-violet-500/20'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${registrationOpen ? 'bg-cyan-500/20' : 'bg-violet-500/20'}`}>
                        {registrationOpen ? <Unlock className="w-5 h-5 text-cyan-400" /> : <Lock className="w-5 h-5 text-violet-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-white text-sm">Registration Gate</h3>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${registrationOpen ? 'bg-cyan-400 text-cyan-950' : 'bg-violet-400 text-violet-950'}`}>{registrationOpen ? 'OPEN' : 'CLOSED'}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{registrationOpen ? 'Participants can currently register.' : 'Registrations are closed.'}</p>
                      </div>
                    </div>
                    <button onClick={handleToggleRegistration} disabled={isTogglingReg}
                      className={`flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all border disabled:opacity-50 ${registrationOpen ? 'bg-violet-500/15 border-violet-500/25 text-violet-300 hover:bg-violet-500/25' : 'bg-cyan-500/15 border-cyan-500/25 text-cyan-300 hover:bg-cyan-500/25'}`}>
                      {isTogglingReg ? <RefreshCw className="w-4 h-4 animate-spin" /> : registrationOpen ? <><ToggleRight className="w-5 h-5" />Close Registration</> : <><ToggleLeft className="w-5 h-5" />Open Registration</>}
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ─── MOBILE BOTTOM NAV ─── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-2xl border-t border-white/10 flex items-stretch">
        {([
          { key: 'participants', label: 'People', icon: Users },
          { key: 'chat', label: 'Chat', icon: MessageCircle },
          { key: 'announcements', label: 'Announce', icon: Mail },
          { key: 'settings', label: 'Settings', icon: LinkIcon },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveSection(key)}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[10px] font-black uppercase tracking-wider transition-all relative ${activeSection === key ? 'text-indigo-400' : 'text-gray-600 hover:text-gray-400'}`}>
            {activeSection === key && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-indigo-500" />}
            <Icon className="w-5 h-5" />
            {label}
            {key === 'participants' && pendingCount > 0 && (
              <span className="absolute top-2 right-[calc(50%-14px)] text-[9px] font-black bg-yellow-400 text-yellow-900 w-4 h-4 rounded-full flex items-center justify-center">{pendingCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ══ REGISTRATION DETAIL MODAL ══ */}
      {selectedReg && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-950/95 backdrop-blur-xl border border-white/10 sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95svh] sm:max-h-[90vh] overflow-hidden flex flex-col rounded-t-2xl">
            <div className="px-5 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/25 flex items-center justify-center text-sm font-black text-indigo-300 flex-shrink-0">
                  {selectedReg.full_name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-black text-white truncate">{selectedReg.full_name}</h2>
                  <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">ID: {selectedReg.reg_id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedReg(null)} className="ml-3 flex-shrink-0 text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 pb-2 border-b border-white/[0.08]">Basic Info</h3>
                  {[
                    { label: 'Email', val: selectedReg.email },
                    { label: 'Phone', val: selectedReg.phone },
                    { label: 'Batch', val: selectedReg.batch },
                    ...(selectedReg.gender ? [{ label: 'Gender', val: selectedReg.gender }] : []),
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-gray-200 break-all">{val || 'N/A'}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 pb-2 border-b border-white/[0.08]">Registration</h3>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-3">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Status</p>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        selectedReg.status?.toLowerCase() === 'approved' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/25' :
                        selectedReg.status?.toLowerCase() === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/25' :
                        'bg-violet-500/20 text-violet-400 border border-violet-500/25'
                      }`}>{selectedReg.status}</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1">Registered On</p>
                      <p className="text-sm font-semibold text-gray-200">{new Date(selectedReg.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
              {selectedReg.custom_answers && Object.keys(selectedReg.custom_answers).length > 0 && (
                <div className="mt-5 pt-5 border-t border-white/[0.08]">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3">Additional Info</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(selectedReg.custom_answers).map(([key, value]) => (
                      <div key={key} className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <dt className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">{key.replace(/_/g, ' ')}</dt>
                        <dd className="text-sm font-semibold text-gray-200 break-words">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              {selectedReg.team_members && Array.isArray(selectedReg.team_members) && selectedReg.team_members.length > 0 && (
                <div className="mt-5 pt-5 border-t border-white/[0.08]">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />Team Members ({selectedReg.team_members.length})
                  </h3>
                  <div className="bg-white/5 rounded-2xl border border-white/[0.08] overflow-hidden divide-y divide-white/5">
                    {selectedReg.team_members.map((member: any, idx: number) => (
                      <div key={idx} className="p-3 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/25 flex items-center justify-center text-purple-300 font-black text-[11px] flex-shrink-0">{idx + 1}</div>
                        <div>
                          <div className="text-sm font-black text-gray-200">{member.name || member.full_name}</div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500">
                            {member.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{member.email}</span>}
                            {member.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{member.phone}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-4 bg-white/5 border-t border-white/[0.08] flex justify-end gap-3">
              {selectedReg.status?.toLowerCase() === 'pending' && (
                <>
                  <button disabled={isUpdatingStatus === selectedReg.reg_id} onClick={() => handleUpdateStatus(selectedReg.reg_id, 'rejected')}
                    className="px-5 py-2.5 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/30 rounded-xl text-sm font-black transition-all disabled:opacity-50 flex items-center gap-2">
                    <X className="w-4 h-4" />Reject
                  </button>
                  <button disabled={isUpdatingStatus === selectedReg.reg_id} onClick={() => handleUpdateStatus(selectedReg.reg_id, 'approved')}
                    className="px-5 py-2.5 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-xl text-sm font-black transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                    <CheckCircle className="w-4 h-4" />Approve
                  </button>
                </>
              )}
              {selectedReg.status?.toLowerCase() !== 'pending' && (
                <button onClick={() => setSelectedReg(null)} className="px-6 py-2.5 bg-white/10 text-white hover:bg-white/20 border border-white/10 rounded-xl text-sm font-black transition-all">Close</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ BULK WHATSAPP INVITE MODAL ══ */}
      {showBulkInvite && session && whatsappLink && (() => {
        const eligible = rpcRegistrations.filter((r: any) => r.status?.toLowerCase() === 'approved' && r.phone);
        const sentCount = eligible.filter((r: any) => invitedSet.has(r.reg_id)).length;
        const progress = eligible.length > 0 ? Math.round((sentCount / eligible.length) * 100) : 0;
        return (
          <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-950/95 backdrop-blur-xl border border-white/10 sm:rounded-2xl rounded-t-2xl shadow-2xl w-full sm:max-w-lg max-h-[90svh] flex flex-col">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div>
                  <h2 className="font-black text-white text-base flex items-center gap-2"><SendHorizonal className="w-4 h-4 text-green-400" />Bulk WhatsApp Invite</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{eligible.length} approved participants with phone numbers</p>
                </div>
                <button onClick={() => setShowBulkInvite(false)} className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="px-5 py-3 border-b border-white/5 bg-black/20">
                <div className="flex items-center justify-between text-xs font-black mb-2">
                  <span className="text-gray-400">Progress</span>
                  <span className={sentCount === eligible.length && eligible.length > 0 ? 'text-green-400' : 'text-white'}>{sentCount} / {eligible.length} sent</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-indigo-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="overflow-y-auto flex-1 divide-y divide-white/5">
                {eligible.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 text-sm">No approved participants with phone numbers.</div>
                ) : eligible.map((reg: any) => {
                  const isSent = invitedSet.has(reg.reg_id);
                  const phone = reg.phone.replace(/[^0-9]/g, '').replace(/^91/, '');
                  const waLink = `https://wa.me/91${phone}?text=${encodeURIComponent(`Hello ${reg.full_name.split(' ')[0]}! 👋\n\nYou have been approved for *${session.eventTitle}* at ${BRAND_NAME} ${BRAND_YEAR}! 🎭\n\nJoin our WhatsApp group:\n\n${whatsappLink}`)}`;
                  return (
                    <div key={reg.reg_id} className={`flex items-center justify-between gap-3 px-5 py-3.5 ${isSent ? 'bg-green-500/5' : 'hover:bg-white/[0.04]'}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-xs font-black text-purple-300 flex-shrink-0">{reg.full_name?.charAt(0)}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-white truncate">{reg.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">{reg.phone}</p>
                        </div>
                      </div>
                      {isSent ? (
                        <span className="flex-shrink-0 flex items-center gap-1 text-xs font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-xl">
                          <CheckCircle className="w-3.5 h-3.5" />Sent
                        </span>
                      ) : (
                        <a href={waLink} target="_blank" rel="noopener noreferrer"
                          onClick={() => setInvitedSet(prev => new Set([...prev, reg.reg_id]))}
                          className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-black text-white bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 rounded-xl transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)]">
                          <WhatsAppLogo className="w-3.5 h-3.5" />Send
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-4 border-t border-white/10 bg-white/5 flex items-center justify-between gap-3">
                {sentCount > 0 && <button onClick={() => setInvitedSet(new Set())} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Reset progress</button>}
                <button onClick={() => setShowBulkInvite(false)} className="ml-auto px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-black text-white transition-all">
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
