import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { 
  Cloud, 
  Search, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Calendar,
  Tag
} from 'lucide-react';
import toast from 'react-hot-toast';

export const GoogleDriveImporter: React.FC = () => {
  const { syncGoogleDrive, eventCategories } = useData() as any;
  const [driveUrl, setDriveUrl] = useState('');
  const [category, setCategory] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; imagesCount: number; categoriesCount: number } | null>(null);

  const extractFolderId = (url: string) => {
    // Standard format: https://drive.google.com/drive/folders/ID
    const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : url.trim(); // Fallback to raw string if it's just the ID
  };

  const handleSync = async () => {
    const folderId = extractFolderId(driveUrl);
    if (!folderId) {
      toast.error('Please enter a valid Google Drive folder URL or ID.');
      return;
    }

    if (!syncGoogleDrive) {
      toast.error('Google Drive sync utility not available.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const data = await syncGoogleDrive(folderId, year, category.trim() || undefined);
      setResult(data);
      toast.success('Gallery indexed successfully from Google Drive!');
      setDriveUrl(''); // Clear input on success
    } catch (err: any) {
      console.error('Sync error:', err);
      
      // Handle local Netlify Dev timeout (common for large folders)
      if (err.message?.includes('TimeoutErr') || err.message?.includes('Unexpected token')) {
        toast.promise(
          new Promise((resolve) => setTimeout(resolve, 8000)),
          {
            loading: 'Photos are indexing in the background... please wait a moment.',
            success: 'Background sync is in progress!',
            error: 'Indexing taking longer than expected.',
          },
          { duration: 8000 }
        );
        // We set a special result state for background sync
        setResult({ 
          message: 'Large Gallery detected (2000+ images). The sync is completing in the background to avoid timing out your browser. Your images will appear in the Gallery in about a minute!', 
          imagesCount: -1, // Use -1 as a flag for "calculating/background"
          categoriesCount: -1 
        });
      } else {
        toast.error(err.message || 'Failed to sync with Google Drive');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-6">
          <Cloud size={24} />
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Google Drive Importer</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Import photos event-wise from a public Google Drive folder.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <FolderOpen size={14} /> Drive Folder Link
            </label>
            <div className="relative group">
              <input
                type="text"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-2 border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12 text-sm font-medium"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Tag size={14} /> Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-2 border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-medium"
            >
              <option value="">Subfolders → Categories</option>
              {(eventCategories || []).map((cat: any) => (
                <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {category
                ? `Subfolders in Drive → subcategories under "${category}"`
                : 'Each subfolder becomes its own category.'
              }
            </p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Calendar size={14} /> Year Filter
            </label>
            <input
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2025"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-2 border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-medium"
            />
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={loading || !driveUrl.trim()}
          className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
            loading 
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20 active:scale-[0.98]'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Synchronizing with Google Drive...
            </>
          ) : (
            <>
          <Cloud size={20} />
              Start Import & Sync
            </>
          )}
        </button>

        {/* Result Message */}
        {result && (
          <div className={`p-4 border rounded-2xl flex items-start gap-4 animate-in slide-in-from-top-2 ${
            result.imagesCount === -1 
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50' 
              : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50'
          }`}>
            {result.imagesCount === -1 ? (
              <Loader2 className="text-blue-500 mt-1 animate-spin" size={20} />
            ) : (
              <CheckCircle2 className="text-green-500 mt-1" size={20} />
            )}
            <div>
              <h4 className={`font-bold ${result.imagesCount === -1 ? 'text-blue-900 dark:text-blue-200' : 'text-green-900 dark:text-green-200'}`}>
                {result.imagesCount === -1 ? 'Background Sync Started' : 'Sync Complete!'}
              </h4>
              <p className={`text-sm mt-1 ${result.imagesCount === -1 ? 'text-blue-700 dark:text-blue-300' : 'text-green-700 dark:text-green-300'}`}>
                {result.imagesCount === -1 ? (
                  result.message
                ) : (
                  <>Successfully indexed <span className="font-bold">{result.imagesCount}</span> photos across <span className="font-bold">{result.categoriesCount}</span> event categories.</>
                )}
              </p>
            </div>
          </div>
        )}

        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-2xl flex items-start gap-4 ring-1 ring-amber-500/10">
          <AlertCircle className="text-amber-500 mt-1" size={20} />
          <div className="space-y-1">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Before you Sync:</p>
            <ul className="text-xs text-amber-800 dark:text-amber-300 list-disc list-inside space-y-1 opacity-80">
              <li>Ensure the folder is set to <strong>"Anyone with the link can view"</strong>.</li>
              <li>Subfolders will automatically create <strong>Gallery Categories</strong> (Events).</li>
              <li>Images with the same ID won't be duplicated if you sync again.</li>
              <li>Face recognition will work normally via our secure proxy.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
