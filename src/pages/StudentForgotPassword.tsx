import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, Send, CheckCircle2, Loader2, Sparkles, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const StudentForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    try {
      // Use Supabase to send reset password OTP (if configured as Token)
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;
      setStep(2); // Transition to OTP verification step
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send reset code. Please try again.');
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
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setResendTimer(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery'
      });
      if (error) throw error;
      // Success: User is now signed in. Redirect to update password page.
      setStep(3); // Transition to success message
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-6 relative overflow-hidden font-inter">
      {/* Background Animated Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="max-w-md w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Link 
            to="/student/login" 
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors group"
          >
            <div className="p-2 bg-white/5 rounded-lg mr-3 group-hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            </div>
            <span className="text-sm font-medium tracking-wide">Back to Student Login</span>
          </Link>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="forgot-form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="rico-glass-card rounded-[2.5rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden"
            >
              {/* Subtle light streak */}
              <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/10 to-transparent rotate-45 pointer-events-none" />

              <div className="mb-10 text-center relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 relative">
                  <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                  <Mail className="w-8 h-8 text-blue-400 relative z-10" />
                  <Sparkles className="absolute -top-2 -right-2 w-4 h-4 text-purple-400 animate-pulse" />
                </div>
                <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">Recover Account</h1>
                <p className="text-gray-400 text-sm leading-relaxed max-w-[280px] mx-auto">
                  Enter your registered email and we'll send you a 6-digit code to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 relative">
                <div>
                  <label htmlFor="email" className="block text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.2em] mb-3 ml-1">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-sm font-medium"
                      placeholder="Enter your student email"
                      disabled={loading}
                    />
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-medium flex items-center gap-3"
                  >
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] group"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                      Send Reset Code
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : step === 2 ? (
            <motion.div
              key="otp-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="rico-glass-card rounded-[2.5rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden text-center"
            >
              <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <LockKeyhole className="w-8 h-8 text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Verify it's you</h1>
              <p className="text-gray-400 text-sm mb-8">
                We've sent a code to <br/> <span className="text-white font-medium">{email}</span>
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="relative group">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/50 transition-all text-center text-2xl tracking-[0.5em] font-mono"
                    disabled={loading}
                  />
                </div>

                <div className="flex justify-between items-center px-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    ← Back to email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading || resendTimer > 0}
                    className="text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-600 font-medium transition-colors"
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                  </button>
                </div>

                {error && (
                  <div className="text-red-400 text-xs font-medium bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Verify Code'}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="rico-glass-card rounded-[2.5rem] p-10 text-center border border-white/10 shadow-2xl relative overflow-hidden"
            >
               <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
              
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                <CheckCircle2 className="w-12 h-12 text-emerald-400 relative z-10" />
              </div>
              
              <h1 className="text-3xl font-extrabold text-white mb-4 tracking-tight">Verified!</h1>
              <p className="text-gray-400 mb-10 leading-relaxed text-sm">
                Your identity has been confirmed. You can now set a new password for your account.
              </p>
              
              <Link
                to="/student/reset-password"
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-95 group"
              >
                Set New Password
                <Send className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 text-center"
        >
          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            <span className="w-1 h-1 bg-gray-500 rounded-full" />
            Standard Security Protocol Alpha
            <span className="w-1 h-1 bg-gray-500 rounded-full" />
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default StudentForgotPassword;
