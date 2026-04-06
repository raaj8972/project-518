import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, GraduationCap, Loader2, Sparkles, LogOut, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import { useCoreData } from '../context/CoreDataContext';

const InputField = ({ icon: Icon, ...props }: any) => (
  <div className="relative group mb-6">
    <input
      {...props}
      className={`w-full bg-transparent border-b-2 border-white/10 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#a855f7] transition-all pr-8 peer ${props.className || ''}`}
    />
    <Icon className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-4 text-gray-500 peer-focus:text-[#a855f7] transition-colors" />
  </div>
);

const StudentLogin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const redirectPath = searchParams.get('redirect');
  const [isLogin, setIsLogin] = useState(mode !== 'signup');
  const [loading, setLoading] = useState(false);
  
  // Profile Completion States
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [batch, setBatch] = useState('');

  const { 
    isAuthenticated, 
    isProfileComplete, 
    profile, 
    signInWithGoogle, 
    updateProfile, 
    signOut,
    loading: authLoading 
  } = useStudentAuth();
  
  const { siteSettings } = useCoreData();
  const navigate = useNavigate();

  const rawPt = (siteSettings as any)?.registration_participant_types;
  const rawBo = (siteSettings as any)?.batch_options;
  const batchOptions = (Array.isArray(rawPt) && rawPt.length > 0)
    ? rawPt
    : (Array.isArray(rawBo) && rawBo.length > 0)
    ? rawBo
    : ['Batch 2024', 'Batch 2025', 'Batch 2026', 'Batch 2027'];
    
  const showCollege = siteSettings?.registration_institution_visible ?? false;

  // Sync profile data when authenticated but incomplete
  useEffect(() => {
    if (isAuthenticated && profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setCollege(profile.college || '');
      setBatch(profile.batch || '');
    }
  }, [isAuthenticated, profile]);

  // Handle Redirection
  useEffect(() => {
    if (isAuthenticated && isProfileComplete && !authLoading) {
      const timer = setTimeout(() => {
        navigate(redirectPath || '/dashboard');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isProfileComplete, authLoading, navigate, redirectPath]);

  const handleGoogleAction = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (error: any) {
      toast.error(error.message || 'Google authentication failed');
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !batch || (showCollege && !college)) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await updateProfile({
        full_name: fullName,
        phone,
        college: showCollege ? college : 'N/A',
        batch,
        participant_type: batch
      });

      if (error) throw error;
      toast.success('Profile completed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const overlayVariants = {
    login: { x: '100%', borderTopLeftRadius: '100px', borderBottomLeftRadius: '100px', borderTopRightRadius: '0px', borderBottomRightRadius: '0px' },
    signup: { x: '0%', borderTopLeftRadius: '0px', borderBottomLeftRadius: '0px', borderTopRightRadius: '100px', borderBottomRightRadius: '100px' }
  };

  // 1. Loading State
  if (authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#05050A] text-white">
        <Loader2 className="w-12 h-12 animate-spin text-[#a855f7] mb-4" />
        <p className="text-gray-400 animate-pulse">Initializing Secure Portal...</p>
      </div>
    );
  }

  // 2. Profile Completion Form (Authenticated but Incomplete)
  if (isAuthenticated && !isProfileComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05050A] p-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#a855f7]/10 rounded-full blur-[120px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl bg-[#0d0d12]/90 backdrop-blur-2xl border border-[#a855f7]/30 rounded-[2.5rem] p-8 md:p-12 shadow-[0_0_50px_rgba(168,85,247,0.15)] relative z-10"
        >
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-4xl font-extrabold text-white mb-2 flex items-center gap-3">
                Complete Profile <Sparkles className="text-yellow-400 w-8 h-8" />
              </h2>
              <p className="text-gray-400">Just a few more details to get you started with {BRAND_NAME} {BRAND_YEAR}.</p>
            </div>
            <button onClick={() => signOut()} className="p-3 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-2xl transition-all group" title="Logout">
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>

          <form onSubmit={handleCompleteProfile} className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div className="md:col-span-2">
              <InputField icon={User} type="text" placeholder="Full Name" required value={fullName} onChange={(e:any) => setFullName(e.target.value)} />
            </div>
            
            <InputField icon={Phone} type="tel" placeholder="Phone Number" required value={phone} onChange={(e:any) => setPhone(e.target.value)} />
            
            <div className="relative mb-6">
              <select 
                required 
                value={batch} 
                onChange={(e) => setBatch(e.target.value)} 
                className="w-full bg-transparent border-b-2 border-white/10 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#a855f7] transition-all appearance-none cursor-pointer"
              >
                <option value="" disabled className="bg-[#05050A]">Select Batch/Type</option>
                {batchOptions.map((opt: string) => <option key={opt} value={opt} className="bg-[#05050A]">{opt}</option>)}
              </select>
              <GraduationCap className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-4 text-gray-500" />
            </div>

            {showCollege && (
              <div className="md:col-span-2">
                <InputField icon={GraduationCap} type="text" placeholder="College / Institution" required value={college} onChange={(e:any) => setCollege(e.target.value)} />
              </div>
            )}

            <div className="md:col-span-2 mt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] hover:from-[#7e22ce] hover:to-[#9333ea] text-white font-bold py-4 rounded-2xl shadow-[0_10px_30px_rgba(168,85,247,0.3)] transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    Initialize Student ID
                    <CheckCircle2 className="w-5 h-5" />
                  </>
                )}
              </button>
              <p className="text-center text-xs text-gray-600 mt-6">
                By continuing, you agree to our terms and conditions for {BRAND_NAME} registration.
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  // 3. Authenticated and Complete (Redirecting)
  if (isAuthenticated && isProfileComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#05050A] text-white">
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
    <div className="min-h-screen flex items-center justify-center bg-[#05050A] relative overflow-hidden font-sans p-4 pt-20">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#a855f7]/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />

      {/* Main Container Desktop */}
      <div className="hidden lg:flex relative w-full max-w-[1000px] min-h-[600px] bg-[#0d0d12] rounded-[3rem] shadow-[0_0_80px_rgba(168,85,247,0.15)] border border-[#a855f7]/30 overflow-hidden">
        
        {/* SIGN UP PANEL (Left Side Form) */}
        <div className="absolute top-0 left-0 w-1/2 h-full px-16 py-12 flex flex-col justify-center text-left">
          <h2 className="text-5xl font-black text-white mb-6 tracking-tight">Sign Up</h2>
          <p className="text-gray-400 mb-10 text-lg leading-relaxed">Join the most anticipated technical fest of the year. Register now to experience innovation.</p>
          
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
          <div className="absolute inset-0 bg-gradient-to-br from-[#4c1d95] via-[#7e22ce] to-[#1e1b4b] z-0" />
          {/* Animated texture overlay */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay animate-pulse" />

          <div className="relative z-40 w-full px-6">
            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.div key="w-login" initial={{opacity:0, scale:0.9, y: 30}} animate={{opacity:1, scale:1, y: 0}} exit={{opacity:0, scale:0.9, y: -30, position:'absolute', top:0, left:0, width:'100%'}}>
                  <Sparkles className="w-12 h-12 text-yellow-300 mx-auto mb-6" />
                  <h2 className="text-5xl font-black mb-8 leading-[1.1] tracking-tighter uppercase italic">Stay Ahead <br/> Secure Faster</h2>
                  <p className="mb-12 text-[#d8b4fe] leading-relaxed font-bold text-xl">Sign in to your student dashboard using Google for a 2-click experience.</p>
                  <button onClick={() => setIsLogin(false)} className="px-14 py-4 rounded-full border-4 border-white font-black text-xl hover:bg-white hover:text-[#4c1d95] transition-all hover:scale-105 active:scale-[0.98]">
                    NEED ACCOUNT?
                  </button>
                </motion.div>
              ) : (
                <motion.div key="w-signup" initial={{opacity:0, scale:0.9, y: 30}} animate={{opacity:1, scale:1, y: 0}} exit={{opacity:0, scale:0.9, y: -30, position:'absolute', top:0, left:0, width:'100%'}}>
                  <div className="w-20 h-2 bg-white rounded-full mx-auto mb-10" />
                  <h2 className="text-5xl font-black mb-8 leading-[1.1] tracking-tighter uppercase italic">Join the <br/> Revolution</h2>
                  <p className="mb-12 text-[#d8b4fe] leading-relaxed font-bold text-xl">Start your journey with {BRAND_NAME} {BRAND_YEAR}. Instant signup with Google.</p>
                  <button onClick={() => setIsLogin(true)} className="px-14 py-4 rounded-full border-4 border-white font-black text-xl hover:bg-white hover:text-[#4c1d95] transition-all hover:scale-105 active:scale-[0.98]">
                    ALREADY MEMBER?
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Mobile Experience (Always Stacked) */}
      <div className="lg:hidden w-full max-w-md bg-[#0d0d12]/90 backdrop-blur-2xl border border-[#a855f7]/30 rounded-[3rem] p-10 shadow-[0_0_40px_rgba(168,85,247,0.2)] z-10 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-[#a855f7]/20 blur-[60px] rounded-full pointer-events-none" />
         
         <div className="flex bg-white/5 p-1 rounded-2xl mb-12 relative z-10">
            <button onClick={() => setIsLogin(true)} className={`flex-1 py-4 text-sm font-black rounded-xl transition-all uppercase tracking-widest ${isLogin ? 'bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>Login</button>
            <button onClick={() => setIsLogin(false)} className={`flex-1 py-4 text-sm font-black rounded-xl transition-all uppercase tracking-widest ${!isLogin ? 'bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>Join</button>
         </div>

         <div className="relative z-10">
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} key={isLogin ? 'm-login' : 'm-join'}>
               <h2 className="text-4xl font-black text-white mb-6 uppercase italic tracking-tighter">{isLogin ? 'Welcome Back' : 'Create Squad'}</h2>
               <p className="text-gray-400 mb-10 font-medium">{isLogin ? 'Authentication is now powered by Google for your security.' : 'Enter the world of tech with the fastest signup flow.'}</p>
               
               <button 
                type="button" 
                onClick={handleGoogleAction}
                disabled={loading}
                className="w-full bg-white text-black font-black py-4.5 rounded-[1.5rem] shadow-2xl transition-all flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : (
                  <>
                    <svg className="w-6 h-6" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.02.68-2.33 1.08-3.71 1.08-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    CONTINUE WITH GOOGLE
                  </>
                )}
              </button>
            </motion.div>
         </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-sm z-10 w-full px-6 flex flex-col items-center gap-4">
         <Link to="/" className="text-gray-600 hover:text-white transition-all font-black uppercase tracking-widest text-xs border-b border-transparent hover:border-white pb-1">← HOME PORTAL</Link>
         <p className="text-[10px] text-gray-700 tracking-[0.2em] font-medium">PROTECTED BY CLOUD SHIELD 2.0</p>
      </div>

    </div>
  );
};

export default StudentLogin;
