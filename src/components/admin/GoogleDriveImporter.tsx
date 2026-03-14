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
  const { syncGoogleDrive, fetchDriveFolders, syncGoogleDriveBatch, eventCategories } = useData() as any;
  const [driveUrl, setDriveUrl] = useState('');
  const [category, setCategory] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [checkingFolders, setCheckingFolders] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [syncingFolderId, setSyncingFolderId] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; imagesCount: number; categoriesCount: number } | null>(null);

  const extractFolderId = (url: string) => {
    const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : url.trim();
  };

  const handleCheckFolders = async () => {
    const folderId = extractFolderId(driveUrl);
    if (!folderId) {
      toast.error('Please enter a valid Google Drive folder URL or ID.');
      return;
    }

    setCheckingFolders(true);
    setFolders([]);
    setResult(null);
    try {
      const data = await fetchDriveFolders(folderId);
      setFolders(data.folders || []);
      if (data.totalFolders === 0) {
        toast.error('No subfolders found in this directory.');
      } else {
        toast.success(`Found ${data.totalFolders} subfolders!`);
      }
    } catch (err: any) {
      console.error('Check folders error:', err);
      toast.error(err.message || 'Failed to fetch folder structure');
    } finally {
      setCheckingFolders(false);
    }
  };

  const handleSyncSubfolder = async (subfolder: any) => {
    const folderId = extractFolderId(driveUrl);
    setSyncingFolderId(subfolder.id);
    try {
      await syncGoogleDriveBatch(folderId, subfolder.id, year, category.trim() || undefined);
      toast.success(`Synced "${subfolder.name}" successfully!`);
      // Update local count if possible or just refresh
    } catch (err: any) {
      toast.error(`Failed to sync ${subfolder.name}: ${err.message}`);
    } finally {
      setSyncingFolderId(null);
    }
  };

  const handleSyncAll = async () => {
    const folderId = extractFolderId(driveUrl);
    if (!folderId) {
      toast.error('Please enter a valid Google Drive folder URL or ID.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const data = await syncGoogleDrive(folderId, year, category.trim() || undefined);
      setResult(data);
      if (data.imagesCount > 0) {
        toast.success(`Successfully synced ${data.imagesCount} images!`);
      } else {
        toast.error(data.message || 'No new images found in this folder.');
      }
      // Clear URL on success if it was a one-off
      // setDriveUrl(''); 
    } catch (err: any) {
      console.error('Sync error:', err);
      if (err.message?.includes('TimeoutErr') || err.message?.includes('Unexpected token')) {
        toast.promise(
          new Promise((resolve) => setTimeout(resolve, 8000)),
          {
            loading: 'Photos are indexing in the background... please wait.',
            success: 'Background sync is in progress!',
            error: 'Indexing taking longer than expected.',
          }
        );
        setResult({ 
          message: 'Large Gallery detected. The sync is completing in the background. Your images will appear in the Gallery in about a minute!', 
          imagesCount: -1, 
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
        <Cloud size={24} className="text-blue-500" />
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Google Drive Importer</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Import photos event-wise from a public Google Drive folder.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <FolderOpen size={14} /> Root Drive Folder Link
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
              <Tag size={14} /> Default Category (Optional)
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
                : 'Each folder/subfolder becomes its own category.'
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

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCheckFolders}
            disabled={checkingFolders || !driveUrl.trim() || loading}
            className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border-2 ${
              checkingFolders 
                ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border-blue-100 text-blue-600 hover:bg-blue-50 hover:border-blue-200 active:scale-[0.98]'
            }`}
          >
            {checkingFolders ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            {checkingFolders ? 'Checking Folders...' : 'Check Folders'}
          </button>
          
          <button
            onClick={handleSyncAll}
            disabled={loading || !driveUrl.trim() || checkingFolders}
            className={`flex-[1.5] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
              loading 
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20 active:scale-[0.98]'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Cloud size={20} />}
            {loading ? 'Synchronizing All...' : 'Sync All Folders'}
          </button>
        </div>

        {/* Root level Result Message */}
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
                  <>Successfully indexed <span className="font-bold">{result.imagesCount}</span> photos.</>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Folders List Table */}
        {folders.length > 0 && (
          <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FolderOpen className="text-amber-500" size={18} /> Subfolders in Drive
              </h4>
              <span className="text-xs font-medium text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-800">
                {folders.length} found
              </span>
            </div>
            
            <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden bg-gray-50/30 dark:bg-gray-900/20 backdrop-blur-sm">
              <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-10">
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Folder Name</th>
                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Images</th>
                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {folders.map((folder) => (
                      <tr key={folder.id} className="group hover:bg-white dark:hover:bg-gray-800/50 transition-all">
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 leading-tight mb-0.5">{folder.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity uppercase">ID: {folder.id.substring(0, 8)}...</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-black ring-1 ring-blue-500/10">
                            {folder.imageCount}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleSyncSubfolder(folder)}
                            disabled={syncingFolderId !== null || folder.imageCount === 0}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                              syncingFolderId === folder.id
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-400 cursor-not-allowed'
                                : folder.imageCount === 0
                                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/10 active:scale-95'
                            }`}
                          >
                            {syncingFolderId === folder.id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              'Sync Folder'
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-2xl flex items-start gap-4 ring-1 ring-amber-500/10">
          <AlertCircle className="text-amber-500 mt-1" size={20} />
          <div className="space-y-1">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Before you Sync:</p>
            <ul className="text-xs text-amber-800 dark:text-amber-300 list-disc list-inside space-y-1 opacity-80">
              <li>Ensure the folder is set to <strong>"Anyone with the link can view"</strong>.</li>
              <li>Subfolders will automatically create <strong>Gallery Categories</strong>.</li>
              <li>Newly discovered folders will be <strong>Automatically Registered</strong> as categories.</li>
              <li>Images with the same ID won't be duplicated if you sync again.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
