import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Lock, ArrowRight, UserCheck } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

export const CoordinatorLogin: React.FC = () => {
  const { events } = useData();
  const navigate = useNavigate();
  const { push } = useToast();
  
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Show all visible events
  const enabledEvents = events?.filter((e: any) => e.visible !== false) || [];

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

      // Call secure RPC to login and get session token
      const { supabase } = await import('../lib/supabase');
      
      const { data: loginResult, error } = await supabase.rpc('login_coordinator', {
        event_id_param: event.id,
        password_param: password.trim()
      });

      if (error) {
        throw error;
      }

      if (!loginResult || !loginResult.token) {
        throw new Error('Login failed: Invalid credentials');
      }

      // Success - Store token with expiry
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

  // Video reference for background
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Video auto-restart optimization 
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const playVideo = () => { video.play().catch(() => {}); };
    const handleVisibilityChange = () => { if (!document.hidden && video.paused) playVideo(); };
    video.addEventListener('loadeddata', playVideo);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      video.removeEventListener('loadeddata', playVideo);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="cyberpunk-theme min-h-screen">
      {/* Hero Section */}
      <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden" style={{ perspective: '1000px' }}>
        {/* Video Background */}
        <div className="fixed inset-0 z-0" style={{ transformStyle: 'preserve-3d', width: '100vw', height: '100vh' }}>
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full video-3d-effect"
            style={{ 
              filter: 'brightness(0.7)',
              transform: 'translateZ(-50px) scale(1.1)',
              transformStyle: 'preserve-3d',
              objectFit: 'cover',
              objectPosition: 'center'
            }}
          >
            <source src="/login page video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 cyberpunk-grid opacity-20" style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d' }}></div>
        </div>

        {/* Login Content */}
        <div className="relative z-10 w-full max-w-md mx-auto px-4">
           {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="cyberpunk-icon-container">
                  <UserCheck className="h-12 w-12 text-purple-400" />
                </div>
              </div>
              <h1 className="text-3xl font-black mb-2 cyberpunk-title">
                COORDINATOR
              </h1>
              <p className="text-lg text-gray-300">
                Access your event registrations
              </p>
            </div>

          <div className="cyberpunk-card animate-card-reveal">
            <form onSubmit={handleLogin} className="space-y-6 p-8">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3 pl-1">
                  Select Event
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="cyberpunk-input"
                >
                  <option value="" className="text-gray-900">-- Choose Event --</option>
                  {enabledEvents.map((ev: any) => (
                    <option key={ev.id} value={ev.id} className="text-gray-900">
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3 pl-1">
                  Access Code
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="cyberpunk-input pl-10"
                    placeholder="Enter password"
                  />
                  <Lock className="w-5 h-5 text-cyan-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`cyberpunk-btn cyberpunk-btn-primary w-full ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <span className="relative z-10 flex items-center justify-center">
                  {loading ? 'VERIFYING...' : (
                    <>
                      LOGIN <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </span>
              </button>
            </form>
            
            <div className="px-8 pb-8 text-center space-y-3">
               <a 
                 href="/"
                 className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 transition-colors"
               >
                 ← Back to Home
               </a>
               <div className="text-xs text-gray-500">
                 Ricorrenza Management System
               </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .cyberpunk-theme {
          background: #0a0a0a;
          color: #ffffff;
          font-family: 'Orbitron', 'Rajdhani', sans-serif;
          min-height: 100vh;
        }
        .hero-section {
          position: relative;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        }
        .cyberpunk-grid {
          background-image: 
            linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridMove 20s linear infinite;
        }
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        @keyframes video3DFloat {
          0%, 100% { transform: translateZ(-50px) scale(1.1) rotateX(0deg); }
          50% { transform: translateZ(-45px) scale(1.12) rotateX(1deg); }
        }
        .video-3d-effect { will-change: transform; }
        .cyberpunk-title {
          background: linear-gradient(45deg, #a78bfa, #c084fc, #a78bfa);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 3s ease-in-out infinite;
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .cyberpunk-icon-container {
          position: relative;
          display: inline-block;
          padding: 20px;
          border-radius: 50%;
          background: rgba(139, 92, 246, 0.1);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
          border: 1px solid rgba(139, 92, 246, 0.3);
        }
        .cyberpunk-card {
          background: rgba(20, 20, 40, 0.9);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 8px;
          backdrop-filter: blur(15px);
          position: relative;
          overflow: hidden;
        }
        .cyberpunk-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, #a78bfa, #c084fc, #a78bfa);
        }
        .cyberpunk-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.5);
          border: 2px solid rgba(139, 92, 246, 0.3);
          border-radius: 8px;
          color: white;
          font-family: 'Orbitron', monospace;
          transition: all 0.3s ease;
        }
        .cyberpunk-input:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.8);
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
        }
        .cyberpunk-btn {
          position: relative;
          padding: 12px 32px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          border: 2px solid;
          background: transparent;
          overflow: hidden;
          transition: all 0.3s ease;
          clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 100%, 20px 100%);
        }
        .cyberpunk-btn::before {
          content: '';
          position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }
        .cyberpunk-btn:hover::before { left: 100%; }
        .cyberpunk-btn-primary {
          border-color: #c084fc;
          color: #c084fc;
          box-shadow: 0 0 10px rgba(192, 132, 252, 0.2);
        }
        .cyberpunk-btn-primary:hover {
          background: rgba(192, 132, 252, 0.1);
          box-shadow: 0 0 20px rgba(192, 132, 252, 0.4);
          transform: translateY(-2px);
        }
        .animate-card-reveal {
           animation: cardReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
           opacity: 0; animation-delay: 0.2s;
        }
        @keyframes cardReveal {
          0% { opacity: 0; transform: scale(0.9) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};
