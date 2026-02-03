import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Save, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import { useSavingProgress } from '../../context/SavingProgressContext';

type PageKey = 'home' | 'events' | 'schedule' | 'gallery' | 'homebound' | 'ricofamily' | 'sponsors';

const PAGE_LABELS: Record<PageKey, string> = {
  home: 'Home',
  events: 'Events',
  schedule: 'Schedule',
  gallery: 'Gallery',
  homebound: 'Home Bound',
  ricofamily: 'Rico Family',
  sponsors: 'Sponsors',
};

export const HeroMediaManagement: React.FC = () => {
  const { heroMedia, fetchHeroMedia, updateHeroMedia } = useData();
  const savingProgress = useSavingProgress();
  const [selectedPage, setSelectedPage] = useState<PageKey>('home');
  const current = heroMedia?.[selectedPage] || null;

  const [form, setForm] = useState({
    background_type: 'image' as 'image' | 'video' | 'auto',
    image_url: '',
    mobile_image_url: '',
    video_url: '',
    mobile_video_url: '',
    poster_url: '',
    mobile_poster_url: '',
    overlay_color: '#000000',
    overlay_opacity: 0.35,
    enabled: true,
    desktop_zoom: 1,
    desktop_offset_x: 0,
    desktop_offset_y: 0,
    mobile_zoom: 1,
    mobile_offset_x: 0,
    mobile_offset_y: 0,
  });
  const [baselineFrame, setBaselineFrame] = useState<null | { desktop_zoom:number; desktop_offset_x:number; desktop_offset_y:number; mobile_zoom:number; mobile_offset_x:number; mobile_offset_y:number }>(null);
  // Local preview mode (desktop vs mobile) to allow seeing chosen mobile portrait assets
  const [previewMobile, setPreviewMobile] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewDevice, setPreviewDevice] = useState<'auto' | 'phone-portrait' | 'phone-landscape' | 'tablet' | 'desktop'>('auto');
  const [previewObjectFit, setPreviewObjectFit] = useState<'cover' | 'contain'>('cover');
  const [showSafeAreas, setShowSafeAreas] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [assetAspect, setAssetAspect] = useState<number | null>(null); // width/height
  const [deviceAspect, setDeviceAspect] = useState<number | null>(null);
  const [aspectAdvice, setAspectAdvice] = useState<string>('');
  // Detected intrinsic aspect ratios for original uploads (video only)
  const [desktopVideoAR, setDesktopVideoAR] = useState<number | null>(null);
  const [mobileVideoAR, setMobileVideoAR] = useState<number | null>(null);
  const classifyAR = (ar: number | null, target: 'desktop' | 'mobile'): { label: string; ok: boolean; diff?: number } => {
    if (!ar) return { label: '—', ok: false };
    const goal = target === 'desktop' ? (16 / 9) : (9 / 16);
    const diff = Math.abs(ar - goal);
    const pct = (diff / goal) * 100;
    if (pct < 1.2) return { label: target === 'desktop' ? '16:9 ✓' : '9:16 ✓', ok: true, diff: pct };
    return { label: `${ar >= 1 ? ar.toFixed(2)+':1' : '1:'+(1/ar).toFixed(2)} ⚠`, ok: false, diff: pct };
  };
  // Mini preview playback / readiness + aspect labels
  const [miniDesktopPlaying, setMiniDesktopPlaying] = useState(true);
  const [miniMobilePlaying, setMiniMobilePlaying] = useState(true);
  const [miniDesktopLoaded, setMiniDesktopLoaded] = useState(false);
  const [miniMobileLoaded, setMiniMobileLoaded] = useState(false);
  const [miniDesktopAspect, setMiniDesktopAspect] = useState<string>('');
  const [miniMobileAspect, setMiniMobileAspect] = useState<string>('');

  const ratioLabel = (r: number): string => {
    if (!isFinite(r) || r <= 0) return '—';
    const common = [
      { w: 16, h: 9 }, { w: 9, h: 16 }, { w: 1, h: 1 }, { w: 4, h: 3 }, { w: 3, h: 4 }, { w: 21, h: 9 }, { w: 9, h: 21 }, { w: 2, h: 1 }, { w: 1, h: 2 }
    ];
    let best = 'custom';
    let bestDiff = Infinity;
    for (const c of common) {
      const val = c.w / c.h;
      const diff = Math.abs(val - r);
      if (diff < bestDiff && diff < 0.02) { bestDiff = diff; best = `${c.w}:${c.h}`; }
    }
    if (best !== 'custom') return best;
    if (r >= 1) return `${(r).toFixed(2)}:1`;
    return `1:${(1/r).toFixed(2)}`;
  };

  const deviceMeta: Record<typeof previewDevice, { label: string; width: number; height: number; note?: string }> = {
    auto: { label: 'Auto', width: 640, height: 192, note: 'Matches current layout area' },
    'phone-portrait': { label: 'Phone P', width: 280, height: 560 },
    'phone-landscape': { label: 'Phone L', width: 560, height: 280 },
    tablet: { label: 'Tablet', width: 820, height: 540 },
    desktop: { label: 'Desktop', width: 1100, height: 400 },
  };

  const applyScaleDelta = (delta: number) => {
    setPreviewScale((s) => {
      const next = Math.min(2.5, Math.max(0.5, parseFloat((s + delta).toFixed(2))));
      return next;
    });
  };

  // Persist preview settings
  useEffect(() => {
    try {
      const raw = localStorage.getItem('heroMediaPreviewSettings');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.device) setPreviewDevice(saved.device);
        if (typeof saved.scale === 'number') setPreviewScale(saved.scale);
        if (typeof saved.mobile === 'boolean') setPreviewMobile(saved.mobile);
        if (saved.fit === 'cover' || saved.fit === 'contain') setPreviewObjectFit(saved.fit);
        if (typeof saved.safe === 'boolean') setShowSafeAreas(saved.safe);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('heroMediaPreviewSettings', JSON.stringify({
        device: previewDevice,
        scale: previewScale,
        mobile: previewMobile,
        fit: previewObjectFit,
        safe: showSafeAreas,
      }));
    } catch {}
  }, [previewDevice, previewScale, previewMobile, previewObjectFit, showSafeAreas]);

  // Compute aspect ratio guidance
  useEffect(() => {
    const meta = deviceMeta[previewDevice];
    if (previewDevice !== 'auto') {
      setDeviceAspect(meta.width / meta.height);
    } else {
      setDeviceAspect(null);
    }
  }, [previewDevice]);
  useEffect(() => {
    if (!assetAspect) { setAspectAdvice(''); return; }
    if (!deviceAspect) { setAspectAdvice(''); return; }
    const diff = assetAspect - deviceAspect;
    const pct = (Math.abs(diff) / deviceAspect) * 100;
    if (pct < 5) {
      setAspectAdvice('Great match – minimal cropping.');
    } else if (diff > 0) {
      setAspectAdvice('Asset is wider than device: sides will crop. Consider 9:16 or tighter.');
    } else {
      setAspectAdvice('Asset is taller/narrower: top & bottom crop or empty space if contain.');
    }
  }, [assetAspect, deviceAspect]);

  // Probe desktop video aspect ratio when URL changes
  useEffect(() => {
    if (!form.video_url) { setDesktopVideoAR(null); return; }
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.src = form.video_url;
    v.onloadedmetadata = () => {
      if (v.videoWidth && v.videoHeight) setDesktopVideoAR(v.videoWidth / v.videoHeight);
    };
    v.onerror = () => setDesktopVideoAR(null);
  }, [form.video_url]);
  // Reset desktop mini preview load state when desktop video changes
  useEffect(() => {
    setMiniDesktopLoaded(false);
    setMiniDesktopAspect('');
  }, [form.video_url]);
  // Probe mobile video aspect ratio
  useEffect(() => {
    if (!form.mobile_video_url) { setMobileVideoAR(null); return; }
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.src = form.mobile_video_url;
    v.onloadedmetadata = () => {
      if (v.videoWidth && v.videoHeight) setMobileVideoAR(v.videoWidth / v.videoHeight);
    };
    v.onerror = () => setMobileVideoAR(null);
  }, [form.mobile_video_url]);
  // Reset mobile mini preview load state when mobile video changes
  useEffect(() => {
    setMiniMobileLoaded(false);
    setMiniMobileAspect('');
  }, [form.mobile_video_url]);

  // Orientation rotate helper for phone/tablet presets
  const rotateDevice = () => {
    setPreviewDevice((d) => {
      if (d === 'phone-portrait') return 'phone-landscape';
      if (d === 'phone-landscape') return 'phone-portrait';
      if (d === 'tablet') return 'desktop'; // simple swap demonstration
      return d;
    });
  };

  useEffect(() => {
    // Load for selected page when switching
    fetchHeroMedia(selectedPage).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPage]);

  useEffect(() => {
    if (current) {
      setForm({
        background_type: (current.background_type || 'image') as any,
        image_url: current.image_url || '',
        mobile_image_url: (current as any).mobile_image_url || '',
        video_url: current.video_url || '',
        mobile_video_url: (current as any).mobile_video_url || '',
        poster_url: current.poster_url || '',
        mobile_poster_url: (current as any).mobile_poster_url || '',
        overlay_color: current.overlay_color || '#000000',
        overlay_opacity: typeof current.overlay_opacity === 'number' ? current.overlay_opacity : 0.35,
        enabled: current.enabled !== false,
        desktop_zoom: (current as any).desktop_zoom ?? 1,
        desktop_offset_x: (current as any).desktop_offset_x ?? 0,
        mobile_zoom: (current as any).mobile_zoom ?? 1,
        mobile_offset_x: (current as any).mobile_offset_x ?? 0,
        mobile_offset_y: (current as any).mobile_offset_y ?? 0,
        desktop_offset_y: (current as any).desktop_offset_y ?? 0,
      });
      setBaselineFrame({
        desktop_zoom: (current as any).desktop_zoom ?? 1,
        desktop_offset_x: (current as any).desktop_offset_x ?? 0,
        desktop_offset_y: (current as any).desktop_offset_y ?? 0,
        mobile_zoom: (current as any).mobile_zoom ?? 1,
        mobile_offset_x: (current as any).mobile_offset_x ?? 0,
        mobile_offset_y: (current as any).mobile_offset_y ?? 0,
      });
    }
  }, [current]);

  const handleSave = async () => {
    const steps = savingProgress.withSteps(3, 'Preparing…');
    try {
      steps.next('Uploading/validating');
      await updateHeroMedia(selectedPage, form as any);
      // Force refetch to ensure any DB-side defaults/triggers & realtime consistency
      try { await fetchHeroMedia(selectedPage); } catch {}
      steps.next('Finalizing');
      alert('Hero media saved');
      setBaselineFrame({
        desktop_zoom: form.desktop_zoom,
        desktop_offset_x: form.desktop_offset_x,
        desktop_offset_y: form.desktop_offset_y,
        mobile_zoom: form.mobile_zoom,
        mobile_offset_x: form.mobile_offset_x,
        mobile_offset_y: form.mobile_offset_y,
      });
      steps.done();
    } catch (e: any) {
      console.error(e);
      savingProgress.done();
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('permission') || msg.includes('rls')) {
        alert('Failed to save: permission denied (check RLS policies / auth).');
      } else {
        alert('Failed to save hero media (network or schema issue).');
      }
    }
  };

  const copyDesktopFramingToAll = async () => {
    if (!confirm('Copy current DESKTOP framing (zoom + X/Y) to ALL pages? This overwrites each page\'s desktop framing.')) return;
    const pages: PageKey[] = ['home','events','schedule','gallery','homebound','ricofamily','sponsors'];
    for (const pk of pages) {
      try { await updateHeroMedia(pk, { desktop_zoom: form.desktop_zoom, desktop_offset_x: form.desktop_offset_x, desktop_offset_y: form.desktop_offset_y } as any); } catch(e){ console.warn('Copy desktop failed', pk, e); }
    }
    alert('Desktop framing copied to all pages.');
  };
  const copyMobileFramingToAll = async () => {
    if (!confirm('Copy current MOBILE framing (zoom + X/Y) to ALL pages? This overwrites each page\'s mobile framing.')) return;
    const pages: PageKey[] = ['home','events','schedule','gallery','homebound','ricofamily','sponsors'];
    for (const pk of pages) {
      try { await updateHeroMedia(pk, { mobile_zoom: form.mobile_zoom, mobile_offset_x: form.mobile_offset_x, mobile_offset_y: form.mobile_offset_y } as any); } catch(e){ console.warn('Copy mobile failed', pk, e); }
    }
    alert('Mobile framing copied to all pages.');
  };
  const resetDesktopFraming = () => setForm(p => ({ ...p, desktop_zoom: 1, desktop_offset_x: 0, desktop_offset_y: 0 }));
  const resetMobileFraming = () => setForm(p => ({ ...p, mobile_zoom: 1, mobile_offset_x: 0, mobile_offset_y: 0 }));
  const unsaved = baselineFrame && (
    baselineFrame.desktop_zoom !== form.desktop_zoom ||
    baselineFrame.desktop_offset_x !== form.desktop_offset_x ||
    baselineFrame.desktop_offset_y !== form.desktop_offset_y ||
    baselineFrame.mobile_zoom !== form.mobile_zoom ||
    baselineFrame.mobile_offset_x !== form.mobile_offset_x ||
    baselineFrame.mobile_offset_y !== form.mobile_offset_y
  );

  const clearField = (key: 'image_url' | 'video_url' | 'poster_url' | 'mobile_video_url' | 'mobile_poster_url') => {
    setForm((p) => ({ ...p, [key]: '' }));
  };

  const applyMobileToAllPages = async () => {
    if (!form.mobile_video_url && !form.mobile_poster_url) {
      alert('No mobile portrait video or poster to apply.');
      return;
    }
    if (!confirm('Copy this page\'s mobile portrait video/poster to ALL pages? This overwrites other pages\' mobile values.')) return;
    const pages: PageKey[] = ['home','events','schedule','gallery','homebound','ricofamily','sponsors'];
    for (const pk of pages) {
      try {
        await updateHeroMedia(pk, {
          // Only overwrite provided fields; leave others intact
          ...(form.mobile_video_url ? { mobile_video_url: form.mobile_video_url } : {}),
          ...(form.mobile_poster_url ? { mobile_poster_url: form.mobile_poster_url } : {}),
        } as any);
      } catch (e) {
        console.warn('Failed to apply to', pk, e);
      }
    }
    alert('Applied mobile portrait media to all pages.');
  };

  // Allow saving even if media is cleared (blank image/video)
  const disabledSave = false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-1.5 h-8 bg-gradient-to-b from-yellow-400 to-amber-600 rounded-full" />
            Hero Media
          </h2>
          <p className="text-gray-400 mt-1">Control hero background image/video for each page</p>
        </div>
      </div>

      <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Target Page</label>
            <div className="relative">
              <select
                value={selectedPage}
                onChange={(e) => setSelectedPage(e.target.value as PageKey)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all font-medium"
              >
                {Object.entries(PAGE_LABELS).map(([key, label]) => (
                  <option key={key} value={key} className="bg-gray-900 text-white">{label}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Background Type</label>
            <div className="relative">
              <select
                value={form.background_type}
                onChange={(e) => setForm((p) => ({ ...p, background_type: e.target.value as any }))}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all font-medium"
              >
                <option value="image" className="bg-gray-900 text-white">Image</option>
                <option value="video" className="bg-gray-900 text-white">Video</option>
                <option value="auto" className="bg-gray-900 text-white">Auto</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div className="flex items-center pt-6">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${form.enabled ? 'bg-emerald-500' : 'bg-white/10'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${form.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <input
                id="enabled"
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
                className="hidden"
              />
              <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors uppercase tracking-wide">Hero Enabled</span>
            </label>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mt-6">
          {/* Media pickers */}
          <div className="space-y-6">
            {form.background_type !== 'video' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Image</label>
                <ImageUpload
                  onImageSelect={(url) => setForm((p) => ({ ...p, image_url: url }))}
                  currentImage={form.image_url}
                  bucket="hero-media"
                  folder={`hero/${selectedPage}`}
                  acceptedTypes="image/*"
                  fileTypeLabel="PNG, JPG, WEBP, GIF up to 5MB"
                  cropAspect={16/9}
                  optimizeOptions={{ maxWidth: 1920, maxHeight: 1080, quality: 0.82, format: 'auto' }}
                />
                {form.image_url && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => clearField('image_url')}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Clear image URL
                    </button>
                  </div>
                )}
              </div>
            )}

            {form.background_type !== 'video' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile-only Image (shown on phones)</label>
                <ImageUpload
                  onImageSelect={(url) => setForm((p) => ({ ...p, mobile_image_url: url }))}
                  currentImage={form.mobile_image_url}
                  bucket="hero-media"
                  folder={`hero/${selectedPage}/mobile`}
                  acceptedTypes="image/*"
                  fileTypeLabel="PNG, JPG, WEBP, GIF up to 5MB"
                  cropAspect={9/16}
                  optimizeOptions={{ maxWidth: 900, maxHeight: 1600, quality: 0.78, format: 'auto' }}
                />
                {form.mobile_image_url && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, mobile_image_url: '' }))}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Clear mobile image URL
                    </button>
                  </div>
                )}
              </div>
            )}

            {form.background_type !== 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Video</label>
                <ImageUpload
                  onImageSelect={(url) => setForm((p) => ({ ...p, video_url: url }))}
                  currentImage={form.video_url}
                  bucket="hero-media"
                  folder={`hero/${selectedPage}`}
                  acceptedTypes="video/*"
                  fileTypeLabel="MP4, MOV, WEBM up to 50MB"
                />
                {form.video_url && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => clearField('video_url')}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Clear video URL
                    </button>
                  </div>
                )}
              </div>
            )}

            {form.background_type !== 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Portrait Video (optional)</label>
                <p className="text-[11px] text-gray-500 mb-2">Use a 9:16 or taller aspect video for phones. If provided it overrides the desktop video on small screens.</p>
                <ImageUpload
                  onImageSelect={(url) => setForm((p) => ({ ...p, mobile_video_url: url }))}
                  currentImage={form.mobile_video_url}
                  bucket="hero-media"
                  folder={`hero/${selectedPage}/mobile`}
                  acceptedTypes="video/*"
                  fileTypeLabel="MP4, MOV, WEBM up to 50MB"
                />
                {form.mobile_video_url && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => clearField('mobile_video_url')}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Clear mobile video URL
                    </button>
                  </div>
                )}
              </div>
            )}

            {form.background_type !== 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Video Poster (optional)</label>
                <ImageUpload
                  onImageSelect={(url) => setForm((p) => ({ ...p, poster_url: url }))}
                  currentImage={form.poster_url}
                  bucket="hero-media"
                  folder={`hero/${selectedPage}`}
                  acceptedTypes="image/*"
                  fileTypeLabel="PNG, JPG, WEBP up to 5MB"
                  cropAspect={16/9}
                />
                {form.poster_url && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => clearField('poster_url')}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Clear poster URL
                    </button>
                  </div>
                )}
              </div>
            )}

            {form.background_type !== 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Poster (optional)</label>
                <ImageUpload
                  onImageSelect={(url) => setForm((p) => ({ ...p, mobile_poster_url: url }))}
                  currentImage={form.mobile_poster_url}
                  bucket="hero-media"
                  folder={`hero/${selectedPage}/mobile`}
                  acceptedTypes="image/*"
                  fileTypeLabel="PNG, JPG, WEBP up to 5MB"
                  cropAspect={9/16}
                />
                {form.mobile_poster_url && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => clearField('mobile_poster_url')}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Clear mobile poster URL
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-white/5 pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 uppercase tracking-wide">Desktop Framing <span className="ml-2 text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-md tracking-normal normal-case">Saved Per Page</span>
                  {form.background_type !== 'image' && form.video_url && (
                    (()=>{ const meta = classifyAR(desktopVideoAR,'desktop'); return (
                      <span title={meta.ok ? 'Desktop video aspect is on target (16:9)' : 'Desktop video aspect differs from 16:9'} className={`text-[10px] px-1.5 py-0.5 rounded-md border ${meta.ok ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/20 border-amber-500/30 text-amber-400'}`}>{meta.label}</span>
                    ); })()
                  )}
                </h3>
                <div className="flex gap-2">
                  <button type="button" onClick={resetDesktopFraming} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white text-gray-400 transition-colors">Reset</button>
                  <button type="button" onClick={copyDesktopFramingToAll} className="text-[10px] px-2 py-1 rounded border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-colors">Copy → All</button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs items-start">
                <label className="flex flex-col gap-1.5 font-bold text-gray-500">Zoom
                  <input type="range" min={0.25} max={3} step={0.01} value={form.desktop_zoom} onChange={(e) => setForm(p => ({ ...p, desktop_zoom: parseFloat(e.target.value) }))} className="w-full accent-blue-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"/>
                  <span className="text-gray-400 font-mono text-[10px]">{form.desktop_zoom.toFixed(2)}x</span>
                </label>
                <label className="flex flex-col gap-1.5 font-bold text-gray-500">Offset X
                  <input type="range" min={-0.5} max={0.5} step={0.01} value={form.desktop_offset_x} onChange={(e) => setForm(p => ({ ...p, desktop_offset_x: parseFloat(e.target.value) }))} className="w-full accent-blue-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"/>
                  <span className="text-gray-400 font-mono text-[10px]">{(form.desktop_offset_x*100).toFixed(0)}%</span>
                </label>
                <label className="flex flex-col gap-1.5 font-bold text-gray-500">Offset Y
                  <input type="range" min={-0.5} max={0.5} step={0.01} value={form.desktop_offset_y} onChange={(e) => setForm(p => ({ ...p, desktop_offset_y: parseFloat(e.target.value) }))} className="w-full accent-blue-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"/>
                  <span className="text-gray-400 font-mono text-[10px]">{(form.desktop_offset_y*100).toFixed(0)}%</span>
                </label>
                <div className="hidden md:block col-span-1 md:col-span-3">
                  <div className="mt-2 flex gap-4">
                    <div className="relative w-40 h-24 bg-black/60 rounded-lg overflow-hidden border border-white/10 group shadow-lg" title={`Desktop transform: translate(${(form.desktop_offset_x*100).toFixed(2)}%, ${(form.desktop_offset_y*100).toFixed(2)}%) scale(${form.desktop_zoom.toFixed(3)})`}>
                      <div className="absolute inset-0 flex items-center justify-center select-none">
                        <div className="w-full h-full" style={{ transform: `translate(${form.desktop_offset_x*100}%, ${form.desktop_offset_y*100}%) scale(${form.desktop_zoom})`, transformOrigin: 'center center' }}>
                          {form.background_type !== 'image' && form.video_url ? (
                            <>
                              {!miniDesktopLoaded && (form.poster_url ? <img src={form.poster_url} className="absolute inset-0 w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />)}
                              <video
                                src={form.video_url}
                                muted
                                playsInline
                                autoPlay={miniDesktopPlaying}
                                loop
                                onLoadedData={(e)=>{ setMiniDesktopLoaded(true); const v=e.currentTarget; if(v.videoWidth&&v.videoHeight){ setMiniDesktopAspect(ratioLabel(v.videoWidth / v.videoHeight)); } }}
                                onError={()=>{ setMiniDesktopLoaded(true); setMiniDesktopAspect('err'); }}
                                className={`w-full h-full object-cover ${!miniDesktopPlaying ? 'opacity-60' : ''}`}
                              />
                            </>
                          ) : form.image_url ? (
                            <img src={form.image_url} className="w-full h-full object-cover" onLoad={(e)=>{ const i=e.currentTarget; if(i.naturalWidth&&i.naturalHeight){ setMiniDesktopAspect(ratioLabel(i.naturalWidth / i.naturalHeight)); } }} />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
                          )}
                          {showGrid && <div className="absolute inset-0 pointer-events-none" style={{backgroundImage:'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',backgroundSize:'20% 20%',mixBlendMode:'overlay'}} />}
                        </div>
                      </div>
                      <div className="absolute top-0 left-0 text-[9px] bg-black/60 px-1 py-0.5 text-white rounded-br">{miniDesktopAspect || '—'}</div>
                      {form.background_type !== 'image' && form.video_url && (
                        <button type="button" onClick={()=>setMiniDesktopPlaying(p=>!p)} className="absolute top-0 right-0 m-0.5 px-1 py-0.5 text-[9px] rounded bg-black/60 text-white hover:bg-black/80">{miniDesktopPlaying ? '❚❚' : '▶'}</button>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 text-[9px] text-center bg-black/60 text-white py-0.5 opacity-0 group-hover:opacity-100 transition">Desktop Mini Preview</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-6">
                <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 uppercase tracking-wide">Mobile Framing <span className="ml-2 text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-md tracking-normal normal-case">Saved Per Page</span>
                  {form.background_type !== 'image' && (form.mobile_video_url || form.video_url) && (
                    (()=>{ const meta = classifyAR(mobileVideoAR,'mobile'); return (
                      <span title={meta.ok ? 'Mobile video aspect is on target (9:16)' : 'Mobile video aspect differs from 9:16 – re-export recommended'} className={`text-[10px] px-1.5 py-0.5 rounded-md border ${meta.ok ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/20 border-amber-500/30 text-amber-400'}`}>{meta.label}</span>
                    ); })()
                  )}
                </h3>
                <div className="flex gap-2">
                  <button type="button" onClick={resetMobileFraming} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white text-gray-400 transition-colors">Reset</button>
                  <button type="button" onClick={copyMobileFramingToAll} className="text-[10px] px-2 py-1 rounded border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-colors">Copy → All</button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs items-start">
                <label className="flex flex-col gap-1.5 font-bold text-gray-500">Zoom
                  <input type="range" min={0.25} max={3} step={0.01} value={form.mobile_zoom} onChange={(e) => setForm(p => ({ ...p, mobile_zoom: parseFloat(e.target.value) }))} className="w-full accent-blue-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"/>
                  <span className="text-gray-400 font-mono text-[10px]">{form.mobile_zoom.toFixed(2)}x</span>
                </label>
                <label className="flex flex-col gap-1.5 font-bold text-gray-500">Offset X
                  <input type="range" min={-0.5} max={0.5} step={0.01} value={form.mobile_offset_x} onChange={(e) => setForm(p => ({ ...p, mobile_offset_x: parseFloat(e.target.value) }))} className="w-full accent-blue-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"/>
                  <span className="text-gray-400 font-mono text-[10px]">{(form.mobile_offset_x*100).toFixed(0)}%</span>
                </label>
                <label className="flex flex-col gap-1.5 font-bold text-gray-500">Offset Y
                  <input type="range" min={-0.5} max={0.5} step={0.01} value={form.mobile_offset_y} onChange={(e) => setForm(p => ({ ...p, mobile_offset_y: parseFloat(e.target.value) }))} className="w-full accent-blue-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"/>
                  <span className="text-gray-400 font-mono text-[10px]">{(form.mobile_offset_y*100).toFixed(0)}%</span>
                </label>
                <div className="hidden md:block col-span-1 md:col-span-3">
                  <div className="mt-2 flex gap-4">
                    <div className="relative w-24 h-40 bg-black/60 rounded-lg overflow-hidden border border-white/10 group shadow-lg" title={`Mobile transform: translate(${(form.mobile_offset_x*100).toFixed(2)}%, ${(form.mobile_offset_y*100).toFixed(2)}%) scale(${form.mobile_zoom.toFixed(3)})`}>
                      <div className="absolute inset-0 flex items-center justify-center select-none">
                        <div className="w-full h-full" style={{ transform: `translate(${form.mobile_offset_x*100}%, ${form.mobile_offset_y*100}%) scale(${form.mobile_zoom})`, transformOrigin: 'center center' }}>
                          {form.background_type !== 'image' && (form.mobile_video_url || form.video_url) ? (
                            <>
                              {!miniMobileLoaded && ((form.mobile_poster_url || form.poster_url) ? <img src={form.mobile_poster_url || form.poster_url!} className="absolute inset-0 w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />)}
                              <video
                                src={form.mobile_video_url || form.video_url}
                                muted
                                playsInline
                                autoPlay={miniMobilePlaying}
                                loop
                                onLoadedData={(e)=>{ setMiniMobileLoaded(true); const v=e.currentTarget; if(v.videoWidth&&v.videoHeight){ setMiniMobileAspect(ratioLabel(v.videoWidth / v.videoHeight)); } }}
                                onError={()=>{ setMiniMobileLoaded(true); setMiniMobileAspect('err'); }}
                                className={`w-full h-full object-cover ${!miniMobilePlaying ? 'opacity-60' : ''}`}
                              />
                            </>
                          ) : form.image_url ? (
                            <img src={form.mobile_image_url || form.image_url} className="w-full h-full object-cover" onLoad={(e)=>{ const i=e.currentTarget; if(i.naturalWidth&&i.naturalHeight){ setMiniMobileAspect(ratioLabel(i.naturalWidth / i.naturalHeight)); } }} />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
                          )}
                          {showGrid && <div className="absolute inset-0 pointer-events-none" style={{backgroundImage:'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',backgroundSize:'20% 20%',mixBlendMode:'overlay'}} />}
                        </div>
                      </div>
                      <div className="absolute top-0 left-0 text-[9px] bg-black/60 px-1 py-0.5 text-white rounded-br">{miniMobileAspect || '—'}</div>
                      {form.background_type !== 'image' && (form.mobile_video_url || form.video_url) && (
                        <button type="button" onClick={()=>setMiniMobilePlaying(p=>!p)} className="absolute top-0 right-0 m-0.5 px-1 py-0.5 text-[9px] rounded bg-black/60 text-white hover:bg-black/80">{miniMobilePlaying ? '❚❚' : '▶'}</button>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 text-[9px] text-center bg-black/60 text-white py-0.5 opacity-0 group-hover:opacity-100 transition">Mobile Mini Preview</div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 leading-snug">Zoom multiplies any automatic fill adjustments. Offsets shift the media after scaling (X left/right, Y up/down). Values are stored per page.</p>
            </div>
          </div>

          {/* Overlay + preview */}
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Overlay Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.overlay_color}
                    onChange={(e) => setForm((p) => ({ ...p, overlay_color: e.target.value }))}
                    className="w-10 h-10 p-0 border-0 rounded-lg overflow-hidden cursor-pointer"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={form.overlay_color}
                      onChange={(e) => setForm((p) => ({ ...p, overlay_color: e.target.value }))}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-xs uppercase font-mono"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Overlay Opacity ({form.overlay_opacity.toFixed(2)})</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={form.overlay_opacity}
                  onChange={(e) => setForm((p) => ({ ...p, overlay_opacity: parseFloat(e.target.value) }))}
                  className="w-full accent-blue-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="bg-[#0b0f1a] rounded-xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-[11px] text-gray-300 border-b border-gray-800">
                <span className="uppercase tracking-wide text-xs text-gray-400">Preview</span>
                {form.background_type !== 'image' && (form.mobile_video_url || form.mobile_poster_url) && (
                  <button
                    type="button"
                    onClick={() => setPreviewMobile(p => !p)}
                    className={`px-2 py-0.5 rounded border text-xs transition ${previewMobile ? 'bg-yellow-500 text-black border-yellow-400' : 'border-gray-600 hover:border-yellow-400'}`}
                    title="Toggle desktop/mobile asset use"
                  >
                    {previewMobile ? 'Mobile Assets' : 'Desktop Assets'}
                  </button>
                )}
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-gray-500">Device:</span>
                  {(['auto','phone-portrait','phone-landscape','tablet','desktop'] as const).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setPreviewDevice(d)}
                      className={`px-2 py-0.5 rounded border text-[10px] ${previewDevice === d ? 'bg-blue-500 text-white border-blue-400' : 'border-gray-600 text-gray-300 hover:border-blue-400'}`}
                    >{deviceMeta[d].label}</button>
                  ))}
                  <button
                    type="button"
                    onClick={rotateDevice}
                    className="px-2 py-0.5 rounded border text-[10px] border-gray-600 text-gray-300 hover:border-blue-400"
                    title="Rotate device preset"
                  >↻</button>
                  <button
                    type="button"
                    onClick={() => setPreviewObjectFit(f => f === 'cover' ? 'contain' : 'cover')}
                    className={`px-2 py-0.5 rounded border text-[10px] ${previewObjectFit === 'cover' ? 'border-gray-600 text-gray-300 hover:border-blue-400' : 'bg-purple-500 text-white border-purple-400'}`}
                    title="Toggle object-fit cover/contain"
                  >fit:{previewObjectFit}</button>
                  <button
                    type="button"
                    onClick={() => setShowSafeAreas(s => !s)}
                    className={`px-2 py-0.5 rounded border text-[10px] ${showSafeAreas ? 'bg-green-600 text-white border-green-500' : 'border-gray-600 text-gray-300 hover:border-green-400'}`}
                    title="Toggle phone safe area overlay"
                  >safe</button>
                  <button
                    type="button"
                    onClick={() => setShowGrid(g => !g)}
                    className={`px-2 py-0.5 rounded border text-[10px] ${showGrid ? 'bg-cyan-600 text-white border-cyan-500' : 'border-gray-600 text-gray-300 hover:border-cyan-400'}`}
                    title="Toggle grid overlay"
                  >grid</button>
                  <button
                    type="button"
                    onClick={(e) => {
                      const shift = (e as any).shiftKey;
                      const dir = shift ? 'mobile→desktop' : 'desktop→mobile';
                      if (!confirm(`Sync framing ${dir}? (Shift for reverse)`)) return;
                      setForm(p => shift ? { ...p, desktop_zoom: p.mobile_zoom, desktop_offset_x: p.mobile_offset_x, desktop_offset_y: p.mobile_offset_y } : { ...p, mobile_zoom: p.desktop_zoom, mobile_offset_x: p.desktop_offset_x, mobile_offset_y: p.desktop_offset_y });
                    }}
                    className="px-2 py-0.5 rounded border text-[10px] border-amber-400 bg-amber-100 hover:bg-amber-200 text-amber-800"
                    title="Sync Desktop ↔ Mobile framing (click Desktop→Mobile, Shift=Mobile→Desktop)"
                  >sync</button>
                </div>
              </div>
              <div className="px-3 pt-3 flex items-center gap-2 text-[10px] text-gray-400">
                <span className="uppercase tracking-wide">Zoom</span>
                <button type="button" onClick={() => applyScaleDelta(-0.1)} className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-white text-xs">-</button>
                <input
                  type="range"
                  min={0.5}
                  max={2.5}
                  step={0.01}
                  value={previewScale}
                  onChange={(e) => setPreviewScale(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <button type="button" onClick={() => applyScaleDelta(0.1)} className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-white text-xs">+</button>
                <span className="tabular-nums w-12 text-right">{previewScale.toFixed(2)}x</span>
              </div>
              <div className="px-3 pb-1 text-[10px] text-gray-500 flex justify-between">
                <span className="truncate">{previewMobile ? 'Using mobile assets' : 'Using desktop assets'}{previewDevice !== 'auto' ? ` • ${deviceMeta[previewDevice].label}` : ''}</span>
                {previewDevice !== 'auto' && (<span className="whitespace-nowrap">{deviceMeta[previewDevice].width}×{deviceMeta[previewDevice].height}</span>)}
              </div>
              {aspectAdvice && (
                <div className="px-3 pb-2 text-[10px] text-amber-400 flex justify-between gap-2">
                  <span>{aspectAdvice}</span>
                  {assetAspect && deviceAspect && (
                    <span className="text-[9px] text-gray-400 whitespace-nowrap">asset {assetAspect.toFixed(3)} : device {deviceAspect.toFixed(3)}</span>
                  )}
                </div>
              )}
              <div className="flex justify-center pb-4">
                {(() => {
                  const meta = deviceMeta[previewDevice];
                  const style: React.CSSProperties = previewDevice === 'auto' ? { width: '100%', height: '12rem' } : { width: meta.width, height: meta.height };
                  return (
                    <div className="relative bg-black rounded-md overflow-hidden shadow-inner border border-gray-700" style={style}>
                      <div className="absolute inset-0" 
                        onMouseDown={(e) => {
                          if (e.button !== 0) return;
                          const startX = e.clientX; const startY = e.clientY;
                          const start = { dx: previewMobile ? form.mobile_offset_x : form.desktop_offset_x, dy: previewMobile ? form.mobile_offset_y : form.desktop_offset_y };
                          const box = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                          const move = (ev: MouseEvent) => {
                            const pxDeltaX = ev.clientX - startX;
                            const pxDeltaY = ev.clientY - startY;
                            // convert pixel drag to fractional offset relative to box size (inverse because moving content vs window)
                            const fracX = -pxDeltaX / box.width;
                            const fracY = -pxDeltaY / box.height;
                            const nextX = Math.max(-0.5, Math.min(0.5, start.dx + fracX));
                            const nextY = Math.max(-0.5, Math.min(0.5, start.dy + fracY));
                            setForm(p => previewMobile ? { ...p, mobile_offset_x: nextX, mobile_offset_y: nextY } : { ...p, desktop_offset_x: nextX, desktop_offset_y: nextY });
                          };
                          const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
                          window.addEventListener('mousemove', move);
                          window.addEventListener('mouseup', up);
                        }}
                        onTouchStart={(e) => {
                          if (!e.touches[0]) return;
                          const t0 = e.touches[0];
                          const startX = t0.clientX; const startY = t0.clientY;
                          const start = { dx: previewMobile ? form.mobile_offset_x : form.desktop_offset_x, dy: previewMobile ? form.mobile_offset_y : form.desktop_offset_y };
                          const box = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                          const move = (ev: TouchEvent) => {
                            const t = ev.touches[0]; if (!t) return;
                            const pxDeltaX = t.clientX - startX;
                            const pxDeltaY = t.clientY - startY;
                            const fracX = -pxDeltaX / box.width;
                            const fracY = -pxDeltaY / box.height;
                            const nextX = Math.max(-0.5, Math.min(0.5, start.dx + fracX));
                            const nextY = Math.max(-0.5, Math.min(0.5, start.dy + fracY));
                            setForm(p => previewMobile ? { ...p, mobile_offset_x: nextX, mobile_offset_y: nextY } : { ...p, desktop_offset_x: nextX, desktop_offset_y: nextY });
                          };
                          const end = () => { window.removeEventListener('touchmove', move); window.removeEventListener('touchend', end); };
                          window.addEventListener('touchmove', move, { passive: false });
                          window.addEventListener('touchend', end);
                        }}
                      >
                        {form.background_type === 'video' && (previewMobile ? form.mobile_video_url : form.video_url) ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-full h-full" style={{ transform: `translate(${(previewMobile ? form.mobile_offset_x : form.desktop_offset_x)*100}%, ${(previewMobile ? form.mobile_offset_y : form.desktop_offset_y)*100}%) scale(${(previewMobile ? form.mobile_zoom : form.desktop_zoom) * previewScale})`, transformOrigin: 'center center' }}>
                              <video
                                src={previewMobile ? form.mobile_video_url || form.video_url : form.video_url}
                                muted
                                playsInline
                                autoPlay
                                loop
                                poster={previewMobile ? (form.mobile_poster_url || form.poster_url) : form.poster_url}
                                className={`w-full h-full ${previewObjectFit === 'cover' ? 'object-cover' : 'object-contain'} bg-black`}
                                onLoadedMetadata={(e) => {
                                  const v = e.currentTarget;
                                  if (v.videoWidth && v.videoHeight) setAssetAspect(v.videoWidth / v.videoHeight);
                                }}
                              />
                            </div>
                          </div>
                        ) : form.image_url ? (
                          <div className="w-full h-full" style={{ transform: `translate(${(previewMobile ? form.mobile_offset_x : form.desktop_offset_x)*100}%, ${(previewMobile ? form.mobile_offset_y : form.desktop_offset_y)*100}%) scale(${(previewMobile ? form.mobile_zoom : form.desktop_zoom) * previewScale})`, transformOrigin: 'center center' }}>
                            <img
                              src={form.image_url}
                              className={`w-full h-full ${previewObjectFit === 'cover' ? 'object-cover' : 'object-contain'} bg-black`}
                              onLoad={(e) => {
                                const img = e.currentTarget;
                                if (img.naturalWidth && img.naturalHeight) setAssetAspect(img.naturalWidth / img.naturalHeight);
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        )}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ backgroundColor: form.overlay_color, opacity: form.overlay_opacity }}
                        />
                        <div className="absolute top-1 left-1 text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-white tracking-wide">
                          {PAGE_LABELS[selectedPage]} {previewMobile ? 'Mobile' : 'Desktop'}
                        </div>
                        {(previewScale !== 1 || form.desktop_offset_x !== 0 || form.desktop_offset_y !== 0 || form.mobile_offset_x !== 0 || form.mobile_offset_y !== 0 || form.desktop_zoom !== 1 || form.mobile_zoom !== 1) && (
                          <div className="absolute bottom-1 right-1 text-[9px] bg-black/60 px-1 py-0.5 rounded text-white space-x-1">
                            <span>{(previewMobile ? form.mobile_zoom : form.desktop_zoom).toFixed(2)}× frame</span>
                            <span>× {previewScale.toFixed(2)} preview</span>
                            <span>= {(((previewMobile ? form.mobile_zoom : form.desktop_zoom) * previewScale)).toFixed(2)}×</span>
                            <span>• {(previewMobile ? form.mobile_offset_x : form.desktop_offset_x).toFixed(2)}, {(previewMobile ? form.mobile_offset_y : form.desktop_offset_y).toFixed(2)}</span>
                          </div>
                        )}
                        {showSafeAreas && (previewDevice === 'phone-portrait' || previewDevice === 'phone-landscape') && (
                          <>
                            {/* Notch/top safe area */}
                            <div className="absolute left-1/2 -translate-x-1/2 bg-black/70 rounded-b-2xl" style={{ top: 0, width: previewDevice === 'phone-portrait' ? 120 : 180, height: 18 }} />
                            {/* Bottom home indicator */}
                            <div className="absolute left-1/2 -translate-x-1/2 bg-white/60 rounded-full" style={{ bottom: 6, width: 100, height: 4 }} />
                          </>
                        )}
                      </div>
                      {previewDevice !== 'auto' && (
                        <div className="absolute inset-0 ring-1 ring-blue-400/40 pointer-events-none" />
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8 pt-6 border-t border-white/5">
          <div className="text-xs">
            {unsaved ? (
              <span className="inline-flex items-center gap-2 text-amber-400 font-bold tracking-wide uppercase"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" /> Unsaved framing changes</span>
            ) : (
              <span className="text-gray-500 font-medium tracking-wide">No unsaved framing changes</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {form.background_type !== 'image' && (form.mobile_video_url || form.mobile_poster_url) && (
              <button
                type="button"
                onClick={applyMobileToAllPages}
                className="px-4 py-2 bg-white/5 border border-white/10 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 text-xs font-bold uppercase tracking-wider transition-all"
              >
                Apply Mobile Portrait to All Pages
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchHeroMedia(selectedPage)}
              className="px-6 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm"
            >
              <X size={16} />
              Reload
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={disabledSave}
              className={`
                px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2
                ${disabledSave 
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black shadow-amber-500/20 hover:shadow-amber-500/40 hover:-translate-y-0.5'
                }
              `}
            >
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </div>
          {/* Debug panel for diagnosing framing persistence */}
          <div className="mt-8 p-6 rounded-xl border border-white/5 bg-black/40 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
              Framing Debug (Internal)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] font-mono">
              <div className="space-y-1">
                <div className="text-gray-500 font-bold mb-1">FORM MOBILE</div>
                <div className="text-gray-400">zoom: <span className="text-white">{form.mobile_zoom.toFixed(2)}</span></div>
                <div className="text-gray-400">X: <span className="text-white">{(form.mobile_offset_x*100).toFixed(1)}%</span></div>
                <div className="text-gray-400">Y: <span className="text-white">{(form.mobile_offset_y*100).toFixed(1)}%</span></div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-500 font-bold mb-1">STORED MOBILE</div>
                <div className="text-gray-400">zoom: <span className="text-white">{((current as any)?.mobile_zoom ?? 1).toFixed(2)}</span></div>
                <div className="text-gray-400">X: <span className="text-white">{(((current as any)?.mobile_offset_x ?? 0)*100).toFixed(1)}%</span></div>
                <div className="text-gray-400">Y: <span className="text-white">{(((current as any)?.mobile_offset_y ?? 0)*100).toFixed(1)}%</span></div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-500 font-bold mb-1">FORM DESKTOP</div>
                <div className="text-gray-400">zoom: <span className="text-white">{form.desktop_zoom.toFixed(2)}</span></div>
                <div className="text-gray-400">X: <span className="text-white">{(form.desktop_offset_x*100).toFixed(1)}%</span></div>
                <div className="text-gray-400">Y: <span className="text-white">{(form.desktop_offset_y*100).toFixed(1)}%</span></div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-500 font-bold mb-1">STORED DESKTOP</div>
                <div className="text-gray-400">zoom: <span className="text-white">{((current as any)?.desktop_zoom ?? 1).toFixed(2)}</span></div>
                <div className="text-gray-400">X: <span className="text-white">{(((current as any)?.desktop_offset_x ?? 0)*100).toFixed(1)}%</span></div>
                <div className="text-gray-400">Y: <span className="text-white">{(((current as any)?.desktop_offset_y ?? 0)*100).toFixed(1)}%</span></div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
              <button type="button" onClick={()=>fetchHeroMedia(selectedPage)} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-gray-400 hover:text-white hover:bg-white/10 transition-colors">Force Refetch</button>
              <button type="button" onClick={()=>{
                console.log('[Debug] current heroMedia row', current);
                alert('Row logged to console');
              }} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-gray-400 hover:text-white hover:bg-white/10 transition-colors">Log Row</button>
              <button type="button" onClick={()=>{
                setForm(p=>({...p, mobile_zoom:1, mobile_offset_x:0, mobile_offset_y:0}));
              }} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-gray-400 hover:text-white hover:bg-white/10 transition-colors">Reset Mobile (Form Only)</button>
            </div>
          </div>
      </div>
    </div>
  );
};

export default HeroMediaManagement;
