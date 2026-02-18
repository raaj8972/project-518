import { supabase } from '../lib/supabase';
import { 
  GalleryImage, Sponsor, FacultyHead, CoreTeamMember, BandMember, GuestArtist, 
  Event, SponsorshipSettings, HeroMedia 
} from '../types/data';

/**
 * Normalize a storage/public URL for reliable equality checks
 */
export const normalizeStorageUrl = (raw?: string | null): string => {
  if (!raw) return '';
  try {
    let url = String(raw).trim();
    if (!url) return '';
    // Strip query/hash (signed URLs etc.)
    url = url.split('?')[0].split('#')[0];
    // Remove accidental double slashes (except protocol)
    url = url.replace(/([^:])\/\/+/, '$1/');
    return url;
  } catch {
    return '';
  }
};

/**
 * Compare two storage URLs for equality
 */
export const urlsEqual = (a?: string | null, b?: string | null) => normalizeStorageUrl(a) === normalizeStorageUrl(b);

/**
 * Scan current client-side cache to see if a URL is still referenced anywhere else
 */
export const isUrlReferencedSomewhere = (
  target: string | null | undefined, 
  cache: {
    galleryImages: GalleryImage[];
    sponsors: Sponsor[];
    facultyHeads: FacultyHead[];
    coreTeamMembers: CoreTeamMember[];
    bandMembers: BandMember[];
    guestArtists: GuestArtist[];
    events: Event[];
    eventWinners: any[];
    homepageSettings: any | null;
    sponsorshipSettings: SponsorshipSettings | null;
    heroMedia: Record<string, HeroMedia | null>;
  },
  opts?: { table?: string; id?: number | string | null }
) => {
  const t = normalizeStorageUrl(target);
  if (!t) return false;
  const skip = (table: string, id: any) => opts && opts.table === table && opts.id === id;

  // gallery_images.src
  if (cache.galleryImages) {
    for (const g of cache.galleryImages) {
      if (skip('gallery_images', g.id)) continue;
      if (normalizeStorageUrl((g as any).src) === t) return true;
    }
  }
  // sponsors.logo
  if (cache.sponsors) {
    for (const s of cache.sponsors) {
      if (skip('sponsors', s.id)) continue;
      if (normalizeStorageUrl((s as any).logo) === t) return true;
    }
  }
  // faculty_heads.image
  if (cache.facultyHeads) {
    for (const f of cache.facultyHeads) {
      if (skip('faculty_heads', f.id)) continue;
      if (normalizeStorageUrl((f as any).image) === t || normalizeStorageUrl((f as any).image_url) === t) return true;
    }
  }
  // core_team_members.image
  if (cache.coreTeamMembers) {
    for (const m of cache.coreTeamMembers) {
      if (skip('core_team_members', m.id)) continue;
      if (normalizeStorageUrl((m as any).image) === t) return true;
    }
  }
  // band_members.image
  if (cache.bandMembers) {
    for (const b of cache.bandMembers) {
      if (skip('band_members', b.id)) continue;
      if (normalizeStorageUrl((b as any).image) === t) return true;
    }
  }
  // guest_artists.image
  if (cache.guestArtists) {
    for (const a of cache.guestArtists) {
      if (skip('guest_artists', a.id)) continue;
      const u1 = normalizeStorageUrl((a as any).image);
      const u2 = normalizeStorageUrl((a as any).image_url);
      const u3 = normalizeStorageUrl((a as any).photo_url);
      const uv = normalizeStorageUrl((a as any).video_url);
      if (u1 === t || u2 === t || u3 === t || uv === t) return true;
    }
  }
  // events.image
  if (cache.events) {
    for (const e of cache.events) {
      if (skip('events', e.id)) continue;
      if (normalizeStorageUrl((e as any).image) === t || normalizeStorageUrl((e as any).motion_poster_url) === t) return true;
    }
  }
  // event_winners.photo_url
  if (cache.eventWinners) {
    if (cache.eventWinners.some((w: any) => !skip('event_winners', w.id) && normalizeStorageUrl(w.photo_url) === t)) return true;
  }

  // homepage_settings
  if (cache.homepageSettings) {
    if (normalizeStorageUrl(cache.homepageSettings.hero_media_url) === t) return true;
    if (normalizeStorageUrl(cache.homepageSettings.brand_logo_url) === t) return true;
    const logos: any[] = cache.homepageSettings.sponsor_logos || [];
    for (const L of logos) {
      if (normalizeStorageUrl(L?.logo_url) === t) return true;
    }
  }
  // sponsorship_settings
  if (cache.sponsorshipSettings) {
    if (normalizeStorageUrl(cache.sponsorshipSettings.brochure_url) === t) return true;
  }
  // hero_media
  if (cache.heroMedia) {
    for (const key of Object.keys(cache.heroMedia)) {
      const row = cache.heroMedia[key];
      if (!row) continue;
      if (normalizeStorageUrl(row.image_url) === t || normalizeStorageUrl(row.video_url) === t) return true;
    }
  }
  return false;
};

const KNOWN_BUCKETS = [
  'registration-photos','gallery-images','sponsor-logos','team-images','band-images','guest-artist-images','faculty-images','event-images',
  'artists','members','uploads','hero-media','hero-videos','hero-video','guest-artist-videos','pdf','documents'
];

/**
 * Delete a file from Supabase or R2 Storage when given a public URL
 */
export const deleteStorageFileByPublicUrl = async (raw?: string | null) => {
  if (!raw) return;
  try {
    let url = raw.trim();
    if (!url) return;
    url = url.split('?')[0].split('#')[0];

    // R2 Deletion Handler
    const r2Folders = ['gallery', 'events', 'sponsors', 'team', 'faculty', 'guests', 'videos', 'audio', 'band', 'hero', 'documents', 'registrations', 'sports', 'pdf'];
    const isR2Folder = r2Folders.some(f => url.includes(`/${f}/`));
    
    if (!url.includes('/storage/v1/object/public/') && (isR2Folder || url.includes('r2.dev') || url.includes('cloudflarestorage'))) {
      try {
         const { deleteFromR2 } = await import('./r2Utils');
         await deleteFromR2(url);
         return;
      } catch (e) {
         console.warn('Failed to delete R2 file:', e);
      }
    }

    let bucket: string | null = null;
    let path: string | null = null;
    const fullMatch = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (fullMatch) {
      bucket = fullMatch[1];
      path = decodeURIComponent(fullMatch[2]);
    } else {
      const rel = url.replace(/^\/*/, '');
      const firstSlash = rel.indexOf('/');
      if (firstSlash > 0) {
        const maybeBucket = rel.substring(0, firstSlash);
          if (KNOWN_BUCKETS.includes(maybeBucket)) {
            bucket = maybeBucket;
            path = rel.substring(firstSlash + 1);
          }
      }
    }
    if (!bucket || !path || !KNOWN_BUCKETS.includes(bucket)) return;
    
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      console.warn('[Storage] Failed to remove object', bucket, path, error.message);
    }
  } catch (e) {
    console.warn('[Storage] Unexpected error parsing/removing file', e);
  }
};
