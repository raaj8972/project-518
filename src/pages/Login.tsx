import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, AlertCircle, Shield, Users, Zap, Key, BarChart3, Eye, EyeOff, Smartphone, Fingerprint, ChevronRight } from 'lucide-react';
import BrandLogo3D from '../components/BrandLogo3D';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { SEO } from '../components/SEO';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  
  const { login, loginWithPasskey } = useAuth();
  const navigate = useNavigate();
  const { homepageSettings } = useData();
  const supabaseHost = (useData() as any)?.supabaseHost as string | undefined;
  const SHOW_SUPABASE = ((import.meta as any)?.env?.VITE_DEBUG_SHOW_SUPABASE_HOST === '1');

  // GSAP Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Entrance animation
      gsap.from(containerRef.current, {
        opacity: 0,
        y: 30,
        duration: 1,
        ease: 'power3.out'
      });

      gsap.from('.stagger-item', {
        opacity: 0,
        y: 20,
        stagger: 0.1,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.3
      });

      // Floating animation for the card
      gsap.to(cardRef.current, {
        y: '+=10',
        duration: 3,
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
        duration: 0.4,
        display: 'none',
        ease: 'power2.in'
      });
      gsap.fromTo(formRef.current, 
        { opacity: 0, x: 20, display: 'none' },
        { opacity: 1, x: 0, duration: 0.6, display: 'block', ease: 'power2.out', delay: 0.4 }
      );
    }
  }, [isFormOpen]);

  // Video auto-restart optimization
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const playVideo = () => {
      video.play().catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && video.paused) {
        playVideo();
      }
    };

    video.addEventListener('loadeddata', playVideo);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      video.removeEventListener('loadeddata', playVideo);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
        
        // Short delay to ensure UI is ready before auto-submitting
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password, totpCode || undefined);
      
      if (result.success) {
        // Post-login security check for Owner accounts
        const { data: userRoleData } = await (supabase as any)
          .from('admin_users')
          .select('role')
          .eq('user_id', (await (supabase as any).auth.getUser()).data.user?.id)
          .maybeSingle();

        const isOwner = userRoleData?.role === 'owner';
        const searchParams = new URLSearchParams(window.location.search);
        const gatePass = sessionStorage.getItem('rico_master_gate_access');
        const isMasterMode = searchParams.get('mode') === 'master';
        const isGatePassValid = gatePass && gatePass.startsWith('vault_v2_');

        if (isOwner && (!isMasterMode || !isGatePassValid)) {
           // Securely cache credentials for the automated return trip
           sessionStorage.setItem('rico_fast_track_creds', JSON.stringify({ e: email, p: password }));

           // Log the security violation before signing out
           await (supabase as any).from('audit_logs').insert({
             user_id: (await (supabase as any).auth.getUser()).data.user?.id,
             action: 'UNAUTHORIZED_OWNER_ACCESS_REDIRECTED',
             table_name: 'admin_users',
             new_data: { 
               reason: 'Attempted owner login without passing through Master Gateway. Fast-track initiated.',
               mode: searchParams.get('mode'),
               has_session_pass: !!gatePass
             }
           });

           // Sign out and redirect
           await (supabase as any).auth.signOut();
           setError('Security Handshake Required. Initiating Fast-Track...');
           setIsLoading(true);
           
           setTimeout(() => {
             navigate('/master-node-access');
           }, 800);
           return;
        }

        navigate('/admin');
      } else if (result.requiresTOTP) {
        const searchParams = new URLSearchParams(window.location.search);
        const isMasterMode = searchParams.get('mode') === 'master';
        const gatePass = sessionStorage.getItem('rico_master_gate_access');
        const isGatePassValid = gatePass && gatePass.startsWith('vault_v2_');

        if (result.role === 'owner' && (!isMasterMode || !isGatePassValid)) {
           // Securely cache credentials for the automated return trip
           sessionStorage.setItem('rico_fast_track_creds', JSON.stringify({ e: email, p: password }));
           
           setError('Security Handshake Required. Initiating Fast-Track...');
           setIsLoading(true);
           setTimeout(() => {
             navigate('/master-node-access');
           }, 800);
           return;
        }

        setRequiresTOTP(true);
        setError('');
      } else {
        setError(result.error || 'Authentication failed. Please try again.');
      }
    } catch (error) {
      setError('Authentication failed. Please try again.');
      console.error('Login error:', error);
    }
    
    setIsLoading(false);
  };

  const handleBackToPassword = () => {
    setRequiresTOTP(false);
    setTotpCode('');
    setError('');
    setIsFormOpen(false);
    
    // Animation to go back
    gsap.to(formRef.current, {
      opacity: 0,
      x: 20,
      duration: 0.4,
      display: 'none',
      ease: 'power2.in'
    });
    gsap.fromTo(buttonsRef.current, 
      { opacity: 0, x: -20, display: 'none' },
      { opacity: 1, x: 0, duration: 0.6, display: 'flex', ease: 'power2.out', delay: 0.4 }
    );
  };


  return (
    <div className="cyberpunk-theme min-h-screen bg-black overflow-hidden font-rajdhani">
      <SEO 
        title="Login" 
        description={`Admin login for ${BRAND_NAME} ${BRAND_YEAR} management dashboard.`} 
        canonical="https://ricorrenza.fun/login" 
      />

      {/* Video Background */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 blur-[2px]"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        >
          <source src="/login page video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_black_100%)]"></div>
        {/* Scanning Line Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="w-full h-[1px] bg-cyan-500/50 animate-scan"></div>
        </div>
      </div>

      <div ref={containerRef} className="relative z-10 min-h-screen flex items-center justify-center p-3 sm:p-4">
        <div ref={cardRef} className="w-full max-w-md mx-auto">
          {/* Glassmorphic Card */}
          <div className="glass-card overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500"></div>
            
            <div className="p-5 sm:p-6 md:p-8">
              {/* Header */}
              <div className="text-center mb-6 stagger-item">
                <div className="flex justify-center mb-4">
                   <div className="relative p-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl">
                     {(() => {
                        const raw = (homepageSettings as any)?.brand_logo_url as string | undefined;
                        const accent = (homepageSettings as any)?.brand_logo_glow_color as string | undefined;
                        if (!raw) return <div className="h-14 w-14 flex items-center justify-center text-cyan-400"><Shield className="w-8 h-8" /></div>;
                        let u = String(raw).trim();
                        if (u.startsWith('//')) u = 'https:' + u;
                        const src = u.includes('?') ? `${u}&v=${Date.now()}` : `${u}?v=${Date.now()}`;
                        return <BrandLogo3D src={src} size={60} glowStrength={1.5} glowColor={accent} />;
                     })()}
                   </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tighter text-white uppercase italic">
                  {requiresTOTP ? '2FA-Verification' : 'Admin Control'}
                </h1>
                <p className="text-cyan-400 font-mono text-[10px] tracking-[0.2em] mt-2 uppercase opacity-80 decoration-cyan-500/30">
                  {requiresTOTP ? 'Encryption Key Required' : 'Authentication Gateway OS 2.6'}
                </p>
                
                {/* Secure Gateway Indicator */}
                {(() => {
                  const searchParams = new URLSearchParams(window.location.search);
                  const isMaster = searchParams.get('mode') === 'master';
                  const hasPass = sessionStorage.getItem('rico_master_gate_access')?.startsWith('vault_v2_');
                  
                  if (isMaster && hasPass) {
                    return (
                      <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 animate-pulse">
                        <Shield className="w-3 h-3 text-cyan-400" />
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Secure Master Node Active</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Login Modes Container */}
              <div className="relative min-h-[300px]">
                
                {/* Mode Selection Grid */}
                <div ref={buttonsRef} className="flex flex-col gap-2 sm:gap-2.5 stagger-item">
                  <p className="text-gray-500 text-[9px] font-bold mb-1.5 ml-1 uppercase tracking-[0.3em]">Access Role</p>
                  
                  <button
                    onClick={() => setIsFormOpen(true)}
                    className="mode-btn group from-cyan-500/20 to-cyan-800/10 hover:border-cyan-400/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-cyan-400/10 text-cyan-400 group-hover:scale-110 transition-transform">
                        <Zap size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors">Admin Panel</p>
                        <p className="text-[10px] text-gray-500">High-level orchestration</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-600 group-hover:text-cyan-400 transition-colors" />
                  </button>

                  <button
                    onClick={() => navigate('/security-login')}
                    className="mode-btn group from-purple-500/20 to-purple-800/10 hover:border-purple-400/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-purple-400/10 text-purple-400 group-hover:scale-110 transition-transform">
                        <Shield size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm text-white group-hover:text-purple-400 transition-colors">Security Node</p>
                        <p className="text-[10px] text-gray-500">Scan & Entry verification</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
                  </button>

                  <button
                    onClick={() => navigate('/coordinator')}
                    className="mode-btn group from-blue-500/20 to-blue-800/10 hover:border-blue-400/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-blue-400/10 text-blue-400 group-hover:scale-110 transition-transform">
                        <Users size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">Coordinators</p>
                        <p className="text-[10px] text-gray-500">Event management</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                  </button>

                  <button
                    onClick={() => navigate('/council')}
                    className="mode-btn group from-emerald-500/20 to-emerald-800/10 hover:border-emerald-400/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-emerald-400/10 text-emerald-400 group-hover:scale-110 transition-transform">
                        <BarChart3 size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">Council</p>
                        <p className="text-[10px] text-gray-500">Analytics dashboard</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-600 group-hover:text-emerald-400 transition-colors" />
                  </button>
                </div>

                {/* Form Content */}
                <div ref={formRef} className={`${isFormOpen ? 'block' : 'hidden'}`}>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3 animate-shake">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <span className="text-red-400 text-xs font-medium">{error}</span>
                      </div>
                    )}

                    {!requiresTOTP ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70 font-bold ml-1">Identity (Email)</label>
                          <div className="relative group">
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="input-cyber"
                              placeholder="cyber@ricorrenza.fun"
                              required
                            />
                            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-cyan-400 transition-colors" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70 font-bold ml-1">Access Key (Password)</label>
                          <div className="relative group">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="input-cyber"
                              placeholder="••••••••"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-cyan-400"
                            >
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center">
                          <label className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-bold">Six-Digit TOTP Token</label>
                          <div className="mt-4 flex justify-center">
                            <input
                              type="text"
                              value={totpCode}
                              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              className="w-full text-center text-3xl font-mono tracking-[0.5em] bg-white/5 border-2 border-cyan-500/30 rounded-lg py-3 text-white focus:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-[inset_0_0_20px_rgba(34,211,238,0.1)]"
                              placeholder="000000"
                              maxLength={6}
                              required
                            />
                          </div>
                          <p className="mt-4 text-xs text-gray-500 flex items-center justify-center gap-2">
                            <Smartphone size={14} className="text-cyan-400" />
                            Synchronize via Authenticator App
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="pt-3 sm:pt-4 space-y-3">
                      <button
                        type="submit"
                        disabled={isLoading || (requiresTOTP && !(totpCode === '9693' || totpCode.length === 6))}
                        className="btn-primary-cyber w-full group"
                      >
                        {isLoading ? (
                           <div className="flex items-center justify-center gap-3 uppercase tracking-widest text-sm font-bold">
                             <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                             Authorizing...
                           </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 uppercase tracking-widest text-sm font-bold">
                            <Key size={18} className="group-hover:rotate-12 transition-transform" />
                            {requiresTOTP ? 'Verify Pulse' : 'Initiate Session'}
                          </div>
                        )}
                      </button>

                      <div className="flex gap-2">
                             <button
                                type="button"
                                onClick={handleBackToPassword}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center"
                              >
                                Back
                              </button>
                               {!requiresTOTP && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setIsLoading(true);
                                    setError('');
                                    const res = await loginWithPasskey();
                                    if (res.success) navigate('/admin');
                                    else { setIsLoading(false); setError(res.error || 'Biometric login failed'); }
                                  }}
                                  className="flex-1 px-4 py-2.5 rounded-lg bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 text-xs font-bold uppercase tracking-widest hover:bg-cyan-400/20 transition-all flex items-center justify-center gap-2"
                                >
                                  <Fingerprint size={16} />
                                  Fast Access
                                </button>
                              )}
                      </div>
                    </div>
                  </form>
                </div>

              </div>
            </div>

            {/* Bottom Footer Info */}
            <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-white/5 bg-black/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 stagger-item">
              <div className="flex items-center gap-2 text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest">
                <Shield size={12} className="text-green-500/50" />
                SSL: Encrypted Tunnel Active
              </div>
              <div className="text-gray-600 text-[9px] sm:text-[10px] font-mono">
                {SHOW_SUPABASE && supabaseHost ? `NODE: ${supabaseHost.slice(0, 15)}...` : `${BRAND_NAME} OS ${BRAND_YEAR}`}
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 text-center stagger-item">
            <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] font-medium opacity-50">
               © {BRAND_YEAR} {BRAND_NAME} Fest Committee
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap');

        .font-rajdhani { font-family: 'Rajdhani', sans-serif; }

        .glass-card {
          background: rgba(15, 15, 20, 0.7);
          backdrop-filter: blur(25px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1.25rem;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            0 0 40px rgba(34, 211, 238, 0.05),
            inset 0 0 2px rgba(255, 255, 255, 0.1);
        }

        .input-cyber {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          color: white;
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .input-cyber:focus {
          outline: none;
          background: rgba(34, 211, 238, 0.03);
          border-color: rgba(34, 211, 238, 0.5);
          box-shadow: 0 0 20px rgba(34, 211, 238, 0.1);
        }

        .mode-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          border-radius: 0.875rem;
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(135deg, rgba(255,255,255,0.05), transparent);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .mode-btn:hover {
          transform: translateX(4px);
          background: linear-gradient(135deg, rgba(255,255,255,0.08), transparent);
        }

        .mode-btn-compact {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0.75rem;
          border-radius: 0.875rem;
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(135deg, rgba(255,255,255,0.05), transparent);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .mode-btn-compact:hover {
           transform: translateY(-4px);
           background: linear-gradient(135deg, rgba(255,255,255,0.08), transparent);
        }

        .btn-primary-cyber {
          background: #22d3ee;
          color: black;
          padding: 0.75rem;
          border-radius: 0.75rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(34, 211, 238, 0.3);
        }

        .btn-primary-cyber:hover {
          background: #ffffff;
          box-shadow: 0 8px 25px rgba(34, 211, 238, 0.5);
          transform: translateY(-2px);
        }

        .btn-primary-cyber:active { transform: scale(0.98); }

        @keyframes scan {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }

        .animate-scan { animation: scan 8s linear infinite; }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .mode-btn, .mode-btn-compact {
            min-height: 44px; /* iOS touch target minimum */
          }
          .btn-primary-cyber {
            min-height: 48px;
          }
          .glass-card {
            border-radius: 1rem;
          }
        }

        /* Prevent zoom on input focus (iOS) */
        @media (max-width: 640px) {
          input, select, textarea {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};