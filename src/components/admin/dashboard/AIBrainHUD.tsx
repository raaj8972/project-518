import React from 'react';
import { Sparkles, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AIBrainHUDProps {
  stats: {
    pendingRegistrations: number;
    approvedRegistrations: number;
    totalEvents: number;
    systemHealth: 'optimal' | 'warning' | 'critical';
    facesIndexed: number;
    totalFaces: number;
  };
}

export const AIBrainHUD: React.FC<AIBrainHUDProps> = ({ stats }) => {
  const getInsight = () => {
    if (stats.pendingRegistrations > 10) {
      return "There's a high volume of pending registrations. I suggest prioritizing approvals to maintain event momentum.";
    }
    if (stats.facesIndexed < stats.totalFaces * 0.5) {
      return "Neural mapping is currently under-capacity. I recommend initiating a batch indexing session for the event gallery.";
    }
    if (stats.systemHealth !== 'optimal') {
      return "System latency detected in specific nodes. I'm monitoring the situation, but a quick cache clear might help.";
    }
    return "All systems are performing at peak efficiency. It's a great time to review the upcoming event schedules.";
  };

  return (
    <div className="rico-glass-card rounded-[2.5rem] p-8 relative overflow-hidden group">
      {/* Animated HUD Scanline */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent h-20 w-full -translate-y-full group-hover:translate-y-[500%] transition-transform duration-[3s] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center relative overflow-hidden">
            <Sparkles className="w-10 h-10 text-indigo-400 animate-pulse" />
            
            {/* Pulsing Rings */}
            <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full animate-ping opacity-20" />
            <div className="absolute inset-4 border border-purple-500/30 rounded-full animate-pulse" style={{ animationDuration: '3s' }} />
          </div>
          
          <div className="absolute -bottom-2 -right-2 bg-[#050508] p-1.5 rounded-xl border border-white/10 shadow-2xl">
            {stats.systemHealth === 'optimal' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400" />
            )}
          </div>
        </div>

        <div className="flex-1 text-center md:text-left space-y-3">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="h-px w-8 bg-indigo-500/30" />
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">RICO INTELLIGENCE</span>
          </div>
          
          <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter leading-tight">
            "Welcome back. {getInsight()}"
          </h3>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5">
              <Activity size={14} className="text-gray-500" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Efficiency: 98.4%</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5">
               <div className={`w-1.5 h-1.5 rounded-full ${stats.facesIndexed >= stats.totalFaces ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Neural Map: {Math.round((stats.facesIndexed / (stats.totalFaces || 1)) * 100)}%</span>
            </div>
          </div>
        </div>

        <div className="hidden lg:grid grid-cols-2 gap-3 min-w-[240px]">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
            <div className="text-lg font-black text-white">{stats.pendingRegistrations}</div>
            <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest">New Priority</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
            <div className="text-lg font-black text-white">{stats.facesIndexed}</div>
            <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Neural Maps</div>
          </div>
        </div>
      </div>
    </div>
  );
};
