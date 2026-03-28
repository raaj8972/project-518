import { createContext, use, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { dualRead, dualInsert, dualUpdate, dualDelete, dualUpsert } from '../lib/dualDb';
import { 
  GalleryImage, GallerySettings
} from '../types/data';
import { useCoreData } from './CoreDataContext';
import { useAuth } from './AuthContext';
import { DEFAULT_GALLERY_SETTINGS } from '../utils/dataUtils';

interface GalleryContextType {
  galleryImages: GalleryImage[];
  gallerySettings: GallerySettings | null;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  
  addGalleryImage: (image: Partial<GalleryImage>) => Promise<void>;
  updateGalleryImage: (id: number, image: Partial<GalleryImage>) => Promise<void>;
  deleteGalleryImage: (id: number) => Promise<void>;
  bulkDeleteGalleryImages: (ids: number[]) => Promise<void>;
  
  fetchGalleryData: (page?: number, append?: boolean, category?: string, subcategory?: string) => Promise<void>;
  fetchMore: (category?: string, subcategory?: string) => Promise<void>;
  syncGoogleDrive: (folderId: string, year?: string, category?: string) => Promise<any>;
  fetchDriveFolders: (folderId: string) => Promise<any>;
  syncGoogleDriveBatch: (folderId: string, subfolderId: string, year?: string, category?: string) => Promise<any>;
  updateGallerySettings: (settings: Partial<GallerySettings>) => Promise<void>;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

// [DEDUPE] Ensure singleton Context across module duplication
const PrimaryGalleryContext = ((typeof window !== 'undefined') 
  ? ((window as any).__GALLERY_CONTEXT__ || ((window as any).__GALLERY_CONTEXT__ = GalleryContext))
  : GalleryContext) as React.Context<GalleryContextType | undefined>;

export const useGalleryData = () => {
  const context = use(PrimaryGalleryContext);
  if (context === undefined) {
    throw new Error('useGalleryData must be used within a GalleryProvider');
  }
  return context;
};

export const GalleryProvider = ({ children }: { children: ReactNode }) => {
  const { refreshTrigger } = useCoreData();
  const { user, getValidToken } = useAuth();
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [gallerySettings, setGallerySettings] = useState<GallerySettings | null>(DEFAULT_GALLERY_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchGalleryData = useCallback(async (page = 0, append = false, category?: string, subcategory?: string) => {
    if (page === 0 && !append) setLoading(true);
    if (append) setLoadingMore(true);

    const PAGE_SIZE = 50;
    try {
      // 1. Fetch settings (only on first load)
      if (page === 0 && !append) {
        const { data: settingsData } = await dualRead({
          table: 'gallery_settings',
          eq: ['id', 1],
          maybeSingle: true
        });
        setGallerySettings(settingsData || DEFAULT_GALLERY_SETTINGS);
      }

      // 2. Fetch data with filters
      const from = page * PAGE_SIZE;
      const to = (page + 1) * PAGE_SIZE - 1;

      let query = supabase
        .from('gallery_images')
        .select('*', { count: 'exact' });

      if (category && category !== 'All') {
        query = query.ilike('category', category);
      }
      if (subcategory) {
        query = query.eq('subcategory', subcategory);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (page === 0 && !append) {
        setTotalCount(count || 0);
      }

      const newImages = data || [];
      setGalleryImages(prev => append ? [...prev, ...newImages] : newImages);
      setHasMore(newImages.length === PAGE_SIZE);

    } catch (err) {
      console.error('[GalleryContext] Failed to fetch gallery data', err);
    } finally {
      if (page === 0 && !append) setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const fetchMore = useCallback(async (category?: string, subcategory?: string) => {
    if (loading || loadingMore || !hasMore) return;
    const nextPage = Math.floor(galleryImages.length / 50);
    await fetchGalleryData(nextPage, true, category, subcategory);
  }, [galleryImages.length, hasMore, loading, loadingMore, fetchGalleryData]);

  useEffect(() => {
    if (refreshTrigger > 0 || user?.id) {
      fetchGalleryData(0, false);
    }
  }, [refreshTrigger, user?.id]);

  const addGalleryImage = async (image: Partial<GalleryImage>) => {
    await dualInsert('gallery_images', image);
    await fetchGalleryData();
  };

  const updateGalleryImage = async (id: number, image: Partial<GalleryImage>) => {
    await dualUpdate('gallery_images', id, image);
    await fetchGalleryData();
  };

  const deleteGalleryImage = async (id: number) => {
    await dualDelete('gallery_images', id);
    await fetchGalleryData();
  };

  const bulkDeleteGalleryImages = async (ids: number[]) => {
    // Bulk delete directly via Supabase (dualDelete is one-by-one)
    const { error } = await supabase.from('gallery_images').delete().in('id', ids);
    if (error) throw new Error(`[GalleryContext] bulk delete failed: ${error.message}`);
    await fetchGalleryData();
  };

  const fetchDriveFolders = async (folderId: string) => {
    const token = await getValidToken();
    const response = await fetch('/.netlify/functions/sync-drive-folders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ folderId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details ? `${error.error} - ${error.details}` : (error.error || 'Failed to fetch folder structure'));
    }
    return response.json();
  };

  const syncGoogleDriveBatch = async (folderId: string, subfolderId: string, year?: string, category?: string) => {
    const token = await getValidToken();
    const response = await fetch('/.netlify/functions/sync-google-drive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ folderId, subfolderId, year, category }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details ? `${error.error} - ${error.details}` : (error.error || 'Failed to sync folder'));
    }
    const data = await response.json();
    await fetchGalleryData();
    return data;
  };

  const syncGoogleDrive = async (folderId: string, year?: string, category?: string) => {
    console.log('[GalleryContext] Syncing Google Drive folder:', folderId);
    const token = await getValidToken();
    const response = await fetch('/.netlify/functions/sync-google-drive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ folderId, year, category }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details ? `${error.error} - ${error.details}` : (error.error || 'Failed to sync Google Drive'));
    }
    const data = await response.json();
    await fetchGalleryData();
    return data;
  };

  const updateGallerySettings = async (settings: Partial<GallerySettings>) => {
    await dualUpsert('gallery_settings', { id: 1, ...settings });
    await fetchGalleryData();
  };

  const value: GalleryContextType = {
    galleryImages,
    gallerySettings,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    addGalleryImage,
    updateGalleryImage,
    deleteGalleryImage,
    bulkDeleteGalleryImages,
    fetchMore,
    fetchGalleryData,
    syncGoogleDrive,
    fetchDriveFolders,
    syncGoogleDriveBatch,
    updateGallerySettings
  };

  return <PrimaryGalleryContext value={value}>{children}</PrimaryGalleryContext>;
};
