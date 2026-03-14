import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, ArrowLeft, Shield, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SportsLogin: React.FC = () => {
  const [passcode, setPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth(); // AuthContext login

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // 1. Verify Passcode with Netlify function
      const res = await fetch('/api/verify-council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Invalid passcode');
      }

      const data = await res.json();
      
      if (!data.success || !data.credentials) {
        throw new Error('Authentication failed');
      }

      console.log('[Login] Credentials received, attempting session establishment...');
      // 2. Perform hidden Firebase email/password login
      const loginRes = await login(
        data.credentials.email, 
        data.credentials.password, 
        undefined, 
        true // bypass TOTP for this dedicated account
      );

      if (!loginRes.success) {
        console.error('[Login] Firebase login failed:', loginRes.error);
        throw new Error(loginRes.error || 'Failed to establish secure session');
      }

      console.log('[Login] Successful, navigating to /admin');
      // Success! Navigate to dashboard
      navigate('/admin');

    } catch (err: any) {
      setError(err.message || 'Access denied');
      setPasscode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          {/* Back Button */}
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 text-neutral-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors mb-6 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Login
          </button>
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Sports Council</h1>
            <p className="text-emerald-400 font-medium tracking-widest uppercase text-sm mt-2">Authorized Access Only</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-start gap-3 text-red-400 animate-in zoom-in-95 duration-300">
              <Shield className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2 ml-1">Secure Passcode</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter your passcode"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-12 pr-4 py-4 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !passcode}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 hover:from-emerald-400 hover:to-teal-500 transform hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Grant Access</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-neutral-500 text-sm mt-8">
          Protected by Rico Unified Security
        </p>
      </div>
    </div>
  );
};
