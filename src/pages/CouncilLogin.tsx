import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, BarChart3 } from 'lucide-react';
import { gsap } from 'gsap';

export default function CouncilLogin() {
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    sessionStorage.setItem('council_auth', password);
    React.startTransition(() => {
      navigate('/council-dashboard');
    });
  };

  return (
    <div className="min-h-screen bg-black overflow-hidden font-rajdhani relative">
      {/* Optimized background */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-950/40 via-black to-green-950/40"></div>
      
      {/* Scanning line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-15">
        <div className="w-full h-[1px] bg-emerald-500/50 animate-scan"></div>
      </div>

      <div ref={containerRef} className="relative z-10 min-h-screen flex items-center justify-center p-3 sm:p-4">
        <div ref={cardRef} className="w-full max-w-md mx-auto">
          <div className="glass-card-emerald overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500"></div>
            
            <div className="p-5 sm:p-6 md:p-8">
              <div className="text-center mb-6 stagger-item">
                <div className="flex justify-center mb-4">
                  <div className="relative p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-md shadow-2xl">
                    <BarChart3 className="w-10 h-10 text-emerald-400" />
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tighter text-white uppercase italic">
                  Council Dashboard
                </h1>
                <p className="text-emerald-400 font-mono text-[10px] tracking-[0.2em] mt-2 uppercase opacity-80">
                  Executive Analytics Portal
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4 stagger-item">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/70 font-bold ml-1 flex items-center gap-2">
                    <Lock size={12} />
                    Access Code
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-emerald"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="btn-emerald w-full group"
                  >
                    <div className="flex items-center justify-center gap-2 uppercase tracking-widest text-sm font-bold">
                      <BarChart3 size={18} className="group-hover:scale-110 transition-transform" />
                      Access Analytics
                    </div>
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t border-white/5 stagger-item">
                <p className="text-gray-500 text-[10px] text-center mb-3 leading-relaxed">
                  Restricted to council members only. Authorized access required.
                </p>
                <button
                  onClick={() => React.startTransition(() => navigate('/login'))}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={14} />
                  Admin Gateway
                </button>
              </div>
            </div>

            <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-white/5 bg-black/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 stagger-item">
              <div className="flex items-center gap-2 text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest">
                <BarChart3 size={12} className="text-emerald-500/50" />
                Council Portal
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

        .glass-card-emerald {
          background: rgba(15, 15, 20, 0.7);
          backdrop-filter: blur(25px) saturate(180%);
          border: 1px solid rgba(16, 185, 129, 0.15);
          border-radius: 1.25rem;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            0 0 40px rgba(16, 185, 129, 0.08),
            inset 0 0 2px rgba(16, 185, 129, 0.1);
        }

        .input-emerald {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1.5px solid rgba(16, 185, 129, 0.15);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          color: white;
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .input-emerald:focus {
          outline: none;
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.5);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
        }

        .btn-emerald {
          background: #10b981;
          color: black;
          padding: 0.75rem;
          border-radius: 0.75rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }

        .btn-emerald:hover {
          background: #34d399;
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.5);
          transform: translateY(-2px);
        }

        .btn-emerald:active { transform: scale(0.98); }

        @keyframes scan {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }

        .animate-scan { animation: scan 8s linear infinite; }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .btn-emerald { min-height: 48px; }
          .glass-card-emerald { border-radius: 1rem; }
          input, select, textarea { font-size: 16px !important; }
        }
      `}</style>
    </div>
  );
}
