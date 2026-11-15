import { recordValue, repairDraftShape, finiteValue } from '../../../utils/studioData';
import { readHomepagePartners, type HomepagePartner } from '../../../utils/homepageContent';
import type { Dispatch, SetStateAction } from 'react';
import type { HomepageSettings } from '../../../types/data';

export type HomepageDraft = {
  sponsor_logos: HomepagePartner[];
  roadmap_enabled?: boolean;
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


export type HomepageDraftSetter = Dispatch<SetStateAction<HomepageDraft>>;
export type HomepageSection = 'media' | 'content' | 'branding' | 'automatic' | 'films' | 'people' | 'partners' | 'about' | 'social' | 'roadmap';

function homepageDefaults(homepageSettings?: Partial<HomepageSettings> | null): HomepageDraft {
  return {
    sponsor_logos: readHomepagePartners(homepageSettings?.sponsor_logos),
    ...(typeof homepageSettings?.roadmap_enabled === 'boolean' ? { roadmap_enabled: homepageSettings.roadmap_enabled } : {}),
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
    sponsor_section_title: (homepageSettings as any)?.sponsor_section_title || 'OUR PARTNERS',
    sponsor_section_subtitle: (homepageSettings as any)?.sponsor_section_subtitle || 'Powered by industry leaders who believe in our vision',
    featured_partners_enabled: homepageSettings?.featured_partners_enabled ?? true,
    show_faculty_heads: homepageSettings?.show_faculty_heads ?? true,
    show_committee_heads: homepageSettings?.show_committee_heads ?? true,
    leadership_carousel_speed_ms: homepageSettings?.leadership_carousel_speed_ms ?? 2500,
    sponsors_belt_speed_px_per_sec: Math.min(60, Math.max(20, Number((homepageSettings as any)?.sponsors_belt_speed_px_per_sec) || 44)),
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
  };
}

export function normalizeHomepageDraft(value: unknown, baseline: HomepageDraft): HomepageDraft {
  const row = recordValue(value);
  const result = repairDraftShape(row, baseline);
  const numericFields = ['brand_year','brand_logo_size_px','brand_logo_glow_strength','brand_logo_offset_x_px','brand_logo_offset_y_px','brand_logo_offset_x_sm_px','brand_logo_offset_y_sm_px','brand_logo_offset_x_md_px','brand_logo_offset_y_md_px','brand_logo_offset_x_lg_px','brand_logo_offset_y_lg_px','leadership_carousel_speed_ms','sponsors_belt_speed_px_per_sec','committee_marquee_speed_px_per_sec'] as const;
  for (const key of numericFields) {
    const candidate = row[key];
    result[key] = candidate === '' ? '' : finiteValue(candidate, typeof baseline[key] === 'number' ? baseline[key] : NaN);
    if (typeof result[key] === 'number' && !Number.isFinite(result[key])) result[key] = baseline[key] ?? '';
  }
  for (const key of ['brand_logo_side','sponsors_belt_direction','committee_marquee_direction'] as const) result[key] = row[key] === 'left' || row[key] === 'right' ? row[key] : baseline[key] ?? 'left';
  result.sponsor_logos = Array.isArray(row.sponsor_logos) ? readHomepagePartners(row.sponsor_logos) : baseline.sponsor_logos;
  return result;
}
export function makeHomepageDraft(source?: Partial<HomepageSettings> | null): HomepageDraft {
  const defaults = homepageDefaults(null);
  if (typeof source?.roadmap_enabled === 'boolean') defaults.roadmap_enabled = source.roadmap_enabled;
  return normalizeHomepageDraft(source, defaults);
}

export function serializeHomepageDraft(form: HomepageDraft) {
  const toNum = (v: unknown) => { const number = finiteValue(v, NaN); return Number.isFinite(number) ? Math.trunc(number) : null; };
  const toFloat = (v: unknown) => { const number = finiteValue(v, NaN); return Number.isFinite(number) ? number : null; };
  const toStr = (v: any) => (v === '' || v === null || v === undefined) ? null : String(v);

  return {
    ...(typeof form.roadmap_enabled === 'boolean' ? { roadmap_enabled: form.roadmap_enabled } : {}),
    hero_title: form.hero_title,
    hero_subtitle: form.hero_subtitle,
    hero_description: form.hero_description,
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
    sponsor_section_title: toStr(form.sponsor_section_title),
    sponsor_section_subtitle: toStr(form.sponsor_section_subtitle),
    show_faculty_heads: !!form.show_faculty_heads,
    show_committee_heads: !!form.show_committee_heads,
    leadership_carousel_speed_ms: toNum(form.leadership_carousel_speed_ms) ?? 2500,
    sponsors_belt_speed_px_per_sec: Math.min(60, Math.max(20, toNum(form.sponsors_belt_speed_px_per_sec) ?? 44)),
    committee_marquee_speed_px_per_sec: toNum(form.committee_marquee_speed_px_per_sec) ?? 75,
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

}

export function hasHomepageChanges(form: HomepageDraft, baseline: HomepageDraft) {
  return JSON.stringify(serializeHomepageDraft(form)) !== JSON.stringify(serializeHomepageDraft(baseline));
}
