import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, CheckCircle2, ShieldCheck, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export const StudentResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if we have an active session (from OTP verification)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired or invalid. Please request a new reset code.');
        navigate('/student/forgot-password');
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setSuccess(true);
      toast.success('Password updated successfully!');
      
      // Auto-login or redirect to login after a delay
      setTimeout(() => {
        navigate('/student/login');
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] p-6 relative overflow-hidden font-inter">
        <div className="absolute inset-0 bg-cyan-500/5 pointer-events-none" />
        <div className="max-w-md w-full relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rico-glass-card rounded-[2.5rem] p-10 border border-white/10 shadow-2xl"
          >
            <div className="w-24 h-24 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-8 relative">
              <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full" />
              <CheckCircle2 className="w-12 h-12 text-cyan-400 relative z-10" />
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-4 tracking-tight">All Set!</h1>
            <p className="text-gray-400 mb-10 leading-relaxed text-sm">
              Your password has been successfully updated. You will be redirected to the login page in a few seconds.
            </p>
            <Link
              to="/student/login"
              className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all font-bold text-sm border border-white/5"
            >
              Go to Login
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-6 relative overflow-hidden font-inter">
      {/* Background Decor */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-20%] w-[50%] h-[50%] bg-violet-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rico-glass-card rounded-[2.5rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden"
        >
          <div className="mb-10 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">New Password</h1>
            <p className="text-gray-400 text-sm">
              Create a secure password for your student account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest mb-3 ml-1">
                  New Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all text-sm font-medium"
                    placeholder="Min. 6 characters"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest mb-3 ml-1">
                  Confirm Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all text-sm font-medium"
                    placeholder="Repeat new password"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default StudentResetPassword;
