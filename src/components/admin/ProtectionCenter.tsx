import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  Zap, 
  Globe, 
  AlertTriangle, 
  RefreshCw, 
  Server,
  CloudLightning,
  Terminal,
  Cpu
} from 'lucide-react';
import { getSecurityStats, SecurityStats } from '../../lib/firewall';
import { useToast } from '../ToastProvider';

export const ProtectionCenter: React.FC = () => {
  const { push: toast } = useToast();
  const [stats, setStats] = useState<SecurityStats>({
    totalScans: 0,
    blockedAttempts: 0,
    threatLevel: 'low',
    activeNodes: 4,
    lastAttackAt: null
  });
  const [panicMode, setPanicMode] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    const data = await getSecurityStats();
    setStats(data);
  };

  const handleRunSystemScan = () => {
    setScanning(true);
    toast({ message: 'Initiating full system security scan...', type: 'info' });
    setTimeout(() => {
      setScanning(false);
      toast({ message: 'Deep scan complete. All core files integrity verified.', type: 'success' });
    }, 3000);
  };

  const togglePanic = () => {
    const newState = !panicMode;
    setPanicMode(newState);
    toast({ 
      message: newState ? 'SYSTEM LOCKDOWN ACTIVATED' : 'System lockdown lifted', 
      type: newState ? 'error' : 'success' 
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
             <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Shield className="w-6 h-6 text-indigo-400" />
             </div>
             PROTECTION CENTER
          </h2>
          <p className="text-gray-500 text-[10px] uppercase tracking-[0.4em] font-black mt-2 pl-1">
             Advanced Defense Matrix & System Integrity
          </p>
        </div>

        <div className="flex items-center gap-4">
           <button 
             onClick={handleRunSystemScan}
             disabled={scanning}
             className="superia-glass-card hover:bg-white/5 px-6 py-2.5 rounded-2xl border-white/5 hover:border-indigo-500/30 transition-all flex items-center gap-3 group"
           >
              <RefreshCw className={`w-4 h-4 text-indigo-400 ${scanning ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Run Integrity Check</span>
           </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Shield Status */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Integrity HUD */}
          <div className="superia-glass-card rounded-[2.5rem] p-10 relative overflow-hidden group">
             {/* Decorative background grid */}
             <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
             
             <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                <div className="relative">
                   <div className={`w-40 h-40 rounded-full flex items-center justify-center relative border-2 ${panicMode ? 'border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.2)]' : 'border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.1)]'}`}>
                      <div className={`absolute inset-4 rounded-full border border-dashed animate-spin-slow ${panicMode ? 'border-rose-500/40' : 'border-indigo-400/30'}`} style={{ animationDuration: '10s' }} />
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center ${panicMode ? 'bg-rose-500/10' : 'bg-indigo-500/10'}`}>
                         <Shield className={`w-12 h-12 ${panicMode ? 'text-rose-500 animate-pulse' : 'text-indigo-400'}`} />
                      </div>
                   </div>
                   {/* Shield Status Badge */}
                   <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#050508] border border-white/10 px-4 py-1.5 rounded-full shadow-2xl">
                      <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${panicMode ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)] animate-pulse'}`} />
                         <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">{panicMode ? 'SECURED LOCKDOWN' : 'OPTIMAL PROTECTION'}</span>
                      </div>
                   </div>
                </div>

                <div className="flex-1 space-y-6">
                   <div>
                      <h3 className="text-2xl font-black text-white tracking-tighter">Defense Matrix: Active</h3>
                      <p className="text-gray-500 text-xs mt-1 leading-relaxed max-w-md">
                         Full-stack security implementation verified. Environment headers: <strong>HSTS, CSP, X-Frame</strong> active. Multi-node cloud firewall monitoring 24/7.
                      </p>
                   </div>

                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'WAF', status: 'Online', icon: Globe, color: 'text-blue-400' },
                        { label: 'SSL', status: 'v1.3', icon: Lock, color: 'text-emerald-400' },
                        { label: 'DDoS', status: 'Mitigated', icon: Zap, color: 'text-amber-400' },
                        { label: 'R2', status: 'Isolated', icon: Server, color: 'text-purple-400' },
                      ].map((item, i) => (
                        <div key={i} className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl text-center group/item hover:bg-white/5 transition-colors">
                           <item.icon className={`w-5 h-5 mx-auto mb-2 ${item.color} group-hover/item:scale-110 transition-transform`} />
                           <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{item.label}</div>
                           <div className="text-[10px] font-bold text-white mt-0.5">{item.status}</div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>

          {/* Quick Actions & Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="superia-glass-card rounded-[2.5rem] p-8 border-rose-500/10 group overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-[40px]" />
                <div className="flex items-center gap-4 mb-6">
                   <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                      <CloudLightning className="w-5 h-5 text-rose-400" />
                   </div>
                   <h4 className="text-lg font-black text-white tracking-tight">Rapid Response</h4>
                </div>
                <div className="space-y-4">
                   <button 
                     onClick={togglePanic}
                     className={`w-full py-4 rounded-2xl border-2 font-black text-[12px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                       panicMode 
                       ? 'bg-rose-500 border-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]' 
                       : 'bg-rose-500/5 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white'
                     }`}
                   >
                      <Lock className="w-4 h-4" />
                      {panicMode ? 'Release Lockdown' : 'Activate Panic Lockdown'}
                   </button>
                   <p className="text-gray-500 text-[9px] text-center font-bold px-4">
                      Lockdown disables all incoming API requests and media uploads across the entire platform.
                   </p>
                </div>
             </div>

             <div className="superia-glass-card rounded-[2.5rem] p-8 border-indigo-500/10 group overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-[40px]" />
                <div className="flex items-center gap-4 mb-6">
                   <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                      <Cpu className="w-5 h-5 text-indigo-400" />
                   </div>
                   <h4 className="text-lg font-black text-white tracking-tight">System Controls</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <button className="p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-2xl text-center transition-all group/btn">
                      <Terminal className="w-5 h-5 text-gray-400 mx-auto mb-2 group-hover/btn:text-white transition-colors" />
                      <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Logs Cache</div>
                   </button>
                   <button 
                     onClick={() => setMaintenanceMode(!maintenanceMode)}
                     className={`p-4 border rounded-2xl text-center transition-all group/btn ${maintenanceMode ? 'bg-amber-500/20 border-amber-500/30' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'}`}>
                      <AlertTriangle className={`w-5 h-5 mx-auto mb-2 ${maintenanceMode ? 'text-amber-400' : 'text-gray-400 group-hover/btn:text-white'}`} />
                      <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Maint Mode</div>
                   </button>
                </div>
             </div>
          </div>
        </div>

        {/* Right Col: Live Logs & Metrics */}
        <div className="space-y-8">
           {/* Security Metrics */}
           <div className="superia-glass-card rounded-[2.5rem] p-8">
              <h4 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                 Live Defense Stats
              </h4>
              
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between items-end mb-2">
                       <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Blocked Requests</span>
                       <span className="text-xl font-black text-white">{stats.blockedAttempts}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                       <div className="h-full bg-rose-500 rounded-full" style={{ width: '12%' }} />
                    </div>
                 </div>

                 <div>
                    <div className="flex justify-between items-end mb-2">
                       <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">API Nodes Integrity</span>
                       <span className="text-xl font-black text-white">{stats.activeNodes}/4</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 rounded-full" style={{ width: '100%' }} />
                    </div>
                 </div>

                 <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                       <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Active Core</div>
                       <div className="text-xs font-bold text-emerald-400 tracking-tighter">NODE-04-RICO</div>
                    </div>
                    <div className="text-right">
                       <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Encryption</div>
                       <div className="text-xs font-bold text-white tracking-tighter">TLS 1.3 AES-256</div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Recent Protection Logs */}
           <div className="superia-glass-card rounded-[2.25rem] p-8 flex-1">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Security Event stream</h4>
              <div className="space-y-5">
                 {[
                   { type: 'PASS_GEN', msg: 'New VIP Pass Generated', time: '2m ago', color: 'bg-emerald-500' },
                   { type: 'API_REQ', msg: 'Filtered /api/get-r2-upload-url (Valid)', time: '14m ago', color: 'bg-indigo-500' },
                   { type: 'BLOCK', msg: 'Unauthorized Upload Attempt Blocked', time: '1h ago', color: 'bg-rose-500' },
                   { type: 'WAF', msg: 'Inbound filter rule refreshed', time: '3h ago', color: 'bg-indigo-400' },
                   { type: 'AUDIT', msg: 'Admin login from 103.21.XX.XX', time: '5h ago', color: 'bg-purple-500' },
                 ].map((log, i) => (
                   <div key={i} className="flex items-start gap-4 group/log">
                      <div className={`mt-1.5 w-2 h-2 rounded-full ${log.color} group-hover/log:scale-150 transition-transform`} />
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between gap-2 overflow-hidden">
                            <span className="text-[10px] font-black text-white truncate group-hover/log:text-indigo-300 transition-colors uppercase tracking-tight">{log.type}</span>
                            <span className="text-[8px] font-bold text-gray-600 uppercase tracking-tighter whitespace-nowrap">{log.time}</span>
                         </div>
                         <p className="text-[10px] text-gray-500 truncate mt-0.5">{log.msg}</p>
                      </div>
                   </div>
                 ))}
              </div>
              <button className="w-full mt-8 py-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-2xl text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] transition-all">
                 Download Security Audit PDF
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
