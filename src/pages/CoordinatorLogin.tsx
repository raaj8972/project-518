import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Lock, ArrowLeft, Users, ChevronDown } from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import { gsap } from 'gsap';

export const CoordinatorLogin: React.FC = () => {
  const { events } = useData();
  const navigate = useNavigate();
  const { push } = useToast();
  
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const enabledEvents = events?.filter((e: any) => e.visible !== false) || [];

  // GSAP Animations - optimized
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(containerRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: 'power2.out'
      });

      gsap.from('.stagger-item', {
        opacity: 0,
        y: 15,
        stagger: 0.08,
        duration: 0.5,
        ease: 'power2.out',
        delay: 0.2
      });

      gsap.to(cardRef.current, {
        y: '+=8',
        duration: 2.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      push({ message: 'Please select an event', type: 'error' });
      return;
    }
    if (!password) {
      push({ message: 'Please enter the access code', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      const event = enabledEvents.find((ev: any) => String(ev.id) === selectedEventId);
      if (!event) throw new Error('Event not found');

      const { supabase } = await import('../lib/supabase');
      
      const { data: loginResult, error } = await supabase.rpc('login_coordinator', {
        event_id_param: event.id,
        password_param: password.trim()
      });

      if (error) throw error;
      if (!loginResult || !loginResult.token) {
        throw new Error('Login failed: Invalid credentials');
      }

      const session = {
        eventId: event.id,
        eventTitle: event.title,
        token: loginResult.token,
        expiresAt: loginResult.expires_at,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem('coordinator_session', JSON.stringify(session));
      push({ message: `Welcome, Coordinator for ${event.title}!`, type: 'success' });
      navigate('/coordinator/dashboard');

    } catch (error: any) {
      console.error('Login error:', error);
      push({ 
        message: error.message === 'Invalid access code' ? 'Invalid access code' : (error.message || 'Login failed'), 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black overflow-hidden font-rajdhani relative">
      {/* Optimized background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-950/40 via-black to-blue-900/40"></div>
      
      {/* Scanning line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-15">
        <div className="w-full h-[1px] bg-blue-500/50 animate-scan"></div>
      </div>

      <div ref={containerRef} className="relative z-10 min-h-screen flex items-center justify-center p-3 sm:p-4">
        <div ref={cardRef} className="w-full max-w-md mx-auto">
          <div className="glass-card-blue overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-sky-500 to-blue-500"></div>
            
            <div className="p-5 sm:p-6 md:p-8">
              <div className="text-center mb-6 stagger-item">
                <div className="flex justify-center mb-4">
                  <div className="relative p-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 backdrop-blur-md shadow-2xl">
                    <Users className="w-10 h-10 text-blue-400" />
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tighter text-white uppercase italic">
                  Event Coordinator
                </h1>
                <p className="text-blue-400 font-mono text-[10px] tracking-[0.2em] mt-2 uppercase opacity-80">
                  Registration Management
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4 stagger-item">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-blue-400/70 font-bold ml-1 flex items-center gap-2">
                    <Users size={12} />
                    Select Event
                  </label>
                  <div className="relative group">
                    <select
                      required
                      value={selectedEventId}
                      onChange={(e) => setSelectedEventId(e.target.value)}
                      className="input-blue appearance-none pr-10"
                    >
                      <option value="" className="bg-gray-900">Choose your event...</option>
                      {enabledEvents.map((ev: any) => (
                        <option key={ev.id} value={String(ev.id)} className="bg-gray-900">
                          {ev.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-blue-400 transition-colors pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-blue-400/70 font-bold ml-1 flex items-center gap-2">
                    <Lock size={12} />
                    Access Code
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-blue"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-blue w-full group"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-3 uppercase tracking-widest text-sm font-bold">
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        Authenticating...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 uppercase tracking-widest text-sm font-bold">
                        <Users size={18} className="group-hover:scale-110 transition-transform" />
                        Access Dashboard
                      </div>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t border-white/5 stagger-item">
                <p className="text-gray-500 text-[10px] text-center mb-3 leading-relaxed">
                  For event coordinators only. Contact admin for access code.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={14} />
                  Admin Gateway
                </button>
              </div>
            </div>

            <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-white/5 bg-black/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 stagger-item">
              <div className="flex items-center gap-2 text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest">
                <Users size={12} className="text-blue-500/50" />
                Coordinator Portal
              </div>
              <div className="text-gray-600 text-[9px] sm:text-[10px] font-mono">
                {BRAND_NAME} {BRAND_YEAR}
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

        .glass-card-blue {
          background: rgba(15, 15, 20, 0.7);
          backdrop-filter: blur(25px) saturate(180%);
          border: 1px solid rgba(59, 130, 246, 0.15);
          border-radius: 1.25rem;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            0 0 40px rgba(59, 130, 246, 0.08),
            inset 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .input-blue {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1.5px solid rgba(59, 130, 246, 0.15);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          color: white;
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .input-blue:focus {
          outline: none;
          background: rgba(59, 130, 246, 0.05);
          border-color: rgba(59, 130, 246, 0.5);
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
        }

        .btn-blue {
          background: #3b82f6;
          color: black;
          padding: 0.75rem;
          border-radius: 0.75rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }

        .btn-blue:hover:not(:disabled) {
          background: #60a5fa;
          box-shadow: 0 8px 25px rgba(59, 130, 246, 0.5);
          transform: translateY(-2px);
        }

        .btn-blue:active { transform: scale(0.98); }
        .btn-blue:disabled { opacity: 0.5; cursor: not-allowed; }

        @keyframes scan {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }

        .animate-scan { animation: scan 8s linear infinite; }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .btn-blue { min-height: 48px; }
          .glass-card-blue { border-radius: 1rem; }
          input, select, textarea { font-size: 16px !important; }
        }
      `}</style>
    </div>
  );
};
