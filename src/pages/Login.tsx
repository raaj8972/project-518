import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Shield, Users, Zap, Key, BarChart3, Eye, EyeOff, ChevronRight, Trophy, Lock, ArrowLeft } from 'lucide-react';
import BrandLogo3D from '../components/BrandLogo3D';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { SEO } from '../components/SEO';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import { AdminService, AdminUser } from '../lib/adminService';
import { isMasterOwner } from '../constants/owners';
import { gsap } from 'gsap';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requiresTOTP, setRequiresTOTP] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairEmail, setRepairEmail] = useState('');
  const [repairMasterKey, setRepairMasterKey] = useState('');
  const [repairLoading, setRepairLoading] = useState(false);
  const [repairMessage, setRepairMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  const { login, loginWithGoogle, isAuthenticated, loading: authLoading, lastAuthError } = useAuth();
  const navigate = useNavigate();
  const { homepageSettings, isAdmin, isOwner, loading: dataLoading } = useData();
  const supabaseHost = (useData() as any)?.supabaseHost as string | undefined;
  const SHOW_SUPABASE = ((import.meta as any)?.env?.VITE_DEBUG_SHOW_SUPABASE_HOST === '1');

  // Mouse parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // GSAP Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Left panel entrance
      gsap.from(leftPanelRef.current, {
        opacity: 0,
        x: -60,
        duration: 1.2,
        ease: 'power3.out'
      });

      // Card entrance
      gsap.from(cardRef.current, {
        opacity: 0,
        x: 60,
        duration: 1.2,
        ease: 'power3.out',
        delay: 0.1
      });

      // Stagger items
      gsap.from('.stagger-item', {
        opacity: 0,
        y: 20,
        stagger: 0.08,
        duration: 0.7,
        ease: 'power2.out',
        delay: 0.5
      });

      // Floating card
      gsap.to(cardRef.current, {
        y: '+=8',
        duration: 3.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      });

      // Left panel subtle float
      gsap.to(leftPanelRef.current, {
        y: '+=5',
        duration: 4.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Form toggle animation
  useEffect(() => {
    if (isFormOpen) {
      gsap.to(buttonsRef.current, {
        opacity: 0,
        x: -20,
        duration: 0.35,
        ease: 'power2.in',
        onComplete: () => {
          if (buttonsRef.current) buttonsRef.current.style.display = 'none';
        }
      });
      setTimeout(() => {
        if (formRef.current) formRef.current.style.display = 'block';
        gsap.fromTo(formRef.current,
          { opacity: 0, x: 20 },
          { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }
        );
      }, 350);
    }
  }, [isFormOpen]);

  // Video auto-restart
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const playVideo = () => { video.play().catch(() => {}); };
    const handleVisibilityChange = () => {
      if (!document.hidden && video.paused) playVideo();
    };
    video.addEventListener('loadeddata', playVideo);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      video.removeEventListener('loadeddata', playVideo);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Fetch Admin Users for dropdown
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const fetchedAdmins = await AdminService.getAllAdmins();
        
        // Always ensure system owners are present even if DB read fails (RLS)
        const systemOwners: AdminUser[] = [
          { user_id: 'hardcoded-raaj', email: 'ricorrenza.theiqcityfestival@gmail.com', role: 'owner', created_at: '' }
        ];

        // Merge and deduplicate by email
        const merged = [...fetchedAdmins];
        systemOwners.forEach(owner => {
          if (!merged.find(a => a.email.toLowerCase() === owner.email.toLowerCase())) {
            merged.push(owner);
          }
        });

        // merged list logic remains for pre-selection
        setAdminUsers(merged);
        
        // Pre-select Raaj if available
        const raaj = merged.find(a => isMasterOwner(a.email));
        if (raaj) setEmail(raaj.email);
        else if (merged.length > 0) setEmail(merged[0].email);
      } catch (err) {
        console.error('Failed to pre-fetch admin users:', err);
        // Minimum safety fallback
        setEmail('ricorrenza.theiqcityfestival@gmail.com');
      } finally {
        // isLoading handled
      }
    };
    fetchAdmins();
  }, []);

  // Fast-Track Auto-Login for Owners
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isMasterMode = searchParams.get('mode') === 'master';
    const gatePass = sessionStorage.getItem('rico_master_gate_access');
    const fastTrackCreds = sessionStorage.getItem('rico_fast_track_creds');

    if (isMasterMode && gatePass?.startsWith('vault_v2_') && fastTrackCreds) {
      try {
        const { e, p } = JSON.parse(fastTrackCreds);
        setEmail(e);
        setPassword(p);
        sessionStorage.removeItem('rico_fast_track_creds');
        const timer = setTimeout(() => {
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
          handleSubmit(fakeEvent);
        }, 500);
        return () => clearTimeout(timer);
      } catch (err) {
        console.error('Fast-track failed:', err);
        sessionStorage.removeItem('rico_fast_track_creds');
      }
    }
  }, []);

  // Auto-redirect if already authenticated as Admin
  useEffect(() => {
    if (!authLoading && !dataLoading && isAuthenticated) {
      if (isAdmin() || isOwner()) {
        console.log('[Login] User already authenticated as Admin/Owner, redirecting to Dashboard...');
        const timer = setTimeout(() => {
          navigate('/admin', { replace: true });
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [authLoading, dataLoading, isAuthenticated, isAdmin, isOwner, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const isMasterMode = searchParams.get('mode') === 'master';
      const gatePass = sessionStorage.getItem('rico_master_gate_access');
      const isGatePassValid = gatePass && gatePass.startsWith('vault_v2_');

      const result = await login(
        email,
        password,
        totpCode || undefined,
        Boolean(isMasterMode && isGatePassValid)
      );

      if (result.success) {
        navigate('/admin');
      } else if (result.requiresTOTP) {
        if (result.role === 'owner' && (!isMasterMode || !isGatePassValid)) {
          sessionStorage.setItem('rico_fast_track_creds', JSON.stringify({ e: email, p: password }));
          setError('Security Handshake Required. Initiating Fast-Track...');
          setIsLoading(true);
          setTimeout(() => { navigate('/master-node-access'); }, 800);
          return;
        }
        setRequiresTOTP(true);
        setError('');
      } else {
        setError(result.error || 'Authentication failed. Please try again.');
      }
    } catch (error: any) {
      console.warn('[Auth] Login exception:', error);
      setError(error.message || 'Authentication failed. Check your connection.');
    }

    setIsLoading(false);
  };

  const handleRepairAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setRepairLoading(true);
    setRepairMessage(null);
    try {
      const res = await fetch('/.netlify/functions/admin-security-controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'repair_auth', 
          email: repairEmail, 
          masterKey: repairMasterKey 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRepairMessage({ type: 'success', text: data.message });
      } else {
        throw new Error(data.error || 'Repair failed');
      }
    } catch (err: any) {
      setRepairMessage({ type: 'error', text: err.message });
    } finally {
      setRepairLoading(false);
    }
  };

  const handleBackToPassword = () => {
    setRequiresTOTP(false);
    setTotpCode('');
    setError('');
    setIsFormOpen(false);

    gsap.to(formRef.current, {
      opacity: 0, x: 20, duration: 0.35, ease: 'power2.in',
      onComplete: () => {
        if (formRef.current) formRef.current.style.display = 'none';
        if (buttonsRef.current) buttonsRef.current.style.display = 'flex';
        gsap.fromTo(buttonsRef.current,
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }
        );
      }
    });
  };

  const isMasterActive = (() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('mode') === 'master' &&
      sessionStorage.getItem('rico_master_gate_access')?.startsWith('vault_v2_');
  })();

  const roles = [
    { label: 'Admin Panel', sub: 'High-level orchestration', icon: Zap, color: 'cyan', action: () => setIsFormOpen(true) },
    { label: 'Security Node', sub: 'Scan & Entry verification', icon: Shield, color: 'purple', action: () => navigate('/security-login') },
    { label: 'Coordinators', sub: 'Event management', icon: Users, color: 'blue', action: () => navigate('/coordinator') },
    { label: 'Council', sub: 'Analytics dashboard', icon: BarChart3, color: 'emerald', action: () => navigate('/council') },
    { label: 'Sports Admin', sub: 'Tournament & Player management', icon: Trophy, color: 'rose', action: () => navigate('/sports-admin') },
  ];

  const colorMap: Record<string, { border: string; bg: string; text: string; glow: string; ring: string }> = {
    cyan:    { border: 'border-cyan-500/40',    bg: 'bg-cyan-400/10',    text: 'text-cyan-400',    glow: 'shadow-cyan-500/20',   ring: 'group-hover:shadow-[0_0_22px_rgba(34,211,238,0.25)]' },
    purple:  { border: 'border-purple-500/40',  bg: 'bg-purple-400/10',  text: 'text-purple-400',  glow: 'shadow-purple-500/20', ring: 'group-hover:shadow-[0_0_22px_rgba(167,139,250,0.25)]' },
    blue:    { border: 'border-blue-500/40',    bg: 'bg-blue-400/10',    text: 'text-blue-400',    glow: 'shadow-blue-500/20',   ring: 'group-hover:shadow-[0_0_22px_rgba(96,165,250,0.25)]' },
    emerald: { border: 'border-emerald-500/40', bg: 'bg-emerald-400/10', text: 'text-emerald-400', glow: 'shadow-emerald-500/20',ring: 'group-hover:shadow-[0_0_22px_rgba(52,211,153,0.25)]' },
    rose:    { border: 'border-rose-500/40',    bg: 'bg-rose-400/10',    text: 'text-rose-400',    glow: 'shadow-rose-500/20',   ring: 'group-hover:shadow-[0_0_22px_rgba(251,113,133,0.25)]' },
  };

  return (
    <div className="cyberpunk-theme min-h-screen bg-[#050508] overflow-hidden font-rajdhani">
      <SEO
        title="Login"
        description={`Admin login for ${BRAND_NAME} ${BRAND_YEAR} management dashboard.`}
        canonical="https://ricorrenza.fun/login"
      />


      {/* Video Background */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay loop muted playsInline preload="metadata"
          className="absolute inset-0 w-full h-full object-cover opacity-30 scale-105"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        >
          <source src="/login_page_video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-black via-[#050510] to-black opacity-80" />
        {/* Scanning line */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-15">
          <div className="w-full h-[1px] bg-cyan-400/60 animate-scan" />
        </div>
      </div>

      {/* Main Layout */}
      <div ref={containerRef} className="relative z-10 min-h-screen flex items-stretch">

        {/* ─── LEFT PANEL ─── */}
        <div
          ref={leftPanelRef}
          className="hidden lg:flex flex-col items-center justify-center flex-1 relative overflow-hidden p-16"
          style={{
            transform: `translate(${mousePos.x * -8}px, ${mousePos.y * -5}px)`,
            transition: 'transform 0.15s ease-out',
          }}
        >
          {/* Grid background */}
          <div className="absolute inset-0 left-panel-grid opacity-20" />
          {/* Radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(34,211,238,0.07),transparent)]" />

          {/* Corner brackets */}
          <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-cyan-400/40" />
          <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-cyan-400/40" />
          <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-cyan-400/40" />
          <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-cyan-400/40" />

          {/* Content */}
          <div className="relative z-10 text-center max-w-sm">
            {/* Logo */}
            <div className="mb-10 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-cyan-400/10 blur-3xl scale-150" />
                {(() => {
                  const raw = (homepageSettings as any)?.brand_logo_url as string | undefined;
                  const accent = (homepageSettings as any)?.brand_logo_glow_color as string | undefined;
                  if (!raw) return (
                    <div className="relative w-28 h-28 flex items-center justify-center rounded-full bg-cyan-400/5 border border-cyan-400/20">
                      <Shield className="w-16 h-16 text-cyan-400 opacity-80" />
                    </div>
                  );
                  let u = String(raw).trim();
                  if (u.startsWith('//')) u = 'https:' + u;
                  const src = u.includes('?') ? `${u}&v=${Date.now()}` : `${u}?v=${Date.now()}`;
                  return <BrandLogo3D src={src} size={110} glowStrength={2.5} glowColor={accent} />;
                })()}
              </div>
            </div>

            {/* Title */}
            <p className="left-panel-eyebrow text-[10px] font-bold tracking-[0.5em] text-cyan-400/60 uppercase mb-3">
              Authentication Gateway
            </p>
            <h2 className="text-5xl font-extrabold text-white tracking-tighter uppercase leading-none mb-2">
              {BRAND_NAME}
            </h2>
            <p className="text-gray-500 text-sm font-medium tracking-widest uppercase mb-10">
              Admin Control System
            </p>

            {/* Status chips */}
            <div className="flex flex-col gap-2.5">
              {[
                { icon: Shield, label: 'SSL Encrypted Tunnel', color: 'emerald' },
                { icon: Lock, label: 'Multi-Factor Auth Ready', color: 'cyan' },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full border ${
                  color === 'emerald' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
                </div>
              ))}
            </div>

            {/* Version */}
            <p className="mt-10 text-[10px] font-mono text-gray-700 tracking-[0.3em] uppercase">
              OS v2.6 · {BRAND_YEAR}
            </p>
          </div>
        </div>

        {/* ─── DIVIDER ─── */}
        <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent" />

        {/* ─── RIGHT PANEL (Login Card) ─── */}
        <div className="flex-1 lg:flex-none lg:w-[480px] xl:w-[520px] flex items-center justify-center p-4 sm:p-8">
          <div ref={cardRef} className="w-full max-w-md lg:max-w-none">
            {/* Card */}
            <div className="login-card overflow-hidden">
              {/* Top accent bar */}
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

              <div className="p-6 sm:p-8">

                {/* ── Header ── */}
                <div className="mb-8 stagger-item">
                  {/* Brand logo (mobile only) */}
                  <div className="lg:hidden flex justify-center mb-5">
                    <div className="relative p-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
                      {(() => {
                        const raw = (homepageSettings as any)?.brand_logo_url as string | undefined;
                        const accent = (homepageSettings as any)?.brand_logo_glow_color as string | undefined;
                        if (!raw) return <div className="h-12 w-12 flex items-center justify-center text-cyan-400"><Shield className="w-7 h-7" /></div>;
                        let u = String(raw).trim();
                        if (u.startsWith('//')) u = 'https:' + u;
                        const src = u.includes('?') ? `${u}&v=${Date.now()}` : `${u}?v=${Date.now()}`;
                        return <BrandLogo3D src={src} size={52} glowStrength={1.5} glowColor={accent} />;
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold tracking-[0.4em] text-cyan-400/50 uppercase mb-1">
                        {requiresTOTP ? 'Two-Factor Verification' : 'Access Portal'}
                      </p>
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tighter text-white uppercase">
                        {requiresTOTP ? '2FA Required' : isFormOpen ? 'Admin Login' : 'Select Role'}
                      </h1>
                    </div>

                    {/* Master node badge */}
                    {isMasterActive && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 animate-pulse">
                        <Shield className="w-3 h-3 text-cyan-400" />
                        <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest">Master</span>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="mt-4 h-px bg-gradient-to-r from-white/10 via-cyan-400/20 to-transparent" />
                </div>

                {/* ── Content Area ── */}
                <div className="relative">

                  {/* ── Identity Quick Select (INSTANT ACCESS) ── */}
                  {!isFormOpen && !requiresTOTP && adminUsers.length > 0 && (
                    <div className="mb-8 stagger-item">
                      <p className="text-[9px] font-bold tracking-[0.3em] text-cyan-400/60 uppercase mb-4">
                        Quick Identity Select
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {adminUsers.filter(u => u.email).slice(0, 4).map((a) => {
                          const isOwner = isMasterOwner(a.email);
                          return (
                            <button
                              key={a.email}
                              onClick={() => {
                                setEmail(a.email);
                                setIsFormOpen(true);
                                // Focus password field after animation
                                setTimeout(() => {
                                  const pwdInput = document.querySelector('input[type="password"]') as HTMLInputElement;
                                  if (pwdInput) pwdInput.focus();
                                }, 600);
                              }}
                              className={`flex-1 min-w-[120px] p-3 rounded-2xl border transition-all duration-300 group/id relative overflow-hidden ${
                                isOwner 
                                  ? 'bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50' 
                                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                              }`}
                            >
                              {/* Background glow */}
                              <div className={`absolute inset-0 opacity-0 group-hover/id:opacity-20 transition-opacity duration-500 ${isOwner ? 'bg-cyan-400' : 'bg-white'}`} style={{ filter: 'blur(20px)' }} />
                              
                              <div className="relative z-10 flex flex-col items-center gap-2">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-transform duration-500 group-hover/id:scale-110 ${
                                  isOwner ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/10 border-white/20 text-white/70'
                                }`}>
                                  {isOwner ? <Shield size={18} /> : <Users size={18} />}
                                </div>
                                <div className="text-center">
                                  <p className="text-[10px] font-black text-white truncate w-full max-w-[100px] uppercase tracking-tighter">
                                    {isOwner ? 'Raaj (Owner)' : a.email.split('@')[0]}
                                  </p>
                                  <p className={`text-[8px] font-bold uppercase tracking-widest ${isOwner ? 'text-cyan-500/70' : 'text-gray-500'}`}>
                                    {a.role || 'Admin'}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Role Selection Buttons ── */}
                  <div ref={buttonsRef} className="flex flex-col gap-2.5 stagger-item">
                    <p className="text-[9px] font-bold tracking-[0.3em] text-gray-600 uppercase mb-1.5">
                      Standard Access Roles
                    </p>

                    {roles.map(({ label, sub, icon: Icon, color, action }) => {
                      const c = colorMap[color];
                      return (
                        <button
                          key={label}
                          onClick={action}
                          className={`role-btn group relative overflow-hidden border ${c.border} ${c.ring}`}
                        >
                          {/* Left color bar */}
                          <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${c.bg} opacity-0 group-hover:opacity-100 transition-all duration-300`}
                            style={{ background: `var(--${color}-bar)` }}
                          />
                          <div className={`absolute left-0 top-0 bottom-0 w-[3px] role-bar-${color}`} />

                          <div className="flex items-center gap-3.5">
                            <div className={`p-2.5 rounded-xl ${c.bg} ${c.text} group-hover:scale-110 transition-transform duration-200`}>
                              <Icon size={18} />
                            </div>
                            <div className="text-left">
                              <p className={`font-bold text-sm text-white group-hover:${c.text} transition-colors duration-200`}>{label}</p>
                              <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>
                            </div>
                          </div>

                          <ChevronRight size={16} className={`text-gray-700 group-hover:${c.text} group-hover:translate-x-1 transition-all duration-200`} />
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Login Form ── */}
                  <div ref={formRef} style={{ display: 'none' }}>
                    <div className="space-y-5">

                      {/* Back button */}
                      <button
                        type="button"
                        onClick={handleBackToPassword}
                        className="inline-flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-cyan-400 uppercase tracking-widest font-bold transition-colors mb-1"
                      >
                        <ArrowLeft size={12} />
                        Back to roles
                      </button>

                      {/* Error */}
                      {error && (
                        <div className="p-3 rounded-xl bg-red-500/8 border border-red-500/25 flex items-center gap-3 animate-shake">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                          <span className="text-red-400 text-xs font-medium">{error}</span>
                        </div>
                      )}

                      {lastAuthError && !error && (
                        <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/25 flex items-center gap-3 animate-pulse">
                          <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-amber-400 text-xs font-medium">{lastAuthError}</span>
                        </div>
                      )}

                      {/* ═══ SECURE ACCESS: Dropdown + Password ═══ */}
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/15 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="w-4 h-4 text-cyan-400" />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Secure Access</span>
                        </div>

                        <form 
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setIsLoading(true);
                            setError('');
                            const res = await login(email, password);
                            if (res.success) {
                              navigate('/admin');
                            } else if (res.requiresTOTP) {
                              setRequiresTOTP(true);
                              setIsLoading(false);
                            } else {
                              setIsLoading(false);
                              setError(res.error || 'Invalid credentials');
                            }
                          }}
                          className="space-y-3"
                        >

                        {/* Admin/Owner Dropdown */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase tracking-[0.25em] text-cyan-400/60 font-bold">Select Identity</label>
                          <div className="relative group">
                            <select
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="input-cyber appearance-none pr-10 cursor-pointer hover:border-cyan-400/40 transition-all font-bold"
                            >
                              <option value="" disabled className="bg-[#0a0a15] text-gray-500">Select User</option>
                              {/* RAAJ/RAJA are pre-filled by fetchAdmins useEffect which includes all fetched admins */}
                              {adminUsers.filter(u => u.email).map((a: any) => (
                                <option key={a.email} value={a.email} className="bg-[#0a0a15] text-white">
                                  {isMasterOwner(a.email) ? 'Raaj — OWNER' : `${a.email.split('@')[0].toUpperCase()} — ${a.role?.toUpperCase() || 'ADMIN'}`}
                                </option>
                              ))}
                            </select>
                            <input type="hidden" name="username" value={email} autoComplete="username" />
                            <Users className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-cyan-400 pointer-events-none transition-colors" />
                          </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between px-1">
                            <label className="text-[9px] uppercase tracking-[0.25em] text-cyan-400/60 font-bold">Access Key</label>
                          </div>
                          <div className="relative group">
                            <input
                              type={showPassword ? "text" : "password"}
                              name="password"
                              autoComplete="current-password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Access Key"
                              className="input-cyber pr-12"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-cyan-400 transition-colors"
                            >
                              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>

                        {/* Login Button */}
                        <button
                          type="button"
                          disabled={isLoading || !email || !password}
                          onClick={async () => {
                            setIsLoading(true);
                            setError('');
                            const res = await login(email, password);
                            if (res.success) {
                              navigate('/admin');
                            } else if (res.requiresTOTP) {
                              setRequiresTOTP(true);
                              setIsLoading(false);
                            } else {
                              setIsLoading(false);
                              setError(res.error || 'Invalid credentials');
                            }
                          }}
                          className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-cyan-600/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Authenticating...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              <Key size={14} />
                              Secure Login
                            </span>
                          )}
                        </button>
                        </form>
                      </div>

                      {/* Global Forgot Password Link */}
                      <div className="text-center pt-1 pb-2">
                        <Link 
                          to="/forgot-password" 
                          className="text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-cyan-400 transition-colors font-black flex items-center justify-center gap-2 group"
                        >
                          <Lock size={10} className="text-gray-600 group-hover:text-cyan-400 transition-colors" />
                          Forgot your password? Reset Identity
                        </Link>
                      </div>

                      {/* Divider */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-[9px] font-bold tracking-widest uppercase text-gray-600">Admin Sign-In</span>
                        <div className="flex-1 h-px bg-white/10" />
                      </div>

                      {/* ═══ ADMIN LOGIN: Google Sign-In ═══ */}
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={async () => {
                          setIsLoading(true);
                          setError('');
                          const res = await loginWithGoogle();
                          if (res.success) {
                            navigate('/admin');
                          } else {
                            setIsLoading(false);
                            setError(res.error || 'Google Sign-In failed');
                          }
                        }}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-white hover:bg-gray-100 text-gray-800 font-bold text-sm uppercase tracking-widest transition-all duration-300 shadow-lg shadow-white/10 hover:shadow-white/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <>
                            <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            Authenticating...
                          </>
                        ) : (
                          <>
                            <svg width="18" height="18" viewBox="0 0 48 48">
                              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                            </svg>
                            Sign in with Google
                          </>
                        )}
                      </button>
                      <p className="text-[9px] text-gray-600 text-center">Only owner-approved Gmail accounts can sign in.</p>

                      {/* Emergency Repair trigger */}
                      <div className="pt-2 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setShowRepairModal(true)}
                          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 hover:border-cyan-500/30 bg-white/5 hover:bg-cyan-500/5 transition-all"
                        >
                          <Lock size={10} className="text-gray-600 group-hover:text-cyan-400" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-cyan-400">Locked out? Emergency Repair</span>
                        </button>
                      </div>




                    </div>
                  </div>

                </div>

                {/* ── Footer ── */}
                <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between stagger-item">
                  <div className="flex items-center gap-2 text-gray-700 text-[9px] uppercase font-bold tracking-widest">
                    <Shield size={11} className="text-emerald-500/50" />
                    SSL Active
                  </div>
                  <div className="text-gray-700 text-[9px] font-mono">
                    {SHOW_SUPABASE && supabaseHost ? `NODE: ${supabaseHost.slice(0, 12)}...` : `${BRAND_NAME} · ${BRAND_YEAR}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Copyright */}
            <p className="mt-5 text-center text-gray-700 text-[10px] uppercase tracking-[0.4em] font-medium stagger-item">
              © {BRAND_YEAR} {BRAND_NAME} Fest Committee
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Repair Modal */}
      {showRepairModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0a0a15] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20 overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-extrabold text-white uppercase tracking-tighter">Emergency Auth Repair</h3>
              </div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Rebuild identity from Master Node</p>
            </div>
            
            <form onSubmit={handleRepairAuth} className="p-6 space-y-4">
              {repairMessage && (
                <div className={`p-3 rounded-xl border text-xs font-medium ${
                  repairMessage.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'
                }`}>
                  {repairMessage.text}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-widest text-cyan-400/60 font-black">Target Email</label>
                <input
                  type="email"
                  required
                  value={repairEmail}
                  onChange={(e) => setRepairEmail(e.target.value)}
                  placeholder="e.g. email@gmail.com"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-cyan-400/40 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-widest text-cyan-400/60 font-black">Master Bypass Key</label>
                <input
                  type="password"
                  required
                  value={repairMasterKey}
                  onChange={(e) => setRepairMasterKey(e.target.value)}
                  placeholder="Paste Master Key here"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-cyan-400/40 outline-none transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRepairModal(false);
                    setRepairMessage(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-white/10 rounded-xl text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={repairLoading || !repairEmail || !repairMasterKey}
                  className="flex-1 px-4 py-2.5 bg-cyan-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50"
                >
                  {repairLoading ? 'Repairing...' : 'Run Repair'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

        .font-rajdhani { font-family: 'Rajdhani', sans-serif; }

        /* ── Left panel grid ── */
        .left-panel-grid {
          background-image:
            linear-gradient(rgba(34,211,238,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.06) 1px, transparent 1px);
          background-size: 48px 48px;
          background-position: center center;
        }

        /* ── Login Card ── */
        .login-card {
          background: rgba(10, 10, 18, 0.85);
          backdrop-filter: blur(30px) saturate(180%);
          border: 1px solid rgba(34, 211, 238, 0.12);
          border-radius: 1.5rem;
          box-shadow:
            0 32px 64px -12px rgba(0,0,0,0.7),
            0 0 0 1px rgba(255,255,255,0.04),
            0 0 60px rgba(34,211,238,0.04),
            inset 0 0 1px rgba(255,255,255,0.08);
          position: relative;
        }

        /* Corner brackets on card */
        .login-card::before,
        .login-card::after {
          content: '';
          position: absolute;
          width: 14px;
          height: 14px;
          border-color: rgba(34,211,238,0.35);
          border-style: solid;
        }
        .login-card::before {
          top: 12px; left: 12px;
          border-width: 1.5px 0 0 1.5px;
          border-radius: 2px 0 0 0;
        }
        .login-card::after {
          bottom: 12px; right: 12px;
          border-width: 0 1.5px 1.5px 0;
          border-radius: 0 0 2px 0;
        }

        /* ── Role buttons ── */
        .role-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-radius: 1rem;
          background: rgba(255,255,255,0.025);
          transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .role-btn:hover {
          background: rgba(255,255,255,0.05);
          transform: translateX(3px);
        }

        /* Color bars for each role */
        .role-bar-cyan    { background: linear-gradient(to bottom, #22d3ee, #0891b2); width: 3px; position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px 0 0 4px; opacity: 0; transition: opacity 0.25s; }
        .role-bar-purple  { background: linear-gradient(to bottom, #a78bfa, #7c3aed); width: 3px; position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px 0 0 4px; opacity: 0; transition: opacity 0.25s; }
        .role-bar-blue    { background: linear-gradient(to bottom, #60a5fa, #2563eb); width: 3px; position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px 0 0 4px; opacity: 0; transition: opacity 0.25s; }
        .role-bar-emerald { background: linear-gradient(to bottom, #34d399, #059669); width: 3px; position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px 0 0 4px; opacity: 0; transition: opacity 0.25s; }
        .role-bar-rose    { background: linear-gradient(to bottom, #fb7185, #e11d48); width: 3px; position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px 0 0 4px; opacity: 0; transition: opacity 0.25s; }
        .role-btn:hover .role-bar-cyan,
        .role-btn:hover .role-bar-purple,
        .role-btn:hover .role-bar-blue,
        .role-btn:hover .role-bar-emerald,
        .role-btn:hover .role-bar-rose { opacity: 1; }

        /* ── Inputs ── */
        .input-cyber {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.875rem;
          padding: 0.7rem 2.5rem 0.7rem 1rem;
          color: white;
          font-weight: 500;
          font-size: 0.9rem;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        .input-cyber:focus {
          outline: none;
          background: rgba(34,211,238,0.03);
          border-color: rgba(34,211,238,0.4);
          box-shadow: 0 0 0 3px rgba(34,211,238,0.06);
        }
        .input-cyber::placeholder { color: rgba(255,255,255,0.2); }

        /* ── Primary button ── */
        .btn-primary-cyber {
          background: linear-gradient(135deg, #22d3ee, #0891b2);
          color: #000;
          padding: 0.75rem;
          border-radius: 0.875rem;
          font-weight: 700;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          box-shadow: 0 4px 20px rgba(34,211,238,0.25), 0 0 0 1px rgba(34,211,238,0.2);
        }
        .btn-primary-cyber:hover:not(:disabled) {
          background: linear-gradient(135deg, #67e8f9, #22d3ee);
          box-shadow: 0 8px 30px rgba(34,211,238,0.4), 0 0 0 1px rgba(34,211,238,0.3);
          transform: translateY(-1px);
        }
        .btn-primary-cyber:active:not(:disabled) { transform: scale(0.98); }
        .btn-primary-cyber:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Biometric button ── */
        .biometric-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          padding: 0.7rem;
          border-radius: 0.875rem;
          border: 1px solid rgba(34,211,238,0.2);
          background: rgba(34,211,238,0.04);
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          cursor: pointer;
        }
        .biometric-btn:hover {
          background: rgba(34,211,238,0.08);
          border-color: rgba(34,211,238,0.35);
          box-shadow: 0 0 20px rgba(34,211,238,0.1);
        }

        /* ── Animations ── */
        @keyframes scan {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }
        .animate-scan { animation: scan 10s linear infinite; }

        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .role-btn { min-height: 52px; }
          .btn-primary-cyber { min-height: 48px; }
          input, select, textarea { font-size: 16px !important; }
        }
      `}</style>
    </div>
  );
};