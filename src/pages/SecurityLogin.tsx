import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Shield, Lock, User, ChevronDown, ArrowLeft } from 'lucide-react';
import { gsap } from 'gsap';

interface SecurityUserOption {
  username: string;
  full_name: string;
}

export default function SecurityLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<SecurityUserOption[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // GSAP Animations - optimized with reduced complexity
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

      // Subtle floating animation
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

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.rpc('get_public_security_users');
      if (!error && data) {
        setAvailableUsers(data);
        if (data.length > 0) {
          setUsername(data[0].username);
        }
      }
    };
    fetchUsers();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .rpc('authenticate_security_user', {
          p_username: username,
          p_password: password,
        });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.message || 'Invalid username or password');
        return;
      }

      localStorage.setItem('security_user', JSON.stringify(data.user));
      toast.success(`Welcome, ${data.user.full_name}!`);
      navigate('/security-dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black overflow-hidden font-rajdhani relative">
      {/* Optimized background - single gradient layer */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-950/40 via-black to-violet-950/40"></div>
      
      {/* Scanning line - lighter animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-15">
        <div className="w-full h-[1px] bg-purple-500/50 animate-scan"></div>
      </div>

      <div ref={containerRef} className="relative z-10 min-h-screen flex items-center justify-center p-3 sm:p-4">
        <div ref={cardRef} className="w-full max-w-md mx-auto">
          {/* Glassmorphic Card */}
          <div className="glass-card-purple overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-violet-500 to-purple-500"></div>
            
            <div className="p-5 sm:p-6 md:p-8">
              {/* Header */}
              <div className="text-center mb-6 stagger-item">
                <div className="flex justify-center mb-4">
                  <div className="relative p-3 rounded-2xl border border-purple-500/20 bg-purple-500/10 backdrop-blur-md shadow-2xl">
                    <Shield className="w-10 h-10 text-purple-400" />
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tighter text-white uppercase italic">
                  Security Node
                </h1>
                <p className="text-purple-400 font-mono text-[10px] tracking-[0.2em] mt-2 uppercase opacity-80">
                  Entry Management System
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4 stagger-item">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-purple-400/70 font-bold ml-1 flex items-center gap-2">
                    <User size={12} />
                    {availableUsers.length > 0 ? 'Security User' : 'Username'}
                  </label>
                  
                  {availableUsers.length > 0 ? (
                    <div className="relative group">
                      <select
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="input-purple appearance-none pr-10"
                      >
                        {availableUsers.map((u) => (
                          <option key={u.username} value={u.username} className="bg-gray-900">
                            {u.full_name} ({u.username})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-purple-400 transition-colors pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="input-purple"
                      placeholder="Enter username"
                      autoComplete="username"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-purple-400/70 font-bold ml-1 flex items-center gap-2">
                    <Lock size={12} />
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-purple"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-purple w-full group"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-3 uppercase tracking-widest text-sm font-bold">
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        Authenticating...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 uppercase tracking-widest text-sm font-bold">
                        <Shield size={18} className="group-hover:scale-110 transition-transform" />
                        Access System
                      </div>
                    )}
                  </button>
                </div>
              </form>

              {/* Info Section */}
              <div className="mt-6 pt-6 border-t border-white/5 stagger-item">
                <p className="text-gray-500 text-[10px] text-center mb-3 leading-relaxed">
                  For security personnel only. Contact admin for credentials.
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

            {/* Bottom Footer */}
            <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-white/5 bg-black/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 stagger-item">
              <div className="flex items-center gap-2 text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest">
                <Shield size={12} className="text-purple-500/50" />
                Secure Entry Point
              </div>
              <div className="text-gray-600 text-[9px] sm:text-[10px] font-mono">
                RICORRENZA 2026
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 text-center stagger-item">
            <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] font-medium opacity-50">
              © 2026 Ricorrenza Fest Committee
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap');

        .font-rajdhani { font-family: 'Rajdhani', sans-serif; }

        .glass-card-purple {
          background: rgba(15, 15, 20, 0.7);
          backdrop-filter: blur(25px) saturate(180%);
          border: 1px solid rgba(168, 85, 247, 0.15);
          border-radius: 1.25rem;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            0 0 40px rgba(168, 85, 247, 0.08),
            inset 0 0 2px rgba(168, 85, 247, 0.1);
        }

        .input-purple {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1.5px solid rgba(168, 85, 247, 0.15);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          color: white;
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .input-purple:focus {
          outline: none;
          background: rgba(168, 85, 247, 0.05);
          border-color: rgba(168, 85, 247, 0.5);
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.15);
        }

        .btn-purple {
          background: #a855f7;
          color: black;
          padding: 0.75rem;
          border-radius: 0.75rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);
        }

        .btn-purple:hover:not(:disabled) {
          background: #c084fc;
          box-shadow: 0 8px 25px rgba(168, 85, 247, 0.5);
          transform: translateY(-2px);
        }

        .btn-purple:active { transform: scale(0.98); }
        .btn-purple:disabled { opacity: 0.5; cursor: not-allowed; }

        @keyframes scan {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }

        .animate-scan { animation: scan 8s linear infinite; }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .btn-purple { min-height: 48px; }
          .glass-card-purple { border-radius: 1rem; }
          input, select, textarea { font-size: 16px !important; }
        }
      `}</style>
    </div>
  );
}
