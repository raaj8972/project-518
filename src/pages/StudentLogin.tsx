import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStudentAuth } from '../context/StudentAuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Mail, Lock, Phone, GraduationCap, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import { useCoreData } from '../context/CoreDataContext';
import { ChevronDown } from 'lucide-react';

const StudentLogin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const redirectPath = searchParams.get('redirect');
  const [isLogin, setIsLogin] = useState(mode !== 'signup');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [batch, setBatch] = useState('');
  const [signupStep, setSignupStep] = useState(1);
  const [otp, setOtp] = useState('');
  const { isAuthenticated, signInWithGoogle } = useStudentAuth();
  const { siteSettings } = useCoreData();
  const navigate = useNavigate();

  const rawPt = (siteSettings as any)?.registration_participant_types;
  const rawBo = (siteSettings as any)?.batch_options;
  
  const batchOptions = (Array.isArray(rawPt) && rawPt.length > 0)
    ? rawPt
    : (Array.isArray(rawBo) && rawBo.length > 0)
    ? rawBo
    : ['Batch 2024', 'Batch 2025', 'Batch 2026', 'Batch 2027'];

  useEffect(() => {
    if (siteSettings) {
      console.log('[StudentLogin] Batch Options Resolved:', {
        fromParticipantTypes: rawPt,
        fromBatchOptions: rawBo,
        final: batchOptions
      });
    }
  }, [siteSettings, rawPt, rawBo, batchOptions]);
  const showCollege = siteSettings?.registration_institution_visible ?? false;

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath || '/dashboard');
    }
  }, [isAuthenticated, navigate, redirectPath]);

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setSignupStep(1);
    setOtp('');
    setLoading(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin && signupStep === 1) {
      setSignupStep(2);
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Welcome back!');
      } else {
        // Step 2 Signup
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone,
              college: showCollege ? college : 'N/A',
              batch: batch,
              participant_type: batch
            }
          }
        });
        if (error) throw error;
        
        toast.success('OTP sent to your email!');
        setSignupStep(3);
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      if (error) throw error;
      toast.success('New code sent!');
      setResendTimer(60); // 60s cooldown
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup'
      });
      if (error) throw error;
      toast.success('Email verified successfully!');
      navigate(redirectPath || '/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (error: any) {
      toast.error(error.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-red-600/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-red-800/10 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Student <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500">Portal</span>
          </h1>
          <p className="text-gray-400">Manage your registrations for {BRAND_NAME} {BRAND_YEAR}</p>
        </div>

        <div className="rico-glass-card p-8 rounded-2xl border border-white/10 backdrop-blur-xl bg-white/5 relative overflow-hidden">
          {/* Progress bar for loading */}
          {loading && (
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              className="absolute top-0 left-0 h-1 bg-gradient-to-r from-red-500 to-orange-500 z-20"
            />
          )}

          <div className="flex p-1 bg-white/5 rounded-xl mb-8">
            <button
              onClick={() => { setIsLogin(true); setSignupStep(1); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${isLogin ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Login
            </button>
            <button
              onClick={() => { setIsLogin(false); setSignupStep(1); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${!isLogin ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={!isLogin && signupStep === 3 ? handleVerifyOtp : handleAuth} className="space-y-4">
            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.div
                  key="login-fields"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
                    <input
                      type="email"
                      placeholder="Email Address"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 transition-all"
                    />
                  </div>

                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
                    <input
                      type="password"
                      placeholder="Password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 transition-all"
                    />
                  </div>
                </motion.div>
              ) : signupStep === 1 ? (
                <motion.div
                  key="signup-step-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                   <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
                    <input
                      type="email"
                      placeholder="Email Address"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 transition-all"
                    />
                  </div>

                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
                    <input
                      type="password"
                      placeholder="Create Password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 transition-all"
                    />
                  </div>
                </motion.div>
              ) : signupStep === 2 ? (
                <motion.div
                  key="signup-step-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="relative group">
                    <LogIn className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
                    <input
                      type="text"
                      placeholder="Full Name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 transition-all"
                    />
                  </div>
                  <div className="relative group">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 transition-all"
                    />
                  </div>
                  <div className={`grid ${showCollege ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                    {showCollege && (
                      <div className="relative group">
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
                        <input
                          type="text"
                          placeholder="College"
                          required={showCollege}
                          value={college}
                          onChange={(e) => setCollege(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 transition-all text-sm"
                        />
                      </div>
                    )}
                    <div className="relative group">
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors pointer-events-none" />
                      <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
                      <select
                        required
                        value={batch}
                        onChange={(e) => setBatch(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-white focus:outline-none focus:border-red-500/50 transition-all text-sm appearance-none cursor-pointer"
                      >
                        <option value="" disabled className="bg-[#121212]">Select Batch</option>
                        {batchOptions.map((option: string) => (
                          <option key={option} value={option} className="bg-[#121212]">{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSignupStep(1)}
                    className="text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    ← Back to step 1
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="signup-step-3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-gray-400 text-center mb-4">
                    Enter the verification code sent to <br/>
                    <span className="text-white font-medium">{email}</span>
                  </p>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
                    <input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 transition-all text-center tracking-[0.5em] font-mono text-xl"
                    />
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <button 
                      type="button"
                      onClick={() => setSignupStep(2)}
                      className="text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      ← Back to details
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading || resendTimer > 0}
                      className="text-xs text-red-400 hover:text-red-300 disabled:text-gray-600 font-medium transition-colors"
                    >
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 group transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : signupStep === 1 ? 'Continue' : signupStep === 2 ? 'Send OTP' : 'Verify & Sign Up'}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {siteSettings?.student_google_auth_enabled && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#121212] px-2 text-gray-500">Or continue with</span>
                </div>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-xl border border-white/10 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.02.68-2.33 1.08-3.71 1.08-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>
            </>
          )}

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-gray-500 text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button 
                onClick={toggleMode}
                className="ml-2 text-red-400 hover:text-red-300 font-medium"
              >
                {isLogin ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6">
          <Link to="/" className="text-gray-500 hover:text-white text-sm transition-colors">Back to Home</Link>
          <span className="w-1 h-1 bg-white/10 rounded-full" />
          <Link to="/student/forgot-password"  className="text-gray-500 hover:text-white text-sm transition-colors">Forgot Password?</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default StudentLogin;

