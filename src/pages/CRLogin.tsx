import {useCoreData} from '../context/CoreDataContext';
import {registrationBatches} from '../utils/registrationBatches';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, Users, ChevronDown, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';

export const CRLogin: React.FC = () => {
  const navigate = useNavigate();
  const {siteSettings,loading:settingsLoading}=useCoreData();
  const batches=registrationBatches(siteSettings);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const loadingBatches=settingsLoading&&!siteSettings;
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{if(selectedBatch&&!batches.includes(selectedBatch))setSelectedBatch('');},[selectedBatch,siteSettings]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) {
      toast.error('Please select your batch');
      return;
    }
    if (!password) {
      toast.error('Please enter the password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/cr-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ batch: selectedBatch, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Login failed');
      const { error } = await supabase.auth.verifyOtp({ token_hash: result.token_hash, type: 'magiclink' });
      if (error) throw error;
      {
        const session = {
          batch: selectedBatch,
          authenticated: true,
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // 12 hours
        };
        sessionStorage.setItem('cr_session', JSON.stringify(session));
        toast.success(`Welcome, CR for ${selectedBatch}!`);
        navigate('/cr/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black overflow-hidden relative flex flex-col items-center justify-center px-4 py-12">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-black to-purple-950/20 z-0"></div>
      
      {/* Back button */}
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-6 left-6 z-10 flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div ref={containerRef} className="w-full max-w-md z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-2">
            <Users size={32} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">CR Portal</h1>
          <p className="text-gray-500 text-xs tracking-wider uppercase font-bold">Choose the same batch as student registration. No email required.</p>
        </div>

        <div className="bg-[#0b0c10] border border-white/[0.08] p-8 rounded-3xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Batch Select */}
            <div className="space-y-2">
              <label htmlFor="cr-login-batch" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Batch</label>
              <div className="relative">
                {loadingBatches ? (
                  <div className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3.5 px-4 text-[14px] text-gray-500 animate-pulse">
                    Loading batches...
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3.5 px-4 text-[14px] text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                      id="cr-login-batch" required
                    >
                      <option value="" disabled className="bg-black text-gray-500">-- Choose your Batch --</option>
                      {batches.map((b) => (
                        <option key={b} value={b} className="bg-black text-white">{b}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </>
                )}
              </div>
            </div>

            {!loadingBatches&&!batches.length&&<p role="status" className="text-sm text-gray-400">No registration batches available. Contact your festival admin.</p>}
            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="cr-login-password" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Batch PIN / password</label>
              <div className="relative">
                <input
                  id="cr-login-password" type="password"
                  autoComplete="current-password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Batch PIN / password"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3.5 px-4 text-[14px] text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
                  required
                />
                <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || loadingBatches || !selectedBatch || !password}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-black text-sm tracking-widest uppercase transition-all shadow-[0_8px_24px_rgba(99,102,241,0.35)] flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verifying...
                </>
              ) : (
                'Login to Dashboard →'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-wider">
          {BRAND_NAME} {BRAND_YEAR} • Security Controlled
        </p>
      </div>
    </div>
  );
};
