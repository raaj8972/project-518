import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { 
  Play, 
  Pause, 
  Scan,
  Loader2,
  Trash2,
  AlertTriangle,
  X,
  Sparkles,
  Zap,
  Fingerprint,
  Cpu,
  Image,
  Users,
  Terminal,
  Activity
} from 'lucide-react';
import { useToast } from '../../components/ToastProvider';
import { supabase } from '../../lib/supabase';

export const GalleryFaceIndexer: React.FC = () => {
  const { galleryImages } = useData();
  const { push: toast } = useToast();
  const [indexing, setIndexing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, processed: 0, facesFound: 0, errors: 0 });
  const [activity, setActivity] = useState<{id: string, time: string, msg: string, type: 'info'|'success'|'error'}[]>([]);
  const [stopRequested, setStopRequested] = useState(false);
  const [loading, setLoading] = useState(true);

  const addActivity = (msg: string, type: 'info'|'success'|'error' = 'info') => {
    setActivity(prev => [{
      id: Math.random().toString(36).substring(7),
      time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      msg,
      type
    }, ...prev].slice(0, 15));
  };

  // Fetch current database stats on mount
  React.useEffect(() => {
    fetchStats();
  }, [galleryImages]);

  const fetchStats = async () => {
    try {
      // 1. Get count of images marked as indexed
      const processedCount = galleryImages.filter(img => (img as any).faces_indexed).length;
      
      // 2. Get total faces found
      const { count: facesCount } = await supabase
        .from('gallery_faces' as any)
        .select('*', { count: 'exact', head: true });
      
      setStats({
        total: galleryImages.length,
        processed: processedCount,
        facesFound: facesCount || 0,
        errors: 0
      });
    } catch (err) {
      console.error('Failed to fetch face stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const startIndexing = async () => {
    setIndexing(true);
    setStopRequested(false);
    setProgress(0);
    addActivity('Vision core sequence initialized', 'info');

    let keepGoing = true;

    while (keepGoing && !stopRequested) {
      try {
        const res = await fetch('/api/index-faces-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 1 })
        });

        if (!res.ok) {
            let errorMsg = 'Batch failed';
            try {
                const data = await res.json();
                errorMsg = data.error || errorMsg;
            } catch {
                const text = await res.text();
                errorMsg = text.slice(0, 100);
            }
            throw new Error(errorMsg);
        }

        const data = await res.json();
        
        if (data.processed === 0) {
            keepGoing = false;
            addActivity('All neural maps synchronized', 'success');
            toast({ message: 'All images indexed!', type: 'success' });
        } else {
            setStats(prev => ({
                ...prev,
                processed: (prev.processed || 0) + data.processed,
                facesFound: (prev.facesFound || 0) + data.facesFound
            }));
            addActivity(`Analyzed image block: ${data.facesFound} identities isolated`, 'info');
            setProgress((stats.processed / (stats.total || 1)) * 100); 
        }

      } catch (err: any) {
        console.error('Batch indexing error:', err);
        setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
        addActivity(`Sync error: ${err.message}`, 'error');
        keepGoing = false; 
      }
      
      await new Promise(r => setTimeout(r, 800)); // Smooth cadence
      if (stopRequested) {
        keepGoing = false;
        addActivity('Sequence terminated by user', 'error');
      }
    }

    setIndexing(false);
    setProgress(100);
    fetchStats();
  };

  const clearFaceIndex = async () => {
    if (!window.confirm('Are you sure you want to clear the entire face database? This will also reset the scan status for all images.')) return;
    
    try {
      addActivity('Wiping neural database...', 'info');
      const { error: deleteError } = await supabase.from('gallery_faces' as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase.from('gallery_images').update({ faces_indexed: false } as any).neq('id', -1);
      if (updateError) throw updateError;

      toast({ message: 'Face index cleared.', type: 'success' });
      addActivity('Neural database wiped successfully', 'success');
      fetchStats();
      setProgress(0);
    } catch (err) {
      console.error('Failed to clear index:', err);
      toast({ message: 'Failed to clear face index.', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="superia-glass-card rounded-[3rem] p-24 relative overflow-hidden flex flex-col items-center justify-center text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent animate-pulse" />
        <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mb-6 relative z-10" />
        <h3 className="text-2xl font-black text-white tracking-tighter relative z-10 uppercase italic">Initializing Vision...</h3>
        <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-[10px] mt-4 relative z-10">Synchronizing neural data maps</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      {/* Header Section */}
      <div className="superia-glass-card rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden group border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-[80px]" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-lg shadow-indigo-500/5 group-hover:scale-110 transition-all duration-500 ring-4 ring-indigo-500/5">
                <Cpu className="w-10 h-10 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic">Vision-AI Indexer</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Neural Map: v3.0 Ultra
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Core Engine: Biometric S4</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {indexing ? (
              <button
                onClick={() => setStopRequested(true)}
                className="group relative px-10 py-5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-rose-500/20 transition-all duration-500 shadow-xl shadow-rose-500/5"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <Pause size={14} fill="currentColor" /> Abort Operation
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={startIndexing}
                  className="group relative px-10 py-5 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                  <span className="relative z-10 flex items-center gap-3">
                    <Play size={18} fill="currentColor" /> Initialize Neural Sync
                  </span>
                </button>
                <button
                  onClick={clearFaceIndex}
                  className="p-5 bg-white/[0.03] border border-white/10 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 rounded-2xl transition-all duration-500 shadow-xl group/trash"
                  title="Wipe Neural Database"
                >
                  <Trash2 size={24} className="group-hover/trash:rotate-12 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats and Progress */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { label: 'Total Assets', value: stats.total, icon: Image, color: 'indigo' },
              { label: 'Neural Indexing', value: stats.processed, icon: Fingerprint, color: 'blue' },
              { label: 'Faces Isolated', value: stats.facesFound, icon: Users, color: 'emerald' },
              { label: 'Sync Errors', value: stats.errors, icon: AlertTriangle, color: stats.errors > 0 ? 'rose' : 'gray' }
            ].map((item, i) => {
              const Icon = item.icon;
              const colors: Record<string, string> = {
                indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/10',
                blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-blue-500/10',
                emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10',
                rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-rose-500/10',
                gray: 'text-gray-500 bg-white/[0.02] border-white/5'
              };
              
              return (
                <div key={i} className="superia-glass-card rounded-[2rem] p-8 relative overflow-hidden group/card hover:bg-white/[0.04] transition-all duration-500 border-white/10">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl border shadow-xl ${colors[item.color]}`}>
                      <Icon size={24} />
                    </div>
                    {item.label === 'Neural Indexing' && (
                      <div className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                        {Math.round((stats.processed / (stats.total || 1)) * 100)}% MAP
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-4xl font-black text-white tracking-tighter tabular-nums italic">{item.value.toLocaleString()}</div>
                    <div className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">{item.label}</div>
                  </div>
                  
                  {/* Subtle Glow */}
                  <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-[60px] opacity-10 rounded-full ${item.color === 'rose' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                </div>
              );
            })}
          </div>

          {/* Progress Section */}
          <div className={`superia-glass-card rounded-[2.5rem] p-10 relative overflow-hidden border-white/10 group shadow-2xl ${indexing ? 'ring-2 ring-indigo-500/20' : ''}`}>
            {indexing ? (
              <div className="flex flex-col gap-10">
                <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="relative">
                    <div className="w-40 h-40 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center relative overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.1)]">
                      <Scan className="w-16 h-16 text-indigo-400 animate-pulse" />
                      <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-full animate-ping opacity-20" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-indigo-500 p-3 rounded-2xl text-white shadow-2xl ring-4 ring-indigo-500/10">
                      <Zap size={20} className="animate-bounce" />
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-8">
                    <div className="flex items-end justify-between">
                      <div>
                        <h4 className="text-2xl font-black text-white tracking-tighter uppercase italic">Neural Mapping sequence</h4>
                        <div className="flex items-center gap-3 text-[11px] font-black text-indigo-400 uppercase tracking-widest mt-2">
                          <Loader2 size={14} className="animate-spin" />
                          Analyzing deep-pixel batch: #{stats.processed + 1}
                        </div>
                      </div>
                      <div className="text-5xl font-black text-white tabular-nums tracking-tighter italic opacity-80">
                        {Math.round((stats.processed / (stats.total || 1)) * 100)}%
                      </div>
                    </div>

                    <div className="relative h-5 bg-black/40 rounded-full border border-white/10 p-1.5 overflow-hidden shadow-inner ring-4 ring-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_30px_rgba(99,102,241,0.4)] relative overflow-hidden"
                        style={{ width: `${progress}%` }}
                      >
                         <div className="absolute inset-0 bg-white/20 animate-shimmer scale-x-150 transform -skew-x-12" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t border-white/5">
                   {[
                     { label: 'Sync Rate', val: '0.82s / Face', highlight: false },
                     { label: 'Confidence', val: '94.8% Ultra', highlight: false },
                     { label: 'Neural Load', val: 'Optimized', highlight: true },
                     { label: 'Remaining', val: '~ 4 min', highlight: false }
                   ].map((stat, i) => (
                     <div key={i} className="space-y-1">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</span>
                        <div className={`text-sm font-black italic tracking-tight ${stat.highlight ? 'text-indigo-400' : 'text-white/80'}`}>{stat.val}</div>
                     </div>
                   ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Activity size={64} className="text-gray-600 mb-6" />
                <h4 className="text-2xl font-black text-gray-500 uppercase tracking-tighter italic">Engine Ready for Instruction</h4>
                <p className="text-gray-600 font-bold uppercase tracking-widest text-[10px] mt-2">Standby mode active • Awaiting neural handshake</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Activity Log */}
        <div className="space-y-6">
          <div className="superia-glass-card rounded-[2rem] p-8 border-white/10 shadow-2xl h-full flex flex-col">
            <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <Terminal size={18} className="text-indigo-400" />
              </div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest italic">Sync Activity Log</h4>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
              {activity.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-500 mx-auto animate-pulse" />
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] italic">No active telemetry</p>
                </div>
              ) : (
                activity.map((log) => (
                  <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group/log">
                    <div className={`w-1 h-8 rounded-full flex-shrink-0 mt-1 ${
                      log.type === 'error' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 
                      log.type === 'success' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                      'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                    }`} />
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                         <span className="text-[9px] font-black text-white/30 font-mono tracking-tighter">{log.time}</span>
                         {log.type === 'success' && <div className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">MAP COMPLETE</div>}
                         {log.type === 'error' && <div className="text-[10px] text-rose-400 font-black uppercase tracking-widest">ERROR DETECTED</div>}
                      </div>
                      <p className={`text-xs font-bold leading-relaxed break-words truncate ${
                        log.type === 'error' ? 'text-rose-300' : 
                        log.type === 'success' ? 'text-emerald-300' : 
                        'text-gray-400 group-hover/log:text-white transition-colors'
                      }`}>
                        {log.msg}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Protocols Reminder */}
          <div className="superia-glass-card rounded-[2rem] p-8 border-amber-500/10 bg-amber-500/5 shadow-xl">
             <div className="flex gap-4">
                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">Safety Protocol</h4>
                  <p className="text-xs text-gray-400/80 leading-relaxed font-bold">
                    Multi-face isolation uses peak server bandwidth. Maintain active terminal focus.
                  </p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
