import React from 'react';
import { Shield, Fingerprint, Cpu, Wifi } from 'lucide-react';

interface SecurityHUDProps {
  user: any;
  connectionStatus: 'ok' | 'error';
  isTOTPEnabled: boolean;
}

export const SecurityHUD: React.FC<SecurityHUDProps> = ({ user }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Security Protocol Override - Primary Card */}
      <div className="lg:col-span-2 hyper-glass rounded-[2rem] p-8 border-red-500/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8">
           <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center animate-security-pulse">
              <Shield className="text-red-500" size={24} />
           </div>
        </div>
        
        <div className="relative z-10 space-y-6">
          <div>
            <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] mb-3">Priority Override Active</h3>
            <h2 className="text-4xl font-black text-white tracking-tighter leading-none">Security Protocol <span className="text-red-600">Override</span></h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/10">
              <Wifi size={14} className="text-red-400" />
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Neural Link Sync: 100%</span>
            </div>
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <Cpu size={14} className="text-white/40" />
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Kernel V10.0.4</span>
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 rounded-xl border-4 border-[#050508] bg-gray-900 flex items-center justify-center text-[10px] font-black text-white/20 uppercase">
                  {i}
                </div>
              ))}
              <div className="w-10 h-10 rounded-xl border-4 border-[#050508] bg-red-600 flex items-center justify-center text-[10px] font-black text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                OP
              </div>
            </div>
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Authorized Access Only</p>
          </div>
        </div>
        
        {/* Animated Background Pulse */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
      </div>

      {/* Identity Signature Card */}
      <div className="hyper-glass rounded-[2rem] p-8 border-indigo-500/20 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center justify-between text-indigo-400">
            <Fingerprint size={28} className="animate-pulse" />
            <div className="px-3 py-1 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
               <span className="text-[9px] font-black uppercase tracking-widest">Verified</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">Identity Signature</h3>
            <p className="text-xl font-bold text-white tracking-tight truncate">{user?.email}</p>
          </div>
        </div>
        
        <div className="mt-8 space-y-3">
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-gradient-to-r from-indigo-500 to-violet-600 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
          </div>
          <p className="text-[9px] font-black text-white/20 uppercase tracking-widest text-right">Auth Confidence: 99.4%</p>
        </div>
      </div>
    </div>
  );
};
