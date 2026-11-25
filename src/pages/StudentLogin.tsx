import '../styles/StudentFestival.css';
import { studentReturnPath } from '../utils/studentProfile';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate, useSearchParams } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';

const StudentLogin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const redirectPath = studentReturnPath(searchParams.get('redirect'));
  const [isLogin, setIsLogin] = useState(mode !== 'signup');
  const [loading, setLoading] = useState(false);
  
  const { isAuthenticated, isProfileComplete, isApproved, signInWithGoogle, loading: authLoading } = useStudentAuth();
  const navigate = useNavigate();

  // Handle Redirection
  useEffect(() => {
    if (isAuthenticated && isProfileComplete && !authLoading) {
      const timer = setTimeout(() => {
        navigate(isApproved ? redirectPath : redirectPath === '/dashboard' ? '/dashboard' : `/dashboard?returnTo=${encodeURIComponent(redirectPath)}`);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isProfileComplete, isApproved, authLoading, navigate, redirectPath]);

  const handleGoogleAction = async () => {
    try {
      setLoading(true);
      await signInWithGoogle(redirectPath);
    } catch (error: any) {
      toast.error(error.message || 'Google authentication failed');
      setLoading(false);
    }
  };

  const overlayVariants = {
    login: { x: '0%', borderTopLeftRadius: '0px', borderBottomLeftRadius: '0px', borderTopRightRadius: '100px', borderBottomRightRadius: '100px' },
    signup: { x: '100%', borderTopLeftRadius: '100px', borderBottomLeftRadius: '100px', borderTopRightRadius: '0px', borderBottomRightRadius: '0px' }
  };

  // 1. Loading State
  if (authLoading) {
    return (
      <div className="student-festival-auth student-auth-page min-h-[100dvh] flex flex-col items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
        <p className="text-gray-400 animate-pulse">Opening your RICO portal...</p>
      </div>
    );
  }

  // Profile setup has one shared destination, including the Google callback.
  if (isAuthenticated && !isProfileComplete) {
    const target = redirectPath === '/dashboard' ? '/dashboard' : `/dashboard?returnTo=${encodeURIComponent(redirectPath)}`;
    return <Navigate to={target} replace />;
  }

  // 3. Authenticated and Complete (Redirecting)
  if (isAuthenticated && isProfileComplete) {
    return (
      <div className="student-festival-auth student-auth-page min-h-[100dvh] flex flex-col items-center justify-center bg-zinc-950 text-white">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
            <CheckCircle2 className="text-green-400 w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Authenticated!</h2>
          <p className="text-gray-400">Taking you to your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  // 4. Guest Landing (Auth UI)
  return (
    <div className="student-festival-auth student-auth-page min-h-[100dvh] flex items-center justify-center bg-zinc-950 relative overflow-hidden font-sans p-4 pt-20">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />

      {/* Main Container Desktop */}
      <div className="hidden lg:flex relative w-full max-w-[1000px] min-h-[600px] bg-[#0d0d12] rounded-[3rem] shadow-[0_0_80px_rgba(168,85,247,0.15)] border border-purple-500/30 overflow-hidden">
        
        {/* SIGN UP PANEL (Left Side Form) */}
        <div className="absolute top-0 left-0 w-1/2 h-full px-16 py-12 flex flex-col justify-center text-left">
          <h2 className="text-5xl font-black text-white mb-6 tracking-tight">Sign Up</h2>
          <p className="text-gray-400 mb-10 text-lg leading-relaxed">One festival. Every possibility. Join the music, culture and competition at RICORRENZA.</p>
          
          <button 
            type="button" 
            onClick={handleGoogleAction}
            disabled={loading}
            className="w-full bg-white text-black font-black py-4 rounded-full shadow-2xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.02.68-2.33 1.08-3.71 1.08-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                JOIN WITH GOOGLE
              </>
            )}
          </button>
        </div>

        {/* LOG IN PANEL (Right Side Form) */}
        <div className="absolute top-0 right-0 w-1/2 h-full px-16 py-12 flex flex-col justify-center text-left">
          <h2 className="text-5xl font-black text-white mb-6 tracking-tight">Log In</h2>
          <p className="text-gray-400 mb-10 text-lg leading-relaxed">Glad to see you again! Access your dashboard and manage your registrations.</p>
          
          <button 
            type="button" 
            onClick={handleGoogleAction}
            disabled={loading}
            className="w-full bg-white text-black font-black py-4 rounded-full shadow-2xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.02.68-2.33 1.08-3.71 1.08-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                LOGIN WITH GOOGLE
              </>
            )}
          </button>
        </div>

        {/* Sliding Animated Overlay Panel */}
        <motion.div 
          className="absolute top-0 w-1/2 h-full z-30 flex flex-col items-center justify-center p-12 text-center text-white overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)]"
          animate={isLogin ? 'login' : 'signup'}
          variants={overlayVariants}
          transition={{ type: 'spring', stiffness: 45, damping: 15 }}
        >
          {/* Neon Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-700 to-indigo-950 z-0" />
          {/* Animated texture overlay */}
          <div className="absolute inset-0 student-festival-auth-texture opacity-20 mix-blend-overlay animate-pulse" />

          <div className="relative z-40 w-full px-6">
            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.div key="w-signup" initial={{opacity:0, scale:0.9, y: 30}} animate={{opacity:1, scale:1, y: 0}} exit={{opacity:0, scale:0.9, y: -30, position:'absolute', top:0, left:0, width:'100%'}}>
                  <div className="w-20 h-2 bg-white rounded-full mx-auto mb-10" />
                  <h2 className="text-5xl font-black mb-8 leading-[1.1] tracking-tighter uppercase italic">Join the <br/> Story</h2>
                  <p className="mb-12 text-purple-300 leading-relaxed font-bold text-xl">Start your journey with {BRAND_NAME} {BRAND_YEAR}. Instant signup with Google.</p>
                  <button onClick={() => setIsLogin(false)} className="px-14 py-4 rounded-full border-4 border-white font-black text-xl hover:bg-white hover:text-violet-900 transition-all hover:scale-105 active:scale-[0.98]">
                    NEED ACCOUNT?
                  </button>
                </motion.div>
              ) : (
                <motion.div key="w-login" initial={{opacity:0, scale:0.9, y: 30}} animate={{opacity:1, scale:1, y: 0}} exit={{opacity:0, scale:0.9, y: -30, position:'absolute', top:0, left:0, width:'100%'}}>
                  <Sparkles className="w-12 h-12 text-yellow-300 mx-auto mb-6" />
                  <h2 className="text-5xl font-black mb-8 leading-[1.1] tracking-tighter uppercase italic">Stay Ahead <br/> Secure Faster</h2>
                  <p className="mb-12 text-purple-300 leading-relaxed font-bold text-xl">Sign in to your student dashboard using Google for a 2-click experience.</p>
                  <button onClick={() => setIsLogin(true)} className="px-14 py-4 rounded-full border-4 border-white font-black text-xl hover:bg-white hover:text-violet-900 transition-all hover:scale-105 active:scale-[0.98]">
                    ALREADY MEMBER?
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Mobile Experience (Premium Sliding Card) */}
      <div className="lg:hidden w-full max-w-sm h-[640px] bg-[#0d0d12]/90 backdrop-blur-2xl border border-purple-500/30 rounded-[3rem] shadow-[0_0_80px_rgba(168,85,247,0.25)] z-10 relative overflow-hidden flex flex-col">
          
          {/* Base Layer: Action Area (Google Action) */}
          <div className="absolute inset-0 flex flex-col p-8 z-0">
             {/* Dynamic Layout: Push action area to top or bottom based on overlay position */}
             <div className={`flex-1 flex flex-col justify-center transition-all duration-700 ease-in-out ${isLogin ? 'mt-[340px]' : 'mb-[340px]'}`}>
                <motion.div 
                  initial={{opacity:0, y:10}} 
                  animate={{opacity:1, y:0}} 
                  key={isLogin ? 'm-action-login' : 'm-action-join'}
                  className="space-y-6 text-center"
                >
                    <div className="mb-4">
                      <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-1">
                        {isLogin ? 'Welcome Back' : 'Sign Up'}
                      </h3>
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Your RICO account</p>
                    </div>

                    <button 
                      type="button" 
                      onClick={handleGoogleAction}
                      disabled={loading}
                      className="w-full bg-white text-black font-black py-4 rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.02.68-2.33 1.08-3.71 1.08-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                          CONTINUE WITH GOOGLE
                        </>
                      )}
                    </button>
                    
                    <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase opacity-60">Sign in with your Google account</p>
                </motion.div>
             </div>
          </div>

          {/* Sliding Layer: Premium Purple Overlay */}
          <motion.div 
            initial={false}
            animate={{ 
              y: isLogin ? 0 : 300 
            }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 20
            }}
            className="absolute top-0 left-0 right-0 h-[340px] bg-gradient-to-br from-violet-900 via-purple-700 to-indigo-950 z-20 flex flex-col items-center justify-center pt-10 pb-10 px-8 text-center text-white border-b border-white/10 shadow-2xl"
          >
            <div className="absolute inset-0 student-festival-auth-texture opacity-20 mix-blend-overlay animate-pulse" />
            
            <div className="relative z-30 w-full flex flex-col items-center">
              <AnimatePresence mode="wait">
                {isLogin ? (
                  <motion.div key="m-join-slogan" initial={{opacity:0, scale:0.9, y: 10}} animate={{opacity:1, scale:1, y: 0}} exit={{opacity:0, scale:0.9, y: -10, position:'absolute'}} className="w-full flex flex-col items-center">
                    <div className="w-16 h-1.5 bg-white/20 rounded-full mx-auto mb-7" />
                    <h2 className="text-3xl font-black mb-4 leading-[0.9] tracking-tighter uppercase italic">Join the <br/> Story</h2>
                    <p className="text-purple-300 leading-tight font-bold text-[13px] px-4 mb-6 max-w-[260px] mx-auto opacity-80">Start your journey with {BRAND_NAME}. Your events, team and festival memories, together.</p>
                    
                    <button 
                      onClick={() => setIsLogin(false)}
                      className="inline-flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 hover:border-white/40 text-white font-black px-10 py-3 rounded-full transition-all uppercase tracking-[0.2em] text-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95"
                    >
                      Need Account?
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="m-login-slogan" initial={{opacity:0, scale:0.9, y: 10}} animate={{opacity:1, scale:1, y: 0}} exit={{opacity:0, scale:0.9, y: -10, position:'absolute'}} className="w-full flex flex-col items-center">
                    <Sparkles className="w-10 h-10 text-yellow-300 mx-auto mb-5" />
                    <h2 className="text-3xl font-black mb-4 leading-[0.9] tracking-tighter uppercase italic">Stay Ahead <br/> Secure Faster</h2>
                    <p className="text-purple-300 leading-tight font-bold text-[13px] px-4 mb-6 max-w-[260px] mx-auto opacity-80">Sign in to your student dashboard using Google for a 2-click experience.</p>
                    
                    <button 
                      onClick={() => setIsLogin(true)}
                      className="inline-flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 hover:border-white/40 text-white font-black px-10 py-3 rounded-full transition-all uppercase tracking-[0.2em] text-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95"
                    >
                      Already Member?
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-sm z-10 w-full px-6 flex flex-col items-center gap-4">
         <Link to="/" className="text-gray-600 hover:text-white transition-all font-black uppercase tracking-widest text-xs border-b border-transparent hover:border-white pb-1">← BACK TO RICO</Link>
         <p className="text-[10px] text-gray-500 tracking-[0.2em] font-medium">YOUR CAMPUS. YOUR STAGE.</p>
      </div>

    </div>
  );
};

export default StudentLogin;
