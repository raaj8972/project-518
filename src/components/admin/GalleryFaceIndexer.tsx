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
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

export const GalleryFaceIndexer: React.FC = () => {
  const { galleryImages } = useData();
  const [indexing, setIndexing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, processed: 0, facesFound: 0, errors: 0 });
  const [stopRequested, setStopRequested] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

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
    setLastError(null);
    setProgress(0);

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
            toast.success('All images indexed!');
        } else {
            setStats(prev => ({
                ...prev,
                processed: (prev.processed || 0) + data.processed,
                facesFound: (prev.facesFound || 0) + data.facesFound
            }));
            setProgress(prev => (prev >= 95 ? 5 : prev + 5)); 
        }

      } catch (err: any) {
        console.error('Batch indexing error:', err);
        setLastError(err.message);
        setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
        keepGoing = false; 
      }
      
      await new Promise(r => setTimeout(r, 500));
      if (stopRequested) keepGoing = false;
    }

    setIndexing(false);
    setCurrentImage(null);
    setProgress(100);
    fetchStats();
  };

  const clearFaceIndex = async () => {
    if (!window.confirm('Are you sure you want to clear the entire face database? This will also reset the scan status for all images.')) return;
    
    try {
      const { error: deleteError } = await supabase.from('gallery_faces' as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase.from('gallery_images').update({ faces_indexed: false } as any).neq('id', -1);
      if (updateError) throw updateError;

      toast.success('Face index cleared.');
      fetchStats();
      setProgress(0);
    } catch (err) {
      console.error('Failed to clear index:', err);
      toast.error('Failed to clear face index.');
    }
  };

  if (loading) {
    return (
      <div className="superia-glass-card rounded-[3rem] p-24 relative overflow-hidden flex flex-col items-center justify-center text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent animate-pulse" />
        <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mb-6 relative z-10" />
        <h3 className="text-2xl font-black text-white tracking-tighter relative z-10">Initializing Vision Interface...</h3>
        <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-[10px] mt-4 relative z-10">Synchronizing neural data maps</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Section */}
      <div className="superia-glass-card rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-[80px]" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-lg shadow-indigo-500/5 group-hover:scale-110 transition-transform duration-500">
                <Cpu className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-white tracking-tighter">Vision-AI Indexer</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Neural Map: v3.0 Alpha</span>
                  <div className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Server-side Processing</span>
                </div>
              </div>
            </div>
            <p className="text-gray-400 text-sm max-w-xl pl-16">
              High-accuracy face recognition engine. Scans event gallery assets to build an identity mapping system for smart search and indexing.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {indexing ? (
              <button
                onClick={() => setStopRequested(true)}
                className="group relative px-8 py-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-500/20 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-rose-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <span className="relative z-10 flex items-center gap-2 italic">
                  <Pause size={16} /> Intercept Link
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={startIndexing}
                  className="group relative px-8 py-4 bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-indigo-500/40 hover:scale-105 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                  <span className="relative z-10 flex items-center gap-2">
                    <Play size={16} /> Initialize Sync
                  </span>
                </button>
                <button
                  onClick={clearFaceIndex}
                  className="p-4 bg-white/[0.02] border border-white/5 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 rounded-2xl transition-all duration-300 shadow-xl"
                  title="Wipe Neural Database"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Assets', value: stats.total, icon: Image, color: 'indigo' },
          { label: 'Neural Indexing', value: stats.processed, icon: Fingerprint, color: 'blue' },
          { label: 'Faces Isolated', value: stats.facesFound, icon: Users, color: 'emerald' },
          { label: 'Sync Errors', value: stats.errors, icon: AlertTriangle, color: stats.errors > 0 ? 'rose' : 'gray' }
        ].map((item, i) => {
          const Icon = item.icon;
          const colors: Record<string, string> = {
            indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/5',
            blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5',
            emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5',
            rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-rose-500/5',
            gray: 'text-gray-500 bg-white/[0.02] border-white/5 shadow-none'
          };
          
          return (
            <div key={i} className="superia-glass-card rounded-3xl p-6 relative overflow-hidden group/card hover:translate-y-[-5px] transition-all duration-500">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl border shadow-lg ${colors[item.color]}`}>
                  <Icon size={20} />
                </div>
                {item.label === 'Neural Indexing' && (
                  <div className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/5 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                    {Math.round((stats.processed / (stats.total || 1)) * 100)}%
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-black text-white tracking-tighter tabular-nums">{item.value.toLocaleString()}</div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{item.label}</div>
              </div>
              
              {/* Card Accent */}
              <div className={`absolute bottom-0 left-0 h-[2px] w-0 group-hover/card:w-full transition-all duration-700 ${item.color === 'rose' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
            </div>
          );
        })}
      </div>

      {/* Progress & Visual Feedback Section */}
      {indexing && (
        <div className="superia-glass-card rounded-[2.5rem] p-10 relative overflow-hidden border-indigo-500/20">
          <div className="absolute top-0 left-0 w-full h-1 bg-white/[0.02]" />
          
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center relative overflow-hidden">
                <Scan className="w-12 h-12 text-indigo-400 animate-pulse" />
                <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full animate-ping opacity-20" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-indigo-500 p-2 rounded-xl text-white shadow-2xl">
                <Zap size={16} className="animate-bounce" />
              </div>
            </div>

            <div className="flex-1 w-full space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-black text-white tracking-tighter">Identity Mapping in Progress...</h4>
                  <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">
                    <Loader2 size={12} className="animate-spin" />
                    Analyzing image batch: #{stats.processed + 1}
                  </div>
                </div>
                <div className="text-3xl font-black text-white tabular-nums tracking-tighter">
                  {Math.round((stats.processed / (stats.total || 1)) * 100)}%
                </div>
              </div>

              <div className="relative h-4 bg-white/[0.02] rounded-full border border-white/5 p-1 overflow-hidden shadow-inner">
                 <div 
                   className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-500 ease-out shadow-[0_0_20px_rgba(99,102,241,0.5)] relative overflow-hidden"
                   style={{ width: `${(stats.processed / (stats.total || 1)) * 100}%` }}
                 >
                    <div className="absolute inset-0 bg-white/20 animate-shimmer scale-x-150 transform -skew-x-12" />
                 </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Processing Speed</span>
                    <span className="text-xs font-bold text-gray-300">0.8s / Identity</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Confidence Score</span>
                    <span className="text-xs font-bold text-gray-300">92.4% Optimal</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Neural Load</span>
                    <span className="text-xs font-bold text-gray-300 text-indigo-400">Stable</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Time Remaining</span>
                    <span className="text-xs font-bold text-gray-300">Calculating...</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logic Alert */}
      <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
        <div className="space-y-1">
          <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest">System Protocol Reminder</h4>
          <p className="text-sm text-gray-400 leading-relaxed">
            Neural indexing requires continuous server connectivity. Please remain on this station during high-volume sync operations. 
            Identities are stored securely in the <span className="text-white font-bold italic">Neural Map</span> for subsequent AI cross-referencing.
          </p>
        </div>
      </div>
    </div>
  );
};
