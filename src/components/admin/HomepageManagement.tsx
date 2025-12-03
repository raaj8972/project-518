import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { SUPABASE_ENV_OK, SUPABASE_HOST } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Save, X, AlertCircle, Type, FileText, Plus, Trash2, ExternalLink, ArrowUp, ArrowDown, Wand2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import LogoLoop from '../LogoLoop';
import InfiniteMarquee from '../InfiniteMarquee';
import { ImageUpload } from '../ImageUpload';
// Removed dev-only Branding preview
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';

export const HomepageManagement: React.FC = () => {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { homepageSettings, updateHomepageSettings, sponsors, coreTeamMembers } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bgRemoveBusyId, setBgRemoveBusyId] = useState<string | null>(null);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingPage, setSavingPage] = useState(false);
  // Removed dev-only preview breakpoint state and window width tracking
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
    // Optional responsive overrides
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
  };
  
  const [form, setForm] = useLocalStorage<FormState>('admin_homepage_form_draft', {
    hero_media_url: homepageSettings?.hero_media_url || '',
    hero_media_type: homepageSettings?.hero_media_type || 'image' as 'image' | 'video',
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
    committee_marquee_direction: ((homepageSettings as any)?.committee_marquee_direction as any) ?? 'right'
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
      setMessage({ type: 'success', text: 'Background removed — saved to draft. Click Save Changes to apply.' });
      setTimeout(() => setMessage(null), 2500);
    } catch (e) {
      console.error('Remove background failed', e);
      alert('Unable to remove background. Please ensure CORS allows fetching this image, or upload a transparent PNG.');
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
      committee_marquee_direction: ((homepageSettings as any)?.committee_marquee_direction as any) ?? 'right'
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
      steps.next('Validating');
      const clamp = (v: any, min: number, max: number) => (typeof v === 'number' && !isNaN(v) ? Math.min(max, Math.max(min, v)) : null);
      const payload = {
        hero_media_url: (form.hero_media_url || '').trim() || null,
        hero_media_type: (form.hero_media_type === 'video' ? 'video' : 'image') as 'image' | 'video',
        hero_title: (form.hero_title || 'RICORRENZA').toString(),
        hero_subtitle: (form.hero_subtitle || 'Experience the Future').toString(),
        hero_description: (form.hero_description || 'Experience the future of Healthcare, Technology, and Creativity').toString(),
        sponsor_logos: Array.isArray(form.sponsor_logos)
          ? form.sponsor_logos.map((L, i) => ({
              id: L.id,
              name: L.name,
              logo_url: L.logo_url,
              website: L.website || undefined,
              enabled: !!L.enabled,
              order: typeof L.order === 'number' && !isNaN(L.order) ? L.order : i + 1,
            }))
          : [],
        sponsor_section_enabled: !!form.sponsor_section_enabled,
        sponsor_section_text: (form.sponsor_section_text || 'Powered by').toString(),
        sponsor_section_title: (form as any).sponsor_section_title || 'OUR PARTNERS',
        sponsor_section_subtitle: (form as any).sponsor_section_subtitle || 'Powered by industry leaders who believe in our vision',
        featured_partners_enabled: !!form.featured_partners_enabled,
        show_faculty_heads: !!form.show_faculty_heads,
        show_committee_heads: !!form.show_committee_heads,
        brand_logo_url: (form as any).brand_logo_url || null,
        brand_year: typeof (form as any).brand_year === 'number' && !isNaN((form as any).brand_year)
          ? (form as any).brand_year
          : new Date().getFullYear(),
        brand_logo_size_px: typeof (form as any).brand_logo_size_px === 'number' && !isNaN((form as any).brand_logo_size_px)
          ? Math.min(256, Math.max(16, (form as any).brand_logo_size_px))
          : 36,
        brand_logo_glow_strength: typeof (form as any).brand_logo_glow_strength === 'number' && !isNaN((form as any).brand_logo_glow_strength)
          ? Math.min(2, Math.max(0, (form as any).brand_logo_glow_strength))
          : 1,
        brand_logo_glow_color: ((form as any).brand_logo_glow_color || '').toString().trim() || '#ff00ff',
        brand_logo_side: ((form as any).brand_logo_side === 'right' ? 'right' : 'left') as any,
        brand_logo_offset_x_px: typeof (form as any).brand_logo_offset_x_px === 'number' && !isNaN((form as any).brand_logo_offset_x_px)
          ? Math.min(200, Math.max(-200, (form as any).brand_logo_offset_x_px))
          : 0,
        brand_logo_offset_y_px: typeof (form as any).brand_logo_offset_y_px === 'number' && !isNaN((form as any).brand_logo_offset_y_px)
          ? Math.min(200, Math.max(-200, (form as any).brand_logo_offset_y_px))
          : 0,
        brand_logo_offset_x_sm_px: (typeof (form as any).brand_logo_offset_x_sm_px === 'number' && !isNaN((form as any).brand_logo_offset_x_sm_px)) ? clamp((form as any).brand_logo_offset_x_sm_px, -400, 400) : null,
        brand_logo_offset_y_sm_px: (typeof (form as any).brand_logo_offset_y_sm_px === 'number' && !isNaN((form as any).brand_logo_offset_y_sm_px)) ? clamp((form as any).brand_logo_offset_y_sm_px, -400, 400) : null,
        brand_logo_offset_x_md_px: (typeof (form as any).brand_logo_offset_x_md_px === 'number' && !isNaN((form as any).brand_logo_offset_x_md_px)) ? clamp((form as any).brand_logo_offset_x_md_px, -400, 400) : null,
        brand_logo_offset_y_md_px: (typeof (form as any).brand_logo_offset_y_md_px === 'number' && !isNaN((form as any).brand_logo_offset_y_md_px)) ? clamp((form as any).brand_logo_offset_y_md_px, -400, 400) : null,
        brand_logo_offset_x_lg_px: (typeof (form as any).brand_logo_offset_x_lg_px === 'number' && !isNaN((form as any).brand_logo_offset_x_lg_px)) ? clamp((form as any).brand_logo_offset_x_lg_px, -400, 400) : null,
        brand_logo_offset_y_lg_px: (typeof (form as any).brand_logo_offset_y_lg_px === 'number' && !isNaN((form as any).brand_logo_offset_y_lg_px)) ? clamp((form as any).brand_logo_offset_y_lg_px, -400, 400) : null,
        leadership_carousel_speed_ms: typeof form.leadership_carousel_speed_ms === 'number' && !isNaN(form.leadership_carousel_speed_ms)
          ? Math.max(1000, form.leadership_carousel_speed_ms)
          : 2500,
        sponsors_belt_speed_px_per_sec: typeof form.sponsors_belt_speed_px_per_sec === 'number' && !isNaN(form.sponsors_belt_speed_px_per_sec)
          ? Math.min(800, Math.max(1, form.sponsors_belt_speed_px_per_sec))
          : 140,
        committee_marquee_speed_px_per_sec: typeof form.committee_marquee_speed_px_per_sec === 'number' && !isNaN(form.committee_marquee_speed_px_per_sec)
          ? Math.min(800, Math.max(1, form.committee_marquee_speed_px_per_sec))
          : 75,
        sponsors_belt_direction: (form.sponsors_belt_direction === 'right' ? 'right' : 'left') as 'left' | 'right',
        committee_marquee_direction: (form.committee_marquee_direction === 'left' ? 'left' : 'right') as 'left' | 'right',
      } as const;
      steps.next('Saving to database');
      await updateHomepageSettings(payload as any);
      setForm(payload as unknown as FormState);
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Homepage settings updated successfully!' });
      try { localStorage.removeItem('admin_homepage_form_draft'); } catch {}
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Error updating homepage settings:', error);
      const errText = (error as any)?.message || 'Failed to update homepage settings. Please try again.';
      setMessage({ type: 'error', text: errText });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSavingPage(false);
      savingProgress.done();
    }
  };
  
  // Normalize potentially problematic image/asset URLs so they render in admin previews
  const sanitizeUrl = (u: string | null | undefined): string => {
    if (!u) return '';
    let s = String(u).trim();
    if (!s) return '';
    // Prefix relative Supabase storage paths with our Supabase origin
    if (s.startsWith('/storage/')) {
      const origin = `https://${SUPABASE_HOST}`;
      s = origin + s;
    }
    // Avoid mixed content if admin is served over https in prod
    try {
      const url = new URL(s);
      if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && url.protocol === 'http:') {
        url.protocol = 'https:';
        s = url.toString();
      }
    } catch {}
    return s;
  };

  // --- Helper: remove near-black background and return transparent PNG Blob
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
    const blob: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), 'image/png'));
    return blob;
  };

  // --- Helper: upload cleaned logo to sponsor-logos and return public URL
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
      name: '',
      logo_url: '',
      website: '',
      enabled: true,
      order: form.sponsor_logos.length + 1
    };
    setForm(prev => ({
      ...prev,
      sponsor_logos: [...prev.sponsor_logos, newLogo]
    }));
  };

  const updateSponsorLogo = (id: string, updates: Partial<SponsorLogo>) => {
    setForm(prev => ({
      ...prev,
      sponsor_logos: prev.sponsor_logos.map((logo: SponsorLogo) => 
        logo.id === id ? { ...logo, ...updates } : logo
      )
    }));
  };

  const removeSponsorLogo = (id: string) => {
    setForm(prev => ({
      ...prev,
      sponsor_logos: prev.sponsor_logos.filter((logo: SponsorLogo) => logo.id !== id)
    }));
  };

  const moveSponsorLogo = (id: string, direction: 'up' | 'down') => {
    const currentIndex = form.sponsor_logos.findIndex((logo: SponsorLogo) => logo.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= form.sponsor_logos.length) return;

    const newLogos = [...form.sponsor_logos];
    [newLogos[currentIndex], newLogos[newIndex]] = [newLogos[newIndex], newLogos[currentIndex]];
    
    // Update order values
  newLogos.forEach((logo: SponsorLogo, index: number) => {
      logo.order = index + 1;
    });

    setForm(prev => ({ ...prev, sponsor_logos: newLogos }));
  };

  // Save only branding-related fields explicitly (no autosave)
  const saveBranding = async () => {
    try {
      if (savingBranding || savingPage) return;
      setSavingBranding(true);
      const steps = savingProgress.withSteps(3, 'Preparing…');
      steps.next('Validating');
      const clamp = (v: any, min: number, max: number) => (typeof v === 'number' && !isNaN(v) ? Math.min(max, Math.max(min, v)) : null);
      const brandingPayload: any = {
        brand_logo_url: (form as any).brand_logo_url || null,
        brand_year: typeof (form as any).brand_year === 'number' && !isNaN((form as any).brand_year) ? (form as any).brand_year : null,
        brand_logo_size_px: clamp((form as any).brand_logo_size_px, 16, 256),
        brand_logo_glow_strength: clamp((form as any).brand_logo_glow_strength, 0, 2),
        brand_logo_glow_color: ((form as any).brand_logo_glow_color || '').toString().trim() || null,
        brand_logo_side: ((form as any).brand_logo_side === 'right' ? 'right' : 'left') as any,
        brand_logo_offset_x_px: clamp((form as any).brand_logo_offset_x_px, -200, 200),
        brand_logo_offset_y_px: clamp((form as any).brand_logo_offset_y_px, -200, 200),
        brand_logo_offset_x_sm_px: (typeof (form as any).brand_logo_offset_x_sm_px === 'number' && !isNaN((form as any).brand_logo_offset_x_sm_px)) ? clamp((form as any).brand_logo_offset_x_sm_px, -400, 400) : null,
        brand_logo_offset_y_sm_px: (typeof (form as any).brand_logo_offset_y_sm_px === 'number' && !isNaN((form as any).brand_logo_offset_y_sm_px)) ? clamp((form as any).brand_logo_offset_y_sm_px, -400, 400) : null,
        brand_logo_offset_x_md_px: (typeof (form as any).brand_logo_offset_x_md_px === 'number' && !isNaN((form as any).brand_logo_offset_x_md_px)) ? clamp((form as any).brand_logo_offset_x_md_px, -400, 400) : null,
        brand_logo_offset_y_md_px: (typeof (form as any).brand_logo_offset_y_md_px === 'number' && !isNaN((form as any).brand_logo_offset_y_md_px)) ? clamp((form as any).brand_logo_offset_y_md_px, -400, 400) : null,
        brand_logo_offset_x_lg_px: (typeof (form as any).brand_logo_offset_x_lg_px === 'number' && !isNaN((form as any).brand_logo_offset_x_lg_px)) ? clamp((form as any).brand_logo_offset_x_lg_px, -400, 400) : null,
        brand_logo_offset_y_lg_px: (typeof (form as any).brand_logo_offset_y_lg_px === 'number' && !isNaN((form as any).brand_logo_offset_y_lg_px)) ? clamp((form as any).brand_logo_offset_y_lg_px, -400, 400) : null,
      };
      steps.next('Saving to database');
      await updateHomepageSettings(brandingPayload);
      setMessage({ type: 'success', text: 'Branding saved' });
      setTimeout(() => setMessage(null), 2000);
    } catch (e: any) {
      console.error('Save branding failed', e);
      setMessage({ type: 'error', text: e?.message || 'Failed to save branding' });
      setTimeout(() => setMessage(null), 5000);
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
    }));
  };

  return (
    <div className="space-y-6">
      {!SUPABASE_ENV_OK && (
        <div className="rounded-lg p-4 bg-yellow-50 border border-yellow-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <div className="font-semibold text-yellow-800">Supabase is not configured</div>
            <div className="text-sm text-yellow-700">
              Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local (for local) and in Netlify Env Vars (for deploy), then rebuild.
              {((import.meta as any)?.env?.VITE_DEBUG_SHOW_SUPABASE_HOST === '1') && (
                <> Current host: {String(SUPABASE_HOST)}</>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Homepage Management</h2>
          <p className="text-gray-600">Customize the hero section background and content</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection/Auth status chips */}
          {((import.meta as any)?.env?.VITE_DEBUG_SHOW_SUPABASE_HOST === '1') && (
            <div className={`hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full text-xs border ${SUPABASE_ENV_OK ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-yellow-200 bg-yellow-50 text-yellow-700'}`} title={`Supabase host: ${String(SUPABASE_HOST)}`}>
              <span className={`inline-block w-2 h-2 rounded-full ${SUPABASE_ENV_OK ? 'bg-emerald-500' : 'bg-yellow-500'}`}></span>
              <span>{SUPABASE_ENV_OK ? `Supabase: ${String(SUPABASE_HOST)}` : 'Supabase not configured'}</span>
            </div>
          )}
          <div className={`hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full text-xs border ${authLoading ? 'border-gray-200 bg-gray-50 text-gray-600' : isAuthenticated ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            <span className={`inline-block w-2 h-2 rounded-full ${authLoading ? 'bg-gray-400' : isAuthenticated ? 'bg-blue-500' : 'bg-red-500'}`}></span>
            <span>
              {authLoading ? 'Checking auth…' : isAuthenticated ? `Admin: ${user?.email ?? 'Signed in'}` : 'Not logged in'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 flex items-center transition-colors"
          >
            {isEditing ? (
              <>
                <X size={16} className="mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Edit Homepage
              </>
            )}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-lg p-4 flex items-center ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <Save className="w-5 h-5 text-green-500 mr-3" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
          )}
          <span className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {message.text}
          </span>
        </div>
      )}

      {/* Current Settings Display: compact read-only summary when NOT editing */}
      {!isEditing && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Homepage Settings</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hero Title</label>
            <div className="p-3 bg-gray-50 rounded-lg border">
              <span className="text-gray-900 font-semibold">{homepageSettings?.hero_title || form.hero_title || 'RICORRENZA'}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">Click <strong>Edit Homepage</strong> to modify the hero title, background and other settings.</p>
        </div>
      )}

      {/* Full editor — visible only while editing */}
      {isEditing && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Current Homepage Settings</h3>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Hero Content */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Title</label>
                <div className="relative">
                  <Type className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={form.hero_title}
                    onChange={(e) => setForm(prev => ({ ...prev, hero_title: e.target.value }))}
                    placeholder="RICORRENZA"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Main hero title shown prominently on the homepage</p>
              </div>
              
              {/* Branding */}
              <div className="space-y-6 mt-8">
                <h4 className="text-lg font-semibold text-gray-900">Branding</h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand Year</label>
                    <input
                      type="number"
                      min={2000}
                      max={2999}
                      value={(form.brand_year as any) ?? ''}
                      onChange={(e)=>{
                        const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                        setForm(prev=>({ ...prev, brand_year: val }));
                      }}
                      className="w-full border rounded px-3 py-2 text-gray-900"
                      placeholder={`${new Date().getFullYear()}`}
                    />
                    <p className="text-xs text-gray-500 mt-1">Draft only. Click “Save Branding” to apply.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand Logo (PNG preferred)</label>
                    <ImageUpload
                      onImageSelect={(url) => {
                        setForm(prev => ({ ...prev, brand_logo_url: url }));
                        setMessage({ type: 'success', text: 'Logo selected. Click Save Branding to apply.' });
                        setTimeout(() => setMessage(null), 2000);
                      }}
                      currentImage={form.brand_logo_url}
                      bucket="hero-media"
                      folder="brand"
                      acceptedTypes="image/png,image/webp,image/jpeg"
                      fileTypeLabel="PNG/JPG/WEBP up to 5MB (PNG preferred for transparency)"
                      enableCropper={false}
                      autoSave={true}
                    />
                    {form.brand_logo_url && (
                      <button
                        type="button"
                        className="mt-2 text-sm text-red-600"
                        onClick={()=>{
                          setForm(prev=>({ ...prev, brand_logo_url: '' }));
                          setMessage({ type: 'success', text: 'Removed from draft. Click Save Branding to apply.' });
                          setTimeout(() => setMessage(null), 2500);
                        }}
                      >
                        Remove logo
                      </button>
                    )}
                    <p className="text-xs text-gray-500 mt-1">We render it automatically with a soft neon 3D glow. Changes are draft until saved.</p>
                  </div>
                </div>
                {/* Size and Glow Controls */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo Size (px)</label>
                    <input
                      type="range"
                      min={16}
                      max={256}
                      step={1}
                      value={(form.brand_logo_size_px as any) ?? 36}
                      onChange={(e)=>{
                        const raw = parseInt(e.target.value, 10);
                        setForm(prev=>({ ...prev, brand_logo_size_px: raw }));
                      }}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>Controls the logo height in the navbar. Draft until saved.</span>
                      <span>{(form.brand_logo_size_px as any) ?? 36}px</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Glow Strength</label>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={(form.brand_logo_glow_strength as any) ?? 1}
                      onChange={(e)=>{
                        const raw = parseFloat(e.target.value);
                        setForm(prev=>({ ...prev, brand_logo_glow_strength: raw }));
                      }}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>0 = no glow, 1 = default, 2 = strong.</span>
                      <span>{(form.brand_logo_glow_strength as any) ?? 1}</span>
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Glow Color</label>
                    <input
                      type="color"
                      value={(form.brand_logo_glow_color as any) || '#ff00ff'}
                      onChange={(e)=>{
                        const val = e.target.value;
                        setForm(prev=>({ ...prev, brand_logo_glow_color: val }));
                      }}
                      className="w-16 h-10 p-0 border rounded"
                      title="Pick the glow color"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave as default for theme pink/cyan blend. Draft until saved.</p>
                  </div>
                </div>
                {/* Position Controls (base) */}
                <div className="grid md:grid-cols-3 gap-6 mt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo Side</label>
                    <select
                      value={(form.brand_logo_side as any) || 'left'}
                      onChange={(e)=>{
                        const val = (e.target.value === 'right' ? 'right' : 'left') as 'left'|'right';
                        setForm(prev=>({ ...prev, brand_logo_side: val }));
                      }}
                      className="w-full border rounded px-3 py-2 text-gray-900"
                    >
                      <option value="left">Left of text</option>
                      <option value="right">Right of text</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Offset X (px)</label>
                    <input
                      type="range"
                      min={-200}
                      max={200}
                      step={1}
                      value={(form.brand_logo_offset_x_px as any) ?? 0}
                      onChange={(e)=>{
                        const raw = parseInt(e.target.value, 10);
                        setForm(prev=>({ ...prev, brand_logo_offset_x_px: raw }));
                      }}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>Negative = left, Positive = right.</span>
                      <span>{(form.brand_logo_offset_x_px as any) ?? 0}px</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Offset Y (px)</label>
                    <input
                      type="range"
                      min={-200}
                      max={200}
                      step={1}
                      value={(form.brand_logo_offset_y_px as any) ?? 0}
                      onChange={(e)=>{
                        const raw = parseInt(e.target.value, 10);
                        setForm(prev=>({ ...prev, brand_logo_offset_y_px: raw }));
                      }}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>Negative = up, Positive = down.</span>
                      <span>{(form.brand_logo_offset_y_px as any) ?? 0}px</span>
                    </div>
                  </div>
                </div>
                {/* Responsive Overrides (optional) */}
                <div className="mt-4 p-3 rounded border border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-gray-700">Responsive Offsets (optional)</h5>
                    <span className="text-xs text-gray-500">Overrides base offsets at specific breakpoints</span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* sm */}
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">Small (sm &lt;768px)</div>
                      <label className="block text-xs text-gray-700 mb-1">X (px)</label>
                      <input type="number" value={form.brand_logo_offset_x_sm_px === '' ? '' : (form.brand_logo_offset_x_sm_px as any)} onChange={(e)=>{
                        const v = e.target.value === '' ? '' : parseInt(e.target.value,10);
                        setForm(p=>({ ...p, brand_logo_offset_x_sm_px: (e.target.value === '' ? '' : v) as any }));
                      }} className="w-full p-2 border rounded text-gray-900" />
                      <label className="block text-xs text-gray-700 mt-2 mb-1">Y (px)</label>
                      <input type="number" value={form.brand_logo_offset_y_sm_px === '' ? '' : (form.brand_logo_offset_y_sm_px as any)} onChange={(e)=>{
                        const v = e.target.value === '' ? '' : parseInt(e.target.value,10);
                        setForm(p=>({ ...p, brand_logo_offset_y_sm_px: (e.target.value === '' ? '' : v) as any }));
                      }} className="w-full p-2 border rounded text-gray-900" />
                    </div>
                    {/* md */}
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">Medium (md ≥768px)</div>
                      <label className="block text-xs text-gray-700 mb-1">X (px)</label>
                      <input type="number" value={form.brand_logo_offset_x_md_px === '' ? '' : (form.brand_logo_offset_x_md_px as any)} onChange={(e)=>{
                        const v = e.target.value === '' ? '' : parseInt(e.target.value,10);
                        setForm(p=>({ ...p, brand_logo_offset_x_md_px: (e.target.value === '' ? '' : v) as any }));
                      }} className="w-full p-2 border rounded text-gray-900" />
                      <label className="block text-xs text-gray-700 mt-2 mb-1">Y (px)</label>
                      <input type="number" value={form.brand_logo_offset_y_md_px === '' ? '' : (form.brand_logo_offset_y_md_px as any)} onChange={(e)=>{
                        const v = e.target.value === '' ? '' : parseInt(e.target.value,10);
                        setForm(p=>({ ...p, brand_logo_offset_y_md_px: (e.target.value === '' ? '' : v) as any }));
                      }} className="w-full p-2 border rounded text-gray-900" />
                    </div>
                    {/* lg */}
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">Large (lg ≥1024px)</div>
                      <label className="block text-xs text-gray-700 mb-1">X (px)</label>
                      <input type="number" value={form.brand_logo_offset_x_lg_px === '' ? '' : (form.brand_logo_offset_x_lg_px as any)} onChange={(e)=>{
                        const v = e.target.value === '' ? '' : parseInt(e.target.value,10);
                        setForm(p=>({ ...p, brand_logo_offset_x_lg_px: (e.target.value === '' ? '' : v) as any }));
                      }} className="w-full p-2 border rounded text-gray-900" />
                      <label className="block text-xs text-gray-700 mt-2 mb-1">Y (px)</label>
                      <input type="number" value={form.brand_logo_offset_y_lg_px === '' ? '' : (form.brand_logo_offset_y_lg_px as any)} onChange={(e)=>{
                        const v = e.target.value === '' ? '' : parseInt(e.target.value,10);
                        setForm(p=>({ ...p, brand_logo_offset_y_lg_px: (e.target.value === '' ? '' : v) as any }));
                      }} className="w-full p-2 border rounded text-gray-900" />
                    </div>
                  </div>
                  {/* Actions for branding saves */}
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={saveBranding}
                      disabled={savingBranding || savingPage}
                      className={`px-4 py-2 rounded text-white ${savingBranding || savingPage ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}
                    >
                      {savingBranding ? 'Saving…' : 'Save Branding'}
                    </button>
                    <button
                      type="button"
                      onClick={resetBrandingDraft}
                      disabled={savingBranding || savingPage}
                      className={`px-4 py-2 border rounded ${savingBranding || savingPage ? 'text-gray-400 bg-gray-50 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      Discard Changes
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Subtitle</label>
                <div className="relative">
                  <Type className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={form.hero_subtitle}
                    onChange={(e) => setForm(prev => ({ ...prev, hero_subtitle: e.target.value }))}
                    placeholder="Experience the Future"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Subtitle text below the main title</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Description</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={form.hero_description}
                    onChange={(e) => setForm(prev => ({ ...prev, hero_description: e.target.value }))}
                    placeholder="Experience the future of Healthcare, Technology, and Creativity"
                    rows={4}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Descriptive text below the subtitle</p>
              </div>
            </div>
          </div>

          {/* Carousel & Sections Settings */}
          <div className="space-y-6 lg:col-span-2">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Homepage Sections & Animation</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mt-3">Show Partners Belt</label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={form.featured_partners_enabled}
                    onChange={(e) => setForm(prev => ({ ...prev, featured_partners_enabled: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Enable “Our Partners” section</span>
                </label>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700">Partners Section Title</label>
                  <input
                    type="text"
                    value={form.sponsor_section_title || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, sponsor_section_title: e.target.value }))}
                    className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700">Partners Section Subtitle</label>
                  <input
                    type="text"
                    value={form.sponsor_section_subtitle || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, sponsor_section_subtitle: e.target.value }))}
                    className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                <label className="block text-sm font-medium text-gray-700">Leadership Carousel Speed (ms)</label>
                <input
                  type="number"
                  min={1000}
                  step={100}
                  value={form.leadership_carousel_speed_ms === '' ? '' : form.leadership_carousel_speed_ms}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm(prev => ({ ...prev, leadership_carousel_speed_ms: v === '' ? '' : parseInt(v, 10) }));
                  }}
                  onBlur={() => {
                    setForm(prev => {
                      const n = typeof prev.leadership_carousel_speed_ms === 'number' && !isNaN(prev.leadership_carousel_speed_ms)
                        ? Math.max(1000, prev.leadership_carousel_speed_ms)
                        : 2500;
                      return { ...prev, leadership_carousel_speed_ms: n };
                    });
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sponsors Belt Speed (px/sec)</label>
                    <input
                      type="number"
                      min={1}
                      max={800}
                      step={1}
                      value={form.sponsors_belt_speed_px_per_sec === '' ? '' : form.sponsors_belt_speed_px_per_sec}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm(prev => ({ ...prev, sponsors_belt_speed_px_per_sec: v === '' ? '' : parseInt(v, 10) }));
                      }}
                      onBlur={() => {
                        setForm(prev => {
                          const n = typeof prev.sponsors_belt_speed_px_per_sec === 'number' && !isNaN(prev.sponsors_belt_speed_px_per_sec)
                            ? Math.min(800, Math.max(1, prev.sponsors_belt_speed_px_per_sec))
                            : 140;
                          return { ...prev, sponsors_belt_speed_px_per_sec: n };
                        });
                      }}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <p className="text-xs text-gray-500 mt-1">Controls the scrolling speed of the Partners belt.</p>
                    <label className="block text-sm font-medium text-gray-700 mt-3">Sponsors Belt Direction</label>
                    <select
                      value={form.sponsors_belt_direction}
                      onChange={(e) => setForm(prev => ({ ...prev, sponsors_belt_direction: (e.target.value as 'left' | 'right') }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Committee Marquee Speed (px/sec)</label>
                    <input
                      type="number"
                      min={1}
                      max={800}
                      step={1}
                      value={form.committee_marquee_speed_px_per_sec === '' ? '' : form.committee_marquee_speed_px_per_sec}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm(prev => ({ ...prev, committee_marquee_speed_px_per_sec: v === '' ? '' : parseInt(v, 10) }));
                      }}
                      onBlur={() => {
                        setForm(prev => {
                          const n = typeof prev.committee_marquee_speed_px_per_sec === 'number' && !isNaN(prev.committee_marquee_speed_px_per_sec)
                            ? Math.min(800, Math.max(1, prev.committee_marquee_speed_px_per_sec))
                            : 75;
                          return { ...prev, committee_marquee_speed_px_per_sec: n };
                        });
                      }}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <p className="text-xs text-gray-500 mt-1">Controls the horizontal marquee speed of Committee Heads.</p>
                    <label className="block text-sm font-medium text-gray-700 mt-3">Committee Marquee Direction</label>
                    <select
                      value={form.committee_marquee_direction}
                      onChange={(e) => setForm(prev => ({ ...prev, committee_marquee_direction: (e.target.value as 'left' | 'right') }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={form.show_faculty_heads}
                      onChange={(e) => setForm(prev => ({ ...prev, show_faculty_heads: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Show Faculty Heads</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={form.show_committee_heads}
                      onChange={(e) => setForm(prev => ({ ...prev, show_committee_heads: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Show Committee Heads</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="space-y-6 lg:col-span-2">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h4>
            <div className="space-y-8 p-4 border rounded-lg bg-white">
              {/* Partners Belt Preview */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3">Partners Belt</h5>
                <div className="relative overflow-hidden rounded-md" style={{ background: '#0b0f1a' }}>
                  <div className="relative left-1/2 -translate-x-1/2 w-full">
                    <LogoLoop
                      logos={(sponsors || [])
                        .filter((s: any) => s.enabled)
                        .sort((a: any, b: any) => (a.order_position ?? 0) - (b.order_position ?? 0))
                        .map((s: any) => ({ src: s.logo, alt: s.name ?? '', href: s.website ?? undefined, title: s.name ?? undefined }))}
                      speed={Math.min(800, Math.max(1, Math.abs((form.sponsors_belt_speed_px_per_sec === '' ? 140 : form.sponsors_belt_speed_px_per_sec) as number)))}
                      direction={form.sponsors_belt_direction}
                      pauseOnHover={true}
                      pauseInstantOnHover={false}
                      smoothTauSec={0.6}
                      scaleOnHover={false}
                      fadeOut={true}
                      fadeOutColor="#0b0f1a"
                      glow={true}
                      cardRadius={24}
                      cardPaddingX={18}
                      cardPaddingY={0}
                      ariaLabel="Partners belt preview"
                      style={{
                        background: '#0b0f1a',
                        paddingTop: 8,
                        paddingBottom: 8,
                        isolation: 'isolate',
                        pointerEvents: 'auto',
                        ['--logoloop-logoHeight' as any]: 'clamp(60px, 12vw, 96px)',
                        ['--logoloop-gap' as any]: 'clamp(16px, 4vw, 28px)',
                        ['--ll-pulse-duration' as any]: '0s',
                        ['--ll-floor-opacity' as any]: 0,
                        ['--ll-floor-width' as any]: '66%',
                        ['--ll-glow-color' as any]: 'rgba(0,0,0,0)',
                        ['--ll-border-blur' as any]: '0em',
                        ['--ll-border-spread' as any]: '0em',
                        ['--ll-outer-blur' as any]: '0em',
                        ['--ll-outer-spread' as any]: '0em',
                        ['--ll-pulse-outer-blur' as any]: '0em',
                        ['--ll-pulse-outer-spread' as any]: '0em',
                        ['--ll-rim-alpha' as any]: 0,
                        ['--ll-glow-spread-color' as any]: 'rgba(0,0,0,0)',
                        ['--ll-glass-blur' as any]: '0px',
                        ['--ll-glass-saturate' as any]: '100%',
                        ['--ll-glass-sheen' as any]: 0,
                        ['--ll-hover-outer-color' as any]: 'rgba(255,255,255,0.6)',
                        ['--ll-hover-outer-blur' as any]: '0.75em',
                        ['--ll-hover-outer-spread' as any]: '0.18em',
                        ['--ll-card-scale-hover' as any]: 1.04,
                        ['--ll-depth-shadow-fn' as any]: '0 0 0 rgba(0,0,0,0)',
                        ['--ll-card-bg' as any]: '#000000',
                        ['--ll-card-border-w' as any]: '0px',
                        ['--ll-card-min-h' as any]: 'unset',
                        ['--ll-card-h' as any]: 'clamp(120px, 22vw, 176px)',
                        ['--ll-card-w' as any]: 'clamp(120px, 22vw, 176px)',
                        ['--ll-logo-h' as any]: 'auto',
                        ['--ll-logo-w' as any]: 'auto',
                        ['--ll-logo-fit' as any]: 'contain',
                        ['--ll-logo-max-h' as any]: 'calc(var(--ll-card-h) - 4px)',
                        ['--ll-logo-max-w' as any]: 'calc(var(--ll-card-w) - 4px)',
                        ['--ll-logo-radius' as any]: '8px',
                        ['--ll-logo-filter' as any]: 'none',
                        ['--ll-logo-filter-hover' as any]: 'none',
                        ['--logoloop-fadeWidth' as any]: 'clamp(8px, 3vw, 28px)'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Committee Heads Preview */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3">Committee Heads</h5>
                <div className="relative overflow-hidden rounded-md bg-gray-50 p-3">
                  <InfiniteMarquee
                    items={(coreTeamMembers || []).filter((m: any) => m.enabled && m.is_head)}
                    renderItem={(m: any) => (
                      <div className="flex items-center gap-3 bg-white/70 rounded-md px-3 py-2 shadow-sm">
                        {m.photo_url ? (
                          <img src={m.photo_url} alt={m.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300" />
                        )}
                        <div className="text-sm font-medium text-gray-800">{m.name}</div>
                      </div>
                    )}
                    speedPxPerSec={Math.min(800, Math.max(1, (form.committee_marquee_speed_px_per_sec === '' ? 75 : form.committee_marquee_speed_px_per_sec) as number))}
                    pauseOnHover={false}
                    paused={false}
                    direction={form.committee_marquee_direction}
                    itemWrapperClassName="px-4"
                    sideGutterPx={16}
                    className="py-2"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sponsor Logo Settings */}
          <div className="space-y-6 lg:col-span-2">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Sponsor Logos Settings</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <input
                  type="checkbox"
                  checked={form.sponsor_section_enabled}
                  onChange={(e) => setForm(prev => ({ ...prev, sponsor_section_enabled: e.target.checked }))}
                  className="mr-2"
                />
                Show sponsor logos section on homepage
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Toggle to display sponsor logos at the bottom of the hero section.
              </p>
            </div>

            {form.sponsor_section_enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsor Section Text
                  </label>
                  <div className="relative">
                    <Type className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={form.sponsor_section_text}
                      onChange={(e) => setForm(prev => ({ ...prev, sponsor_section_text: e.target.value }))}
                      placeholder="Powered by"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Text displayed above the sponsor logos (e.g., "Powered by", "Sponsored by").
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsor Logos
                  </label>
                  
                  <div className="space-y-4">
                    {form.sponsor_logos.map((logo: SponsorLogo, index: number) => (
                      <div key={logo.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-gray-900">Sponsor {index + 1}</h5>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => moveSponsorLogo(logo.id, 'up')}
                              disabled={index === 0}
                              className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSponsorLogo(logo.id, 'down')}
                              disabled={index === form.sponsor_logos.length - 1}
                              className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Move down"
                            >
                              <ArrowDown size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSponsorLogo(logo.id)}
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Remove sponsor"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Sponsor Name</label>
                              <input
                                type="text"
                                value={logo.name}
                                onChange={(e) => updateSponsorLogo(logo.id, { name: e.target.value })}
                                placeholder="Sponsor name"
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Website URL (Optional)</label>
                              <input
                                type="url"
                                value={logo.website || ''}
                                onChange={(e) => updateSponsorLogo(logo.id, { website: e.target.value })}
                                placeholder="https://sponsor-website.com"
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={logo.enabled}
                                onChange={(e) => updateSponsorLogo(logo.id, { enabled: e.target.checked })}
                                className="mr-2"
                              />
                              <label className="text-xs font-medium text-gray-700">
                                Show on homepage
                              </label>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Logo Image</label>
                            <ImageUpload
                              onImageSelect={(url) => updateSponsorLogo(logo.id, { logo_url: url })}
                              currentImage={logo.logo_url}
                              bucket="sponsor-logos"
                              folder="homepage-sponsors"
                              acceptedTypes="image/*"
                              fileTypeLabel="PNG, JPG, GIF up to 5MB"
                              className="h-24"
                            />
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleRemoveLogoBg(logo.id)}
                                disabled={!logo.logo_url || bgRemoveBusyId === logo.id}
                                className={`inline-flex items-center px-3 py-1.5 text-xs rounded-md border transition-colors ${
                                  !logo.logo_url || bgRemoveBusyId === logo.id
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-300'
                                }`}
                                title="Automatically remove black background and replace with transparent PNG"
                              >
                                <Wand2 size={14} className="mr-1" />
                                {bgRemoveBusyId === logo.id ? 'Removing…' : 'Remove BG (auto)'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={addSponsorLogo}
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center text-gray-600 hover:text-blue-600"
                    >
                      <Plus size={20} className="mr-2" />
                      Add Sponsor Logo
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Add multiple sponsor logos to display on the homepage. Recommended: transparent background, high resolution.
                  </p>
                  
                  {/* Preview of sponsor logos */}
                  {form.sponsor_logos.filter((logo: SponsorLogo) => logo.enabled && logo.logo_url).length > 0 && (
                    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                      <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-2">{form.sponsor_section_text}</p>
                        <div className="flex flex-wrap justify-center items-center gap-4">
                          {form.sponsor_logos
                            .filter((logo: SponsorLogo) => logo.enabled && logo.logo_url)
                            .sort((a: SponsorLogo, b: SponsorLogo) => a.order - b.order)
                            .map((logo: SponsorLogo) => (
                              <div key={logo.id} className="flex flex-col items-center">
                                <img
                                  src={sanitizeUrl(logo.logo_url)}
                                  alt={logo.name}
                                  className="h-8 opacity-80 mb-1"
                                />
                                {logo.website && (
                                  <ExternalLink size={12} className="text-gray-400" />
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Save/Cancel Buttons */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={savingPage}
              className={`px-6 py-2 flex items-center ${savingPage ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-800'}`}
            >
              <X size={16} className="mr-2" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={savingPage || savingBranding}
              className={`px-6 py-2 rounded-lg text-white flex items-center transition-colors ${savingPage || savingBranding ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}
            >
              <Save size={16} className="mr-2" />
              {savingPage ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Usage Instructions</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span><strong>Background Images:</strong> Use high-resolution images (1920x1080 or higher) for best quality</span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span><strong>Background Videos:</strong> Use MP4 format, keep file size under 50MB for faster loading</span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span><strong>Sponsor Logos:</strong> Use transparent background logos for best appearance on dark backgrounds</span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span><strong>Text Content:</strong> Keep titles concise and descriptions engaging for better user experience</span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span><strong>Preview:</strong> Changes will be visible on the homepage immediately after saving</span>
          </div>
        </div>
      </div>

      {/* Current Media Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Media Information</h3>
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-500 mb-1">
              {homepageSettings?.hero_media_type === 'video' ? 'Video' : 'Image'}
            </div>
            <div className="text-gray-600 text-sm">Current Media Type</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-500 mb-1">
              {homepageSettings?.hero_media_url ? 'Set' : 'Default'}
            </div>
            <div className="text-gray-600 text-sm">Background Status</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-500 mb-1">
              {homepageSettings?.sponsor_logos?.length || 0}
            </div>
            <div className="text-gray-600 text-sm">Total Sponsor Logos</div>
          </div>
        </div>
      </div>
    </div>
  );
};