import { useCallback, useEffect, useRef, useState } from 'react';
import { loadPdfBranding, uploadPdfBrandAsset, removePdfBrandAsset, type PdfBrandAsset } from '../services/pdfBranding';

export function usePdfBranding() {
  const [assets, setAssets] = useState<{ watermark: PdfBrandAsset | null; stamp: PdfBrandAsset | null }>({ watermark: null, stamp: null });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'watermark' | 'stamp' | null>(null);
  const [error, setError] = useState('');
  const mounted = useRef(false);
  const locked = useRef(false);
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try { const next = await loadPdfBranding(); if (mounted.current) setAssets(next); }
    catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'PDF branding could not load.'); }
    finally { if (mounted.current) setLoading(false); }
  }, []);
  useEffect(() => { mounted.current = true; void reload(); return () => { mounted.current = false; }; }, [reload]);
  const update = async (slot: 'watermark' | 'stamp', file?: File) => {
    if (locked.current || loading) return;
    locked.current = true; setBusy(slot); setError('');
    try {
      const value = file ? await uploadPdfBrandAsset(slot, file) : (await removePdfBrandAsset(slot), null);
      if (mounted.current) setAssets(previous => ({ ...previous, [slot]: value }));
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'The branding image could not be updated.'); }
    finally { locked.current = false; if (mounted.current) setBusy(null); }
  };
  return { watermarkUrl: assets.watermark?.url || null, watermarkDataUrl: assets.watermark?.dataUrl || null,
    stampUrl: assets.stamp?.url || null, stampDataUrl: assets.stamp?.dataUrl || null, loading, busy, error, reload,
    upload: (slot: 'watermark' | 'stamp', file: File) => update(slot, file), remove: (slot: 'watermark' | 'stamp') => update(slot) };
}
