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
  const { homepageSettings, updateHomepageSettings, sponsors, coreTeamMembers, sanitizeUrl } = useData() as any;
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
    // Instagram Trailer
    instagram_trailer_url?: string;
    instagram_trailer_enabled?: boolean;
    instagram_trailer_title?: string;
    instagram_trailer_subtitle?: string;
    // Instagram Aftermovie
    instagram_aftermovie_url?: string;
    instagram_aftermovie_enabled?: boolean;
    instagram_aftermovie_title?: string;
    instagram_aftermovie_subtitle?: string;
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
      const steps = savingProgress.withSteps(5, 'Preparing…'); // Increased steps
      
      // Cleanup Logic
      steps.next('Checking for abandoned files');
      const { deleteFromStorageByPublicUrl } = await import('../../utils/uploadUtils');
      
      // 1. Hero Media Cleanup
      const oldHero = homepageSettings?.hero_media_url;
      const newHero = form.hero_media_url;
      if (oldHero && oldHero !== newHero && !oldHero.includes('instagram.com')) {
          // Assuming hero media is uploaded to 'hero-media' bucket (need to verify bucket if not obvious, but clean to try)
          // Actually hero media upload usually goes to 'hero-media'.
          await deleteFromStorageByPublicUrl(oldHero, 'hero-media');
      }

      // 2. Sponsor Logos Cleanup
      const oldLogos = (homepageSettings?.sponsor_logos as SponsorLogo[]) || [];
      const newLogos = form.sponsor_logos;
      const oldUrls = new Set(oldLogos.map(l => l.logo_url).filter(u => u));
      const newUrls = new Set(newLogos.map(l => l.logo_url).filter(u => u));
      
      // Find URLs in old but not in new
      for (const url of oldUrls) {
          if (!newUrls.has(url)) {
              console.log('Deleting abandoned sponsor logo:', url);
              await deleteFromStorageByPublicUrl(url, 'sponsor-logos');
          }
      }

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
        // Instagram Trailer
        instagram_trailer_url: (form.instagram_trailer_url || '').trim() || null,
        instagram_trailer_enabled: !!form.instagram_trailer_enabled,
        instagram_trailer_title: (form.instagram_trailer_title || '').trim() || 'OFFICIAL TRAILER',
        instagram_trailer_subtitle: (form.instagram_trailer_subtitle || '').trim() || 'Watch our official event trailer',
        // Instagram Aftermovie
        instagram_aftermovie_url: (form.instagram_aftermovie_url || '').trim() || null,
        instagram_aftermovie_enabled: !!form.instagram_aftermovie_enabled,
        instagram_aftermovie_title: (form.instagram_aftermovie_title || '').trim() || 'EVENT AFTERMOVIE',
        instagram_aftermovie_subtitle: (form.instagram_aftermovie_subtitle || '').trim() || 'Relive the best moments from our event',
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
      const steps = savingProgress.withSteps(4, 'Preparing…');
      
      // Cleanup abandoned brand logo
      steps.next('Checking files');
      const oldBrand = (homepageSettings as any)?.brand_logo_url;
      const newBrand = (form as any).brand_logo_url;
      if (oldBrand && oldBrand !== newBrand) {
         const { deleteFromStorageByPublicUrl } = await import('../../utils/uploadUtils');
         await deleteFromStorageByPublicUrl(oldBrand, 'hero-media');
      }

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
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-1.5 h-8 bg-gradient-to-b from-blue-400 to-indigo-600 rounded-full" />
            Homepage Design
          </h2>
          <p className="text-gray-400 mt-1">Control the hero visual, branding, and dynamic sections.</p>
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
            className={`
              px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2
              ${isEditing 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 hover:shadow-indigo-600/30'
              }
            `}
          >
            {isEditing ? (
              <>
                <X size={16} />
                Exit Editor
              </>
            ) : (
              <>
                <Save size={16} />
                Open Editor
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

      {!isEditing && (
        <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/5 mb-2">
            <Type className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Editor Mode Inactive</h3>
          <p className="text-gray-400 max-w-md">
            The homepage is currently displaying: <strong className="text-white">"{homepageSettings?.hero_title || form.hero_title || 'RICORRENZA'}"</strong>.
            <br/>Click "Open Editor" to modify content.
          </p>
        </div>
      )}

      {isEditing && (
        <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8">
          <h3 className="text-xl font-bold text-white mb-8 border-b border-white/5 pb-4">
            Editor Workspace
          </h3>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Hero Content */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Hero Title</label>
                <div className="relative group">
                  <Type className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="text"
                    value={form.hero_title}
                    onChange={(e) => setForm(prev => ({ ...prev, hero_title: e.target.value }))}
                    placeholder="RICORRENZA"
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-bold tracking-wide"
                  />
                </div>
              </div>
              
              {/* Branding */}
              <div className="space-y-6 mt-8 pt-8 border-t border-white/5">
                <h4 className="text-lg font-bold text-white">Event Branding</h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Brand Year</label>
                    <input
                      type="number"
                      min={2000}
                      max={2999}
                      value={(form.brand_year as any) ?? ''}
                      onChange={(e)=>{
                        const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                        setForm(prev=>({ ...prev, brand_year: val }));
                      }}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                      placeholder={`${new Date().getFullYear()}`}
                    />
                    <p className="text-xs text-gray-500 mt-1">Draft only. Click “Save Branding” to apply.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Brand Logo (PNG)</label>
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
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Logo Size (px)</label>
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
                      className="w-full accent-indigo-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1 font-mono">
                      <span>Height</span>
                      <span>{(form.brand_logo_size_px as any) ?? 36}px</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Glow Strength</label>
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
                      className="w-full accent-indigo-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1 font-mono">
                      <span>Intensity</span>
                      <span>{(form.brand_logo_glow_strength as any) ?? 1}</span>
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Glow Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={(form.brand_logo_glow_color as any) || '#ff00ff'}
                        onChange={(e)=>{
                          const val = e.target.value;
                          setForm(prev=>({ ...prev, brand_logo_glow_color: val }));
                        }}
                        className="w-12 h-12 p-0 border-0 rounded-lg overflow-hidden cursor-pointer"
                        title="Pick the glow color"
                      />
                      <span className="text-xs text-gray-500 max-w-[150px]">Default blends nicely with dark theme.</span>
                    </div>
                  </div>
                </div>
                {/* Position Controls (base) */}
                <div className="grid md:grid-cols-3 gap-6 mt-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Logo Side</label>
                    <select
                      value={(form.brand_logo_side as any) || 'left'}
                      onChange={(e)=>{
                        const val = (e.target.value === 'right' ? 'right' : 'left') as 'left'|'right';
                        setForm(prev=>({ ...prev, brand_logo_side: val }));
                      }}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 appearance-none"
                    >
                      <option value="left" className="bg-gray-900 text-white">Left of text</option>
                      <option value="right" className="bg-gray-900 text-white">Right of text</option>
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
                      className={`px-4 py-2 border border-white/10 rounded-lg text-sm font-medium ${savingBranding || savingPage ? 'text-gray-500 cursor-not-allowed' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                    >
                      Discard
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Hero Subtitle</label>
                <div className="relative group">
                  <Type className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="text"
                    value={form.hero_subtitle}
                    onChange={(e) => setForm(prev => ({ ...prev, hero_subtitle: e.target.value }))}
                    placeholder="Experience the Future"
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Hero Description</label>
                <div className="relative group">
                  <FileText className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                  <textarea
                    value={form.hero_description}
                    onChange={(e) => setForm(prev => ({ ...prev, hero_description: e.target.value }))}
                    placeholder="Experience the future of Healthcare, Technology, and Creativity"
                    rows={4}
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Instagram Trailer Section */}
              <div className="mt-8 p-6 rounded-xl border border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/10 transition-colors">
                <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 bg-pink-500/20 rounded-lg">
                    <svg className="w-5 h-5 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  Instagram Trailer
                </h4>
                
                <div className="space-y-6">
                  {/* Enable Toggle */}
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${form.instagram_trailer_enabled ? 'bg-pink-500' : 'bg-white/10'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${form.instagram_trailer_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <input
                      type="checkbox"
                      checked={form.instagram_trailer_enabled || false}
                      onChange={(e) => setForm(prev => ({ ...prev, instagram_trailer_enabled: e.target.checked }))}
                      className="hidden"
                    />
                    <span className="text-gray-300 group-hover:text-white transition-colors text-sm font-medium">Show Instagram Trailer</span>
                  </label>

                  {/* Instagram URL */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Instagram Reel/Post URL</label>
                    <input
                      type="url"
                      value={form.instagram_trailer_url || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, instagram_trailer_url: e.target.value }))}
                      placeholder="https://www.instagram.com/reel/ABC123/"
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all font-mono text-sm"
                    />
                  </div>

                  {/* Custom Title */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Section Title (Optional)</label>
                    <input
                      type="text"
                      value={form.instagram_trailer_title || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, instagram_trailer_title: e.target.value }))}
                      placeholder="OFFICIAL TRAILER"
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all"
                    />
                  </div>

                  {/* Custom Subtitle */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Section Subtitle (Optional)</label>
                    <input
                      type="text"
                      value={form.instagram_trailer_subtitle || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, instagram_trailer_subtitle: e.target.value }))}
                      placeholder="Watch our official event trailer"
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Instagram Aftermovie Section */}
              <div className="mt-8 p-6 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 transition-colors">
                <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  Instagram Aftermovie
                </h4>
                
                <div className="space-y-6">
                  {/* Enable Toggle */}
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${form.instagram_aftermovie_enabled ? 'bg-purple-500' : 'bg-white/10'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${form.instagram_aftermovie_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <input
                      type="checkbox"
                      checked={form.instagram_aftermovie_enabled || false}
                      onChange={(e) => setForm(prev => ({ ...prev, instagram_aftermovie_enabled: e.target.checked }))}
                      className="hidden"
                    />
                    <span className="text-gray-300 group-hover:text-white transition-colors text-sm font-medium">Show Instagram Aftermovie</span>
                  </label>

                  {/* Instagram URL */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Instagram Reel/Post URL</label>
                    <input
                      type="url"
                      value={form.instagram_aftermovie_url || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, instagram_aftermovie_url: e.target.value }))}
                      placeholder="https://www.instagram.com/reel/XYZ789/"
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-mono text-sm"
                    />
                  </div>

                  {/* Custom Title */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Section Title (Optional)</label>
                    <input
                      type="text"
                      value={form.instagram_aftermovie_title || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, instagram_aftermovie_title: e.target.value }))}
                      placeholder="EVENT AFTERMOVIE"
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                    />
                  </div>

                  {/* Custom Subtitle */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Section Subtitle (Optional)</label>
                    <input
                      type="text"
                      value={form.instagram_aftermovie_subtitle || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, instagram_aftermovie_subtitle: e.target.value }))}
                      placeholder="Relive the best moments from our event"
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Carousel & Sections Settings */}
          <div className="space-y-6 lg:col-span-2">
            <h4 className="text-lg font-bold text-white mb-4">Homepage Sections & Animation</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-6 p-6 rounded-2xl border border-white/5 bg-black/20">
                <div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${form.featured_partners_enabled ? 'bg-indigo-500' : 'bg-white/10'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${form.featured_partners_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <input
                      type="checkbox"
                      checked={form.featured_partners_enabled}
                      onChange={(e) => setForm(prev => ({ ...prev, featured_partners_enabled: e.target.checked }))}
                      className="hidden"
                    />
                    <span className="text-gray-300 group-hover:text-white transition-colors text-sm font-medium">Enable “Our Partners” section</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Partners Section Title</label>
                  <input
                    type="text"
                    value={form.sponsor_section_title || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, sponsor_section_title: e.target.value }))}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Partners Section Subtitle</label>
                  <input
                    type="text"
                    value={form.sponsor_section_subtitle || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, sponsor_section_subtitle: e.target.value }))}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
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
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
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
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
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
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
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
                        .map((s: any) => ({ 
                          src: (() => {
                            const sanitized = sanitizeUrl?.(s.logo) || s.logo;
                            return sanitized;
                          })(), 
                          alt: s.name ?? '', 
                          href: s.website ?? undefined, 
                          title: s.name ?? undefined 
                        }))}
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
                        {m.image ? (
                          <img
                            src={(() => {
                              const sanitized = sanitizeUrl?.(m.image) || m.image;
                              return sanitized;
                            })()}
                            alt={m.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
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
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
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
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Website URL (Optional)</label>
                              <input
                                type="url"
                                value={logo.website || ''}
                                onChange={(e) => updateSponsorLogo(logo.id, { website: e.target.value })}
                                placeholder="https://sponsor-website.com"
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
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
                                  src={(() => {
                                    const sanitized = sanitizeUrl?.(logo.logo_url) || logo.logo_url;
                                    return sanitized;
                                  })()}
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
                className={`px-6 py-3 rounded-xl font-bold transition-all ${savingPage ? 'text-gray-500 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={savingPage}
                className={`
                  px-8 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2
                  ${savingPage 
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5'
                  }
                `}
              >
                {savingPage ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Homepage
                  </>
                )}
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