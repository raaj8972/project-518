import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
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

export const useGalleryData = () => {
  const context = useContext(GalleryContext);
  if (context === undefined) {
    throw new Error('useGalleryData must be used within a GalleryProvider');
  }
  return context;
};

export const GalleryProvider = ({ children }: { children: ReactNode }) => {
  const { refreshTrigger } = useCoreData();
  const { user } = useAuth();
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [gallerySettings, setGallerySettings] = useState<GallerySettings | null>(DEFAULT_GALLERY_SETTINGS);
  const [loading, setLoading] = useState(false);

  const fetchGalleryData = useCallback(async () => {
    setLoading(true);
    try {
      const [imagesRes, settingsRes] = await Promise.all([
        supabase
          .from('gallery_images')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('gallery_settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle()
      ]);

      if (imagesRes.error) {
        console.error('[GalleryContext] Supabase gallery_images error:', imagesRes.error.message);
      } else {
        setGalleryImages(imagesRes.data || []);
      }

      if (settingsRes.error) {
        console.error('[GalleryContext] Supabase gallery_settings error:', settingsRes.error.message);
      } else {
        setGallerySettings(settingsRes.data || DEFAULT_GALLERY_SETTINGS);
      }

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
    const { error } = await supabase
      .from('gallery_images')
      .insert(image);
    if (error) throw new Error(`[GalleryContext] insert failed: ${error.message}`);
    await fetchGalleryData();
  };

  const updateGalleryImage = async (id: number, image: Partial<GalleryImage>) => {
    const { error } = await supabase
      .from('gallery_images')
      .update(image)
      .eq('id', id);
    if (error) throw new Error(`[GalleryContext] update failed: ${error.message}`);
    await fetchGalleryData();
  };

  const deleteGalleryImage = async (id: number) => {
    const { error } = await supabase
      .from('gallery_images')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`[GalleryContext] delete failed: ${error.message}`);
    await fetchGalleryData();
  };

  const bulkDeleteGalleryImages = async (ids: number[]) => {
    const { error } = await supabase
      .from('gallery_images')
      .delete()
      .in('id', ids);
    if (error) throw new Error(`[GalleryContext] bulk delete failed: ${error.message}`);
    await fetchGalleryData();
  };

  const fetchDriveFolders = async (folderId: string) => {
    const response = await fetch('/.netlify/functions/sync-drive-folders', {
      method: 'POST',
      body: JSON.stringify({ folderId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch folder structure');
    }
    return response.json();
  };

  const syncGoogleDriveBatch = async (folderId: string, subfolderId: string, year?: string, category?: string) => {
    const response = await fetch('/.netlify/functions/sync-google-drive', {
      method: 'POST',
      body: JSON.stringify({ folderId, subfolderId, year, category }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync folder');
    }
    const data = await response.json();
    await fetchGalleryData();
    return data;
  };

  const syncGoogleDrive = async (folderId: string, year?: string, category?: string) => {
    console.log('[GalleryContext] Syncing Google Drive folder:', folderId);
    const response = await fetch('/.netlify/functions/sync-google-drive', {
      method: 'POST',
      body: JSON.stringify({ folderId, year, category }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync Google Drive');
    }
    const data = await response.json();
    await fetchGalleryData();
    return data;
  };

  const updateGallerySettings = async (settings: Partial<GallerySettings>) => {
    const { error } = await supabase
      .from('gallery_settings')
      .upsert({ id: 1, ...settings });
    if (error) throw new Error(`[GalleryContext] settings upsert failed: ${error.message}`);
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

  return <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>;
};
