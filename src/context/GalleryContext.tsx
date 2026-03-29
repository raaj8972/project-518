import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
  
  addGalleryImage: (image: Partial<GalleryImage>) => Promise<void>;
  updateGalleryImage: (id: number, image: Partial<GalleryImage>) => Promise<void>;
  deleteGalleryImage: (id: number) => Promise<void>;
  bulkDeleteGalleryImages: (ids: number[]) => Promise<void>;
  
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
  const context = useContext(PrimaryGalleryContext);
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

  const fetchGalleryData = useCallback(async () => {
    setLoading(true);
    console.log('[GalleryContext] fetchGalleryData started');
    const start = Date.now();
    try {
      // 1. Fetch settings (single request)
      const { data: settingsData } = await dualRead({
        table: 'gallery_settings',
        eq: ['id', 1],
        maybeSingle: true
      });
      console.log('✔ gallery_settings');
      setGallerySettings(settingsData || DEFAULT_GALLERY_SETTINGS);

      // 2. Fetch total count first (using dualRead with head: true logic if supported, or just select all and count)
      // For now, let's use a simple direct count but with a timeout
      const countPromise = supabase
        .from('gallery_images')
        .select('*', { count: 'exact', head: true });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 25000)
      );

      console.log('[GalleryContext] Fetching image count...');
      const { count, error: countError } = await Promise.race([countPromise, timeoutPromise]) as any;

      if (countError) {
        console.error('[GalleryContext] Failed to get image count:', countError.message);
      }

      const total = count || 0;
      const batchSize = 1000;
      const numBatches = Math.ceil(total / batchSize);
      
      console.log(`[GalleryContext] Total images to fetch: ${total} (${numBatches} batches)`);

      const batchPromises = [];
      for (let i = 0; i < numBatches; i++) {
        const from = i * batchSize;
        const to = Math.min((i + 1) * batchSize - 1, total - 1);
        batchPromises.push(
          dualRead({
            table: 'gallery_images',
            order: ['created_at', { ascending: false }],
            range: [from, to]
          })
        );
      }

      const results = await Promise.all(batchPromises);
      console.log(`✔ ${numBatches} batches fetched`);
      
      let allImages: GalleryImage[] = [];
      
      results.forEach((res) => {
        if (res.data) {
          allImages = [...allImages, ...res.data];
        }
      });

      // Sort again just in case parallel results are out of order (though range handles it)
      allImages.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      console.log(`[GalleryContext] Successfully fetched ${allImages.length} images in ${Date.now() - start}ms`);
      setGalleryImages(allImages);

    } catch (err) {
      console.error('[GalleryContext] Failed to fetch gallery data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0 || user?.id) {
      fetchGalleryData();
    }
  }, [refreshTrigger, user?.id, fetchGalleryData]);

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
    addGalleryImage,
    updateGalleryImage,
    deleteGalleryImage,
    bulkDeleteGalleryImages,
    syncGoogleDrive,
    fetchDriveFolders,
    syncGoogleDriveBatch,
    updateGallerySettings
  };

  return <PrimaryGalleryContext.Provider value={value}>{children}</PrimaryGalleryContext.Provider>;
};
