import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { 
  Play, 
  Pause, 
  Scan,
  Loader2,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

export const GalleryFaceIndexer: React.FC = () => {
  const { galleryImages, indexGalleryImageFaces } = useData();
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
    if (!indexGalleryImageFaces) {
      toast.error('Face indexing utility not available.');
      return;
    }

    setIndexing(true);
    setStopRequested(false);
    setLastError(null);
    setProgress(0);

    // Get list of images NOT yet indexed
    const remainingImages = galleryImages.filter(img => !(img as any).faces_indexed);
    
    if (remainingImages.length === 0) {
      toast.success('All gallery images are already indexed.');
      fetchStats();
      setIndexing(false);
      return;
    }

    setStats(prev => ({ ...prev, total: galleryImages.length }));

    for (let i = 0; i < remainingImages.length; i++) {
      if (stopRequested) break;

      const img = remainingImages[i];
      setCurrentImage(img.title || img.src);
      
      try {
        await indexGalleryImageFaces(img.id, img.src);
        
        // Refresh full stats after each image
        const { count: facesCount } = await supabase
          .from('gallery_faces' as any)
          .select('*', { count: 'exact', head: true });

        setStats(prev => ({ 
          ...prev, 
          processed: galleryImages.filter(g => (g as any).faces_indexed || g.id === img.id).length,
          facesFound: facesCount || 0
        }));
      } catch (err: any) {
        console.error('Failed to index image:', img.id, err);
        const errorMsg = err.message || String(err);
        setLastError(errorMsg);
        setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
      }

      setProgress(Math.round(((i + 1) / remainingImages.length) * 100));
    }

    setIndexing(false);
    setCurrentImage(null);
    if (!stopRequested) {
      toast.success('Gallery face indexing complete!');
      fetchStats(); 
    }
  };

  const clearFaceIndex = async () => {
    if (!window.confirm('Are you sure you want to clear the entire face database? This will also reset the scan status for all images.')) return;
    
    try {
      // 1. Delete all face records
      const { error: deleteError } = await supabase.from('gallery_faces' as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (deleteError) throw deleteError;

      // 2. Reset indexed flag on all gallery images
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
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Synchronizing Face Index...</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Checking database for previously indexed images.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Scan className="w-6 h-6 text-indigo-500" />
            Face Indexer
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Scan gallery for faces and build the recognition database.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {indexing ? (
            <button
              onClick={() => setStopRequested(true)}
              className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg shadow-red-500/20"
            >
              <Pause size={18} /> Stop
            </button>
          ) : (
            <>
              <button
                onClick={startIndexing}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Play size={18} /> Start Scan
              </button>
              <button
                onClick={clearFaceIndex}
                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                title="Clear Database"
              >
                <Trash2 size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error Display */}
      {lastError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-1">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-red-900 dark:text-red-200 mb-1">Indexing Warning</h4>
            <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed font-mono break-all">{lastError}</p>
          </div>
          <button onClick={() => setLastError(null)} className="p-1 text-red-400 hover:text-red-600 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Progress Section */}
      {indexing && (
        <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">Indexing Gallery...</span>
            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(79,70,229,0.4)]"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-3 font-medium flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" />
            Processing: <span className="text-indigo-900 dark:text-indigo-100 font-bold">{currentImage}</span>
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5 uppercase tracking-wider font-bold text-[10px]">Total Images</div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">{stats.total}</div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
          <div className="text-sm text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1.5 uppercase tracking-wider font-bold text-[10px]">Processed</div>
          <div className="text-2xl font-black text-blue-900 dark:text-blue-100">{stats.processed}</div>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800/50">
          <div className="text-sm text-green-600 dark:text-green-400 mb-1 flex items-center gap-1.5 uppercase tracking-wider font-bold text-[10px]">Faces Found</div>
          <div className="text-2xl font-black text-green-900 dark:text-green-100">{stats.facesFound}</div>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800/50">
          <div className="text-sm text-red-600 dark:text-red-400 mb-1 flex items-center gap-1.5 uppercase tracking-wider font-bold text-[10px]">Errors</div>
          <div className="text-2xl font-black text-red-900 dark:text-red-100">{stats.errors}</div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/50 flex items-start gap-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Scanning works best for photos where people are looking towards the camera. 
          Indexing is done client-side in your browser to save costs. 
          Keep this tab open while indexing is in progress.
        </p>
      </div>
    </div>
  );
};
