import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, X, CheckCircle2, Type, Sparkles, Clock, Loader2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';

// Sub-components
import { HeroContentSettings } from './homepage/HeroContentSettings';
import { BrandingSettings } from './homepage/BrandingSettings';
import { PartnersSectionSettings } from './homepage/PartnersSectionSettings';
import { InstagramIntegrationSettings } from './homepage/InstagramIntegrationSettings';
import { LeadershipSettings } from './homepage/LeadershipSettings';

export const HomepageManagement: React.FC = () => {
  const { homepageSettings, updateHomepageSettings } = useData() as any;
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bgRemoveBusyId, setBgRemoveBusyId] = useState<string | null>(null);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingPage, setSavingPage] = useState(false);
  const savingProgress = useSavingProgress();

  type SponsorLogo = {
    id: string;
    name: string;
    logo_url: string;
    website?: string;
    enabled: boolean;
    order: number;
  };
  
  type FormState = {
    hero_media_url: string;
    hero_media_type: 'image' | 'video';
    hero_title: string;
    hero_subtitle: string;
    hero_description: string;
    brand_logo_url?: string;
    brand_year?: number | '';
    brand_logo_size_px?: number | '';
    brand_logo_glow_strength?: number | '';
    brand_logo_glow_color?: string;
    brand_logo_side?: 'left' | 'right';
    brand_logo_offset_x_px?: number | '';
    brand_logo_offset_y_px?: number | '';
    brand_logo_offset_x_sm_px?: number | '';
    brand_logo_offset_y_sm_px?: number | '';
    brand_logo_offset_x_md_px?: number | '';
    brand_logo_offset_y_md_px?: number | '';
    brand_logo_offset_x_lg_px?: number | '';
    brand_logo_offset_y_lg_px?: number | '';
    sponsor_logos: SponsorLogo[];
    sponsor_section_enabled: boolean;
    sponsor_section_text: string;
    sponsor_section_title?: string;
    sponsor_section_subtitle?: string;
    featured_partners_enabled: boolean;
    show_faculty_heads: boolean;
    show_committee_heads: boolean;
    leadership_carousel_speed_ms: number | '';
    sponsors_belt_speed_px_per_sec: number | '';
    committee_marquee_speed_px_per_sec: number | '';
    sponsors_belt_direction: 'left' | 'right';
    committee_marquee_direction: 'left' | 'right';
    instagram_trailer_url?: string;
    instagram_trailer_enabled?: boolean;
    instagram_trailer_title?: string;
    instagram_trailer_subtitle?: string;
    instagram_aftermovie_url?: string;
    instagram_aftermovie_enabled?: boolean;
    instagram_aftermovie_title?: string;
    instagram_aftermovie_subtitle?: string;
  };
  
  const [form, setForm] = useLocalStorage<FormState>('admin_homepage_form_draft', {
    hero_media_url: homepageSettings?.hero_media_url || '',
    hero_media_type: homepageSettings?.hero_media_type || 'image',
    hero_title: homepageSettings?.hero_title || 'RICORRENZA',
    hero_subtitle: homepageSettings?.hero_subtitle || 'Experience the Future',
    hero_description: homepageSettings?.hero_description || 'Experience the future of Healthcare, Technology, and Creativity',
    brand_logo_url: (homepageSettings as any)?.brand_logo_url || '',
    brand_year: (homepageSettings as any)?.brand_year ?? new Date().getFullYear(),
    brand_logo_size_px: (homepageSettings as any)?.brand_logo_size_px ?? 36,
    brand_logo_glow_strength: (homepageSettings as any)?.brand_logo_glow_strength ?? 1,
    brand_logo_glow_color: (homepageSettings as any)?.brand_logo_glow_color || '#ff00ff',
    brand_logo_side: ((homepageSettings as any)?.brand_logo_side as any) || 'left',
    brand_logo_offset_x_px: (homepageSettings as any)?.brand_logo_offset_x_px ?? 0,
    brand_logo_offset_y_px: (homepageSettings as any)?.brand_logo_offset_y_px ?? 0,
    brand_logo_offset_x_sm_px: (homepageSettings as any)?.brand_logo_offset_x_sm_px ?? '',
    brand_logo_offset_y_sm_px: (homepageSettings as any)?.brand_logo_offset_y_sm_px ?? '',
    brand_logo_offset_x_md_px: (homepageSettings as any)?.brand_logo_offset_x_md_px ?? '',
    brand_logo_offset_y_md_px: (homepageSettings as any)?.brand_logo_offset_y_md_px ?? '',
    brand_logo_offset_x_lg_px: (homepageSettings as any)?.brand_logo_offset_x_lg_px ?? '',
    brand_logo_offset_y_lg_px: (homepageSettings as any)?.brand_logo_offset_y_lg_px ?? '',
    sponsor_logos: (homepageSettings?.sponsor_logos as SponsorLogo[]) || [],
    sponsor_section_enabled: homepageSettings?.sponsor_section_enabled || false,
    sponsor_section_text: homepageSettings?.sponsor_section_text || 'Powered by',
    sponsor_section_title: (homepageSettings as any)?.sponsor_section_title || 'OUR PARTNERS',
    sponsor_section_subtitle: (homepageSettings as any)?.sponsor_section_subtitle || 'Powered by industry leaders who believe in our vision',
    featured_partners_enabled: homepageSettings?.featured_partners_enabled ?? true,
    show_faculty_heads: homepageSettings?.show_faculty_heads ?? true,
    show_committee_heads: homepageSettings?.show_committee_heads ?? true,
    leadership_carousel_speed_ms: homepageSettings?.leadership_carousel_speed_ms ?? 2500,
    sponsors_belt_speed_px_per_sec: (homepageSettings as any)?.sponsors_belt_speed_px_per_sec ?? 140,
    committee_marquee_speed_px_per_sec: (homepageSettings as any)?.committee_marquee_speed_px_per_sec ?? 75,
    sponsors_belt_direction: ((homepageSettings as any)?.sponsors_belt_direction as any) ?? 'left',
    committee_marquee_direction: ((homepageSettings as any)?.committee_marquee_direction as any) ?? 'right',
    instagram_trailer_url: (homepageSettings as any)?.instagram_trailer_url || '',
    instagram_trailer_enabled: (homepageSettings as any)?.instagram_trailer_enabled ?? false,
    instagram_trailer_title: (homepageSettings as any)?.instagram_trailer_title || 'OFFICIAL TRAILER',
    instagram_trailer_subtitle: (homepageSettings as any)?.instagram_trailer_subtitle || 'Watch our official event trailer',
    instagram_aftermovie_url: (homepageSettings as any)?.instagram_aftermovie_url || '',
    instagram_aftermovie_enabled: (homepageSettings as any)?.instagram_aftermovie_enabled ?? false,
    instagram_aftermovie_title: (homepageSettings as any)?.instagram_aftermovie_title || 'EVENT AFTERMOVIE',
    instagram_aftermovie_subtitle: (homepageSettings as any)?.instagram_aftermovie_subtitle || 'Relive the best moments from our event'
  });

  const handleRemoveLogoBg = async (logoId: string) => {
    const logo = form.sponsor_logos.find(l => l.id === logoId);
    if (!logo?.logo_url) return;
    try {
      setBgRemoveBusyId(logoId);
      const res = await fetch(logo.logo_url, { mode: 'cors' });
      const blob = await res.blob();
      const cleaned = await removeBlackBackground(blob, 28);
      const url = await uploadCleanLogo(cleaned);
      setForm(prev => ({ ...prev, sponsor_logos: prev.sponsor_logos.map(l => l.id === logoId ? { ...l, logo_url: url } : l) }));
      setMessage({ type: 'success', text: 'Background removed — saved to draft.' });
      setTimeout(() => setMessage(null), 2500);
    } catch (e) {
      console.error('Remove background failed', e);
      alert('Unable to remove background. Please upload a transparent PNG.');
    } finally {
      setBgRemoveBusyId(null);
    }
  };

  const handleCancel = () => {
    setForm({
      hero_media_url: homepageSettings?.hero_media_url || '',
      hero_media_type: homepageSettings?.hero_media_type || 'image',
      hero_title: homepageSettings?.hero_title || 'RICORRENZA',
      hero_subtitle: homepageSettings?.hero_subtitle || 'Experience the Future',
      hero_description: homepageSettings?.hero_description || 'Experience the future of Healthcare, Technology, and Creativity',
      brand_logo_url: (homepageSettings as any)?.brand_logo_url || '',
      brand_year: (homepageSettings as any)?.brand_year ?? new Date().getFullYear(),
      brand_logo_size_px: (homepageSettings as any)?.brand_logo_size_px ?? 36,
      brand_logo_glow_strength: (homepageSettings as any)?.brand_logo_glow_strength ?? 1,
      brand_logo_glow_color: (homepageSettings as any)?.brand_logo_glow_color || '#ff00ff',
      brand_logo_side: ((homepageSettings as any)?.brand_logo_side as any) || 'left',
      brand_logo_offset_x_px: (homepageSettings as any)?.brand_logo_offset_x_px ?? 0,
      brand_logo_offset_y_px: (homepageSettings as any)?.brand_logo_offset_y_px ?? 0,
      brand_logo_offset_x_sm_px: (homepageSettings as any)?.brand_logo_offset_x_sm_px ?? '',
      brand_logo_offset_y_sm_px: (homepageSettings as any)?.brand_logo_offset_y_sm_px ?? '',
      brand_logo_offset_x_md_px: (homepageSettings as any)?.brand_logo_offset_x_md_px ?? '',
      brand_logo_offset_y_md_px: (homepageSettings as any)?.brand_logo_offset_y_md_px ?? '',
      brand_logo_offset_x_lg_px: (homepageSettings as any)?.brand_logo_offset_x_lg_px ?? '',
      brand_logo_offset_y_lg_px: (homepageSettings as any)?.brand_logo_offset_y_lg_px ?? '',
      sponsor_logos: (homepageSettings?.sponsor_logos as SponsorLogo[]) || [],
      sponsor_section_enabled: homepageSettings?.sponsor_section_enabled || false,
      sponsor_section_text: homepageSettings?.sponsor_section_text || 'Powered by',
      sponsor_section_title: (homepageSettings as any)?.sponsor_section_title || 'OUR PARTNERS',
      sponsor_section_subtitle: (homepageSettings as any)?.sponsor_section_subtitle || 'Powered by industry leaders who believe in our vision',
      featured_partners_enabled: homepageSettings?.featured_partners_enabled ?? true,
      show_faculty_heads: homepageSettings?.show_faculty_heads ?? true,
      show_committee_heads: homepageSettings?.show_committee_heads ?? true,
      leadership_carousel_speed_ms: homepageSettings?.leadership_carousel_speed_ms ?? 2500,
      sponsors_belt_speed_px_per_sec: (homepageSettings as any)?.sponsors_belt_speed_px_per_sec ?? 140,
      committee_marquee_speed_px_per_sec: (homepageSettings as any)?.committee_marquee_speed_px_per_sec ?? 75,
      sponsors_belt_direction: ((homepageSettings as any)?.sponsors_belt_direction as any) ?? 'left',
      committee_marquee_direction: ((homepageSettings as any)?.committee_marquee_direction as any) ?? 'right',
      instagram_trailer_url: (homepageSettings as any)?.instagram_trailer_url || '',
      instagram_trailer_enabled: (homepageSettings as any)?.instagram_trailer_enabled ?? false,
      instagram_trailer_title: (homepageSettings as any)?.instagram_trailer_title || 'OFFICIAL TRAILER',
      instagram_trailer_subtitle: (homepageSettings as any)?.instagram_trailer_subtitle || 'Watch our official event trailer',
      instagram_aftermovie_url: (homepageSettings as any)?.instagram_aftermovie_url || '',
      instagram_aftermovie_enabled: (homepageSettings as any)?.instagram_aftermovie_enabled ?? false,
      instagram_aftermovie_title: (homepageSettings as any)?.instagram_aftermovie_title || 'EVENT AFTERMOVIE',
      instagram_aftermovie_subtitle: (homepageSettings as any)?.instagram_aftermovie_subtitle || 'Relive the best moments from our event'
    });
    try { localStorage.removeItem('admin_homepage_form_draft'); } catch {}
    setIsEditing(false);
    setMessage(null);
  };

  const handleSave = async () => {
    try {
      if (savingPage || savingBranding) return;
      setSavingPage(true);
      const steps = savingProgress.withSteps(4, 'Preparing…');
      
      const { deleteFromStorageByPublicUrl } = await import('../../utils/uploadUtils');
      
      // Cleanup Logic
      steps.next('Checking for abandoned files');
      const oldHero = homepageSettings?.hero_media_url;
      const newHero = form.hero_media_url;
      if (oldHero && oldHero !== newHero && !oldHero.includes('instagram.com')) {
          await deleteFromStorageByPublicUrl(oldHero);
      }

      steps.next('Saving to database');
      
      const toNum = (v: any) => (v === '' || v === null || v === undefined) ? null : parseInt(v, 10);
      const toFloat = (v: any) => (v === '' || v === null || v === undefined) ? null : parseFloat(v);
      const toStr = (v: any) => (v === '' || v === null || v === undefined) ? null : String(v);

      const payload = {
        hero_media_url: toStr(form.hero_media_url),
        hero_media_type: form.hero_media_type,
        hero_title: toStr(form.hero_title),
        hero_subtitle: toStr(form.hero_subtitle),
        hero_description: toStr(form.hero_description),
        brand_logo_url: toStr(form.brand_logo_url),
        brand_year: toNum(form.brand_year),
        brand_logo_size_px: toNum(form.brand_logo_size_px),
        brand_logo_glow_strength: toFloat(form.brand_logo_glow_strength),
        brand_logo_glow_color: toStr(form.brand_logo_glow_color),
        brand_logo_side: form.brand_logo_side,
        brand_logo_offset_x_px: toNum(form.brand_logo_offset_x_px),
        brand_logo_offset_y_px: toNum(form.brand_logo_offset_y_px),
        brand_logo_offset_x_sm_px: toNum(form.brand_logo_offset_x_sm_px),
        brand_logo_offset_y_sm_px: toNum(form.brand_logo_offset_y_sm_px),
        brand_logo_offset_x_md_px: toNum(form.brand_logo_offset_x_md_px),
        brand_logo_offset_y_md_px: toNum(form.brand_logo_offset_y_md_px),
        brand_logo_offset_x_lg_px: toNum(form.brand_logo_offset_x_lg_px),
        brand_logo_offset_y_lg_px: toNum(form.brand_logo_offset_y_lg_px),
        sponsor_logos: form.sponsor_logos,
        sponsor_section_enabled: !!form.sponsor_section_enabled,
        sponsor_section_text: toStr(form.sponsor_section_text),
        sponsor_section_title: toStr(form.sponsor_section_title),
        sponsor_section_subtitle: toStr(form.sponsor_section_subtitle),
        featured_partners_enabled: !!form.featured_partners_enabled,
        show_faculty_heads: !!form.show_faculty_heads,
        show_committee_heads: !!form.show_committee_heads,
        leadership_carousel_speed_ms: toNum(form.leadership_carousel_speed_ms),
        sponsors_belt_speed_px_per_sec: toNum(form.sponsors_belt_speed_px_per_sec),
        committee_marquee_speed_px_per_sec: toNum(form.committee_marquee_speed_px_per_sec),
        sponsors_belt_direction: form.sponsors_belt_direction,
        committee_marquee_direction: form.committee_marquee_direction,
        instagram_trailer_url: toStr(form.instagram_trailer_url),
        instagram_trailer_enabled: !!form.instagram_trailer_enabled,
        instagram_trailer_title: toStr(form.instagram_trailer_title),
        instagram_trailer_subtitle: toStr(form.instagram_trailer_subtitle),
        instagram_aftermovie_url: toStr(form.instagram_aftermovie_url),
        instagram_aftermovie_enabled: !!form.instagram_aftermovie_enabled,
        instagram_aftermovie_title: toStr(form.instagram_aftermovie_title),
        instagram_aftermovie_subtitle: toStr(form.instagram_aftermovie_subtitle),
      };

      await updateHomepageSettings(payload as any);
      
      try {
        const logoUrl = form.brand_logo_url;
        if (logoUrl) localStorage.setItem('rico_brand_logo_url', logoUrl);
        else localStorage.removeItem('rico_brand_logo_url');
      } catch {}

      setIsEditing(false);
      setMessage({ type: 'success', text: 'Homepage settings updated successfully!' });
      try { localStorage.removeItem('admin_homepage_form_draft'); } catch {}
      setTimeout(() => setMessage(null), 5000);
    } catch (error: any) {
      console.error('Error updating homepage settings:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to update homepage settings: ${error.message || 'Unknown error'}` 
      });
    } finally {
      setSavingPage(false);
      savingProgress.done();
    }
  };

  const removeBlackBackground = async (input: Blob, threshold = 24): Promise<Blob> => {
    const bmp = await createImageBitmap(input);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width; canvas.height = bmp.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(bmp, 0, 0);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i+1], b = d[i+2];
      if (r < threshold && g < threshold && b < threshold) d[i+3] = 0;
    }
    ctx.putImageData(img, 0, 0);
    return new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), 'image/png')) as Promise<Blob>;
  };

  const uploadCleanLogo = async (blob: Blob): Promise<string> => {
    const fileName = `bg-removed/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const { error } = await supabase.storage.from('sponsor-logos').upload(fileName, blob, {
      cacheControl: '3600', upsert: false, contentType: 'image/png'
    });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('sponsor-logos').getPublicUrl(fileName);
    return publicUrl;
  };

  const addSponsorLogo = () => {
    const newLogo: SponsorLogo = {
      id: `sponsor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: '', logo_url: '', website: '', enabled: true, order: form.sponsor_logos.length + 1
    };
    setForm(prev => ({ ...prev, sponsor_logos: [...prev.sponsor_logos, newLogo] }));
  };

  const updateSponsorLogo = (id: string, updates: Partial<SponsorLogo>) => {
    setForm(prev => ({ ...prev, sponsor_logos: prev.sponsor_logos.map(l => l.id === id ? { ...l, ...updates } : l) }));
  };

  const removeSponsorLogo = (id: string) => {
    setForm(prev => ({ ...prev, sponsor_logos: prev.sponsor_logos.filter(l => l.id !== id) }));
  };

  const moveSponsorLogo = (id: string, direction: 'up' | 'down') => {
    const currentIndex = form.sponsor_logos.findIndex(l => l.id === id);
    if (currentIndex === -1) return;
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= form.sponsor_logos.length) return;
    const newLogos = [...form.sponsor_logos];
    [newLogos[currentIndex], newLogos[newIndex]] = [newLogos[newIndex], newLogos[currentIndex]];
    newLogos.forEach((l, i) => { l.order = i + 1; });
    setForm(prev => ({ ...prev, sponsor_logos: newLogos }));
  };

  const saveBranding = async () => {
    try {
      if (savingBranding || savingPage) return;
      setSavingBranding(true);
      savingProgress.withSteps(2, 'Saving branding…');
      const brandingPayload = {
        brand_logo_url: form.brand_logo_url,
        brand_year: form.brand_year,
        brand_logo_size_px: form.brand_logo_size_px,
        brand_logo_glow_strength: form.brand_logo_glow_strength,
        brand_logo_glow_color: form.brand_logo_glow_color,
        brand_logo_side: form.brand_logo_side,
        brand_logo_offset_x_px: form.brand_logo_offset_x_px,
        brand_logo_offset_y_px: form.brand_logo_offset_y_px,
      };
      await updateHomepageSettings(brandingPayload as any);
      setMessage({ type: 'success', text: 'Branding saved' });
      setTimeout(() => setMessage(null), 2000);
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to save branding' });
    } finally {
      setSavingBranding(false);
      savingProgress.done();
    }
  };

  const resetBrandingDraft = () => {
    setForm(prev => ({
      ...prev,
      brand_logo_url: (homepageSettings as any)?.brand_logo_url || '',
      brand_year: (homepageSettings as any)?.brand_year ?? new Date().getFullYear(),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-1.5 h-8 bg-gradient-to-b from-blue-400 to-indigo-600 rounded-full" />
            Homepage Design
          </h2>
          <p className="text-gray-400 mt-1">Control the hero visual, branding, and dynamic sections.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2 ${
              isEditing ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-indigo-600 text-white'
            }`}
          >
            {isEditing ? <><X size={16} /> Exit Editor</> : <><Save size={16} /> Open Editor</>}
          </button>
        </div>
      </div>

      {message && (
        <div className={`rounded-lg p-4 flex items-center ${message.type === 'success' ? 'bg-green-50/10 border-green-500/20' : 'bg-red-50/10 border-red-500/20'}`}>
          <span className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>{message.text}</span>
        </div>
      )}

      {!isEditing && (
        <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/5 mb-2">
            <Type className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Editor Mode Inactive</h3>
          <p className="text-gray-400 max-w-md">Click "Open Editor" to modify content.</p>
        </div>
      )}

      {isEditing && (
        <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <HeroContentSettings form={form} setForm={setForm} />
              <div className="mt-12 pt-12 border-t border-white/5">
                <BrandingSettings
                  form={form} setForm={setForm}
                  saveBranding={saveBranding} resetBrandingDraft={resetBrandingDraft}
                  savingBranding={savingBranding} savingPage={savingPage}
                  setMessage={setMessage}
                />
              </div>
            </div>
            <div className="space-y-8">
               <InstagramIntegrationSettings form={form} setForm={setForm} />
            </div>
          </div>
          <div className="mt-12 pt-12 border-t border-white/5">
            <LeadershipSettings form={form} setForm={setForm} />
          </div>
          <div className="mt-12 pt-12 border-t border-white/5">
            <PartnersSectionSettings
              form={form} setForm={setForm}
              handleRemoveLogoBg={handleRemoveLogoBg}
              bgRemoveBusyId={bgRemoveBusyId}
              addSponsorLogo={addSponsorLogo}
              updateSponsorLogo={updateSponsorLogo}
              removeSponsorLogo={removeSponsorLogo}
              moveSponsorLogo={moveSponsorLogo}
            />
          </div>

          {/* Editor Actions Footer */}
          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Unsaved changes are stored in your local draft.</span>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all border border-white/5"
              >
                Cancel & Reset
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={savingPage || savingBranding}
                className={`
                  flex-1 sm:flex-none px-8 py-3 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2
                  ${savingPage 
                    ? 'bg-indigo-600/50 text-white/50 cursor-wait shadow-none' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 hover:shadow-indigo-600/40 transform hover:-translate-y-0.5'
                  }
                `}
              >
                {savingPage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Save All Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 mt-12">
        <div className="relative group p-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" /> Pro Tips
          </h4>
          <div className="space-y-3">
            <p className="text-gray-400 text-sm italic">Use transparent PNGs for logos.</p>
            <p className="text-gray-400 text-sm italic">Keep descriptions short.</p>
          </div>
        </div>
        <div className="relative group p-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" /> Stats
          </h4>
          <div className="flex gap-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="text-xl font-bold text-blue-400">{homepageSettings?.hero_media_type || 'Image'}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Media</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="text-xl font-bold text-purple-400">{homepageSettings?.sponsor_logos?.length || 0}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Partners</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};