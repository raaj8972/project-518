import { SITE_FEATURES, isSportsContent } from '../constants/siteFeatures';
import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { dualRead, dualInsert, dualUpdate, dualDelete, dualUpsert, invalidateTableCache } from '../lib/dualDb';
import type { GalleryImage, GallerySettings } from '../types/data';
import { useCoreData } from './CoreDataContext';
import { useAuth } from './AuthContext';
import { DEFAULT_GALLERY_SETTINGS } from '../utils/dataUtils';
interface GalleryContextType {
  galleryImages: GalleryImage[]; gallerySettings: GallerySettings | null; loading: boolean; isLoaded: boolean; galleryError: string | null;
  addGalleryImage: (image: Partial<GalleryImage>) => Promise<void>;
  updateGalleryImage: (id: number, image: Partial<GalleryImage>) => Promise<void>;
  deleteGalleryImage: (id: number) => Promise<void>;
  bulkDeleteGalleryImages: (ids: number[]) => Promise<void>;
  deleteAllGalleryImages: () => Promise<void>;
  toggleGalleryImageFeatured: (id: number) => Promise<void>;
  syncGoogleDrive: (folderId: string, year?: string, category?: string, cursor?: string) => Promise<any>;
  fetchDriveFolders: (folderId: string) => Promise<any>;
  syncGoogleDriveBatch: (folderId: string, subfolderId: string, year?: string, category?: string, cursor?: string) => Promise<any>;
  updateGallerySettings: (settings: Partial<GallerySettings>) => Promise<void>;
  loadGalleryImages: (force?: boolean) => Promise<void>;
  prefetchGalleryImages: () => Promise<void>;
}
const GalleryContext = createContext<GalleryContextType | undefined>(undefined);
const PrimaryGalleryContext = (typeof window !== 'undefined' ? ((window as any).__GALLERY_CONTEXT__ || ((window as any).__GALLERY_CONTEXT__ = GalleryContext)) : GalleryContext) as React.Context<GalleryContextType | undefined>;
export const useGalleryData = () => { const context = useContext(PrimaryGalleryContext); if (!context) throw new Error('useGalleryData must be used within a GalleryProvider'); return context; };
export function GalleryProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const { refreshTrigger } = useCoreData();
  const { getValidToken } = useAuth();
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [gallerySettings, setGallerySettings] = useState<GallerySettings | null>(DEFAULT_GALLERY_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const imagesFetched = useRef(false);
  const activeFetch = useRef<Promise<void> | null>(null);
  const fetchGalleryData = useCallback(async (includeImages = false, force = false) => {
    if (!enabled) return;
    if (activeFetch.current) { await activeFetch.current; if (!force && (!includeImages || imagesFetched.current)) return; }
    if (includeImages && imagesFetched.current && !force) return;
    const request = (async () => {
      setLoading(true); setGalleryError(null);
      try {
        const settings = await dualRead({ table: 'gallery_settings', eq: ['id', 1], maybeSingle: true, forceRefresh: force });
        setGallerySettings(settings.data || DEFAULT_GALLERY_SETTINGS);
        if (!includeImages && !imagesFetched.current) return;
        const count = await dualRead({ table: 'gallery_images', select: 'id', limit: 1, count: 'exact', forceRefresh: force });
        if (count.count == null) throw new Error('The photo count could not be loaded.');
        const rows: GalleryImage[] = [];
        // A unique order is essential: Drive imports often share the exact same timestamp.
        for (let from = 0; from < count.count; from += 1000) {
          const batch = await dualRead({ table: 'gallery_images', order: ['id', { ascending: false }], range: [from, from + 999], forceRefresh: force });
          rows.push(...(batch.data || []));
        }
        const unique = [...new Map(rows.map(row => [row.id, row])).values()];
        if (unique.length < count.count) throw new Error('Some photos could not load. Refresh the library to retry.');
        setGalleryImages(unique); imagesFetched.current = true;
      } catch (error) { setGalleryError(error instanceof Error ? error.message : 'The photo library could not load. Please retry.'); }
      finally { setLoading(false); setIsLoaded(true); }
    })();
    activeFetch.current = request;
    try { await request; } finally { if (activeFetch.current === request) activeFetch.current = null; }
  }, [enabled]);
  useEffect(() => { if (enabled) void fetchGalleryData(imagesFetched.current, refreshTrigger > 0); }, [refreshTrigger, fetchGalleryData, enabled]);
  // Patch gallery changes without downloading the entire library for each update.
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase.channel('gallery-context-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_images' }, payload => {
        invalidateTableCache('gallery_images');
        if (!imagesFetched.current) return;
        if (payload.eventType === 'DELETE') setGalleryImages(previous => previous.filter(image => image.id !== payload.old.id));
        else {
          const row = payload.new as GalleryImage;
          if (row.id && row.src) setGalleryImages(previous => [row, ...previous.filter(image => image.id !== row.id)]);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_settings' }, payload => {
        invalidateTableCache('gallery_settings');
        if (payload.eventType !== 'DELETE') setGallerySettings(payload.new as GallerySettings);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [enabled]);
  const loadGalleryImages = useCallback(async (force = false) => { await fetchGalleryData(true, force); }, [fetchGalleryData]);
  const addGalleryImage = async (image: Partial<GalleryImage>) => { const row = await dualInsert('gallery_images', image); if (!row?.id) throw new Error('The photo could not be saved.'); setGalleryImages(previous => [row, ...previous.filter(item => item.id !== row.id)]); };
  const updateGalleryImage = async (id: number, image: Partial<GalleryImage>) => { const [row] = await dualUpdate('gallery_images', id, image); setGalleryImages(previous => previous.map(item => item.id === id ? row : item)); };
  const deleteGalleryImage = async (id: number) => { await dualDelete('gallery_images', id); setGalleryImages(previous => previous.filter(item => item.id !== id)); };
  const bulkDeleteGalleryImages = async (ids: number[]) => {
    for (let from = 0; from < ids.length; from += 100) {
      const batch = ids.slice(from, from + 100);
      const { data, error } = await supabase.from('gallery_images').delete().in('id', batch).select('id');
      if (error) throw new Error(error.message);
      const removed = new Set((data || []).map(row => row.id));
      invalidateTableCache('gallery_images'); setGalleryImages(previous => previous.filter(row => !removed.has(row.id)));
      if (removed.size !== batch.length) throw new Error('Some photos could not be removed. Refresh and check your permissions before retrying.');
    }
  };
  const deleteAllGalleryImages = async () => {
    const { count, error } = await supabase.from('gallery_images').delete({ count: 'exact' }).neq('id', 0);
    if (error || (!count && galleryImages.length)) throw new Error(error?.message || 'No photos were removed. Check your permissions.');
    invalidateTableCache('gallery_images'); setGalleryImages([]);
  };
  const toggleGalleryImageFeatured = async (id: number) => { const row = galleryImages.find(image => image.id === id); if (row) await updateGalleryImage(id, { featured: !row.featured }); };
  const request = async (endpoint: string, body: object) => {
    const token = await getValidToken(); if (!token) throw new Error('Please sign in again to manage the gallery.');
    const response = await fetch(`/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The gallery service is unavailable. Please retry.');
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'The gallery request could not finish.'); return result;
  };
  const fetchDriveFolders = (folderId: string) => request('sync-drive-folders', { folderId });
  const syncGoogleDrive = async (folderId: string, year?: string, category?: string, cursor?: string) => { const result = await request('sync-google-drive', { folderId, year, category, cursor }); invalidateTableCache('gallery_images'); return result; };
  const syncGoogleDriveBatch = async (folderId: string, subfolderId: string, year?: string, category?: string, cursor?: string) => { const result = await request('sync-google-drive', { folderId, subfolderId, year, category, cursor }); invalidateTableCache('gallery_images'); return result; };
  const updateGallerySettings = async (settings: Partial<GallerySettings>) => { const saved = await dualUpsert('gallery_settings', { id: 1, ...settings }); if (!saved) throw new Error('Gallery settings could not be saved.'); setGallerySettings(saved); };
  const prefetchGalleryImages = () => loadGalleryImages();
  return <PrimaryGalleryContext.Provider value={{ galleryImages: SITE_FEATURES.sports ? galleryImages : galleryImages.filter(image => !isSportsContent(image.category)), gallerySettings, loading, isLoaded, galleryError, addGalleryImage, updateGalleryImage, deleteGalleryImage, bulkDeleteGalleryImages, deleteAllGalleryImages, toggleGalleryImageFeatured, fetchDriveFolders, syncGoogleDrive, syncGoogleDriveBatch, updateGallerySettings, loadGalleryImages, prefetchGalleryImages }}>{children}</PrimaryGalleryContext.Provider>;
}
