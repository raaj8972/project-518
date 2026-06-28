import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, Users, ChevronDown, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';

export const CRLogin: React.FC = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<string[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const { data, error } = await supabase
          .from('batch_crs')
          .select('batch')
          .order('batch', { ascending: true });

        if (error) throw error;
        setBatches(data ? data.map(item => item.batch) : []);
      } catch (err: any) {
        console.error('Error loading batches:', err);
        // Fallback batches
        setBatches(['Batch 2024', 'Batch 2025', 'Batch 2026', 'Batch 2027', '2021', '2022', '2023', '2024', '2025', '2026', '2027']);
      } finally {
        setLoadingBatches(false);
      }
    };
    fetchBatches();
  }, []);

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
      const { data, error } = await supabase.rpc('verify_cr_login', {
        p_batch: selectedBatch,
        p_password: password.trim()
      });

      if (error) throw error;

      if (data === true) {
        const session = {
          batch: selectedBatch,
          password: password.trim(),
          authenticated: true,
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // 12 hours
        };
        sessionStorage.setItem('cr_session', JSON.stringify(session));
        toast.success(`Welcome, CR for ${selectedBatch}!`);
        navigate('/cr/dashboard');
      } else {
        toast.error('Invalid password for this batch CR');
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
          <p className="text-gray-500 text-xs tracking-wider uppercase font-bold">Class Representative Access</p>
        </div>

        <div className="bg-[#0b0c10] border border-white/[0.08] p-8 rounded-3xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Batch Select */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Batch</label>
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
                      required
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

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">CR Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter CR Password"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3.5 px-4 text-[14px] text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
                  required
                />
                <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || loadingBatches}
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
