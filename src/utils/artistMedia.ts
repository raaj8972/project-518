import type { ArtistSong, GuestArtist } from '../types/data';

/** Accept public media URLs and project assets, never executable schemes. */
export function artistMediaUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const url = value.trim();
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try { const parsed = new URL(url); return ['https:', 'http:'].includes(parsed.protocol) ? url : ''; }
  catch { return ''; }
}

export function artistYoutubeId(value: unknown): string | null {
  try {
    const url = new URL(String(value));
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
    let id = '';
    if (host === 'youtu.be') id = url.pathname.split('/')[1] || '';
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      id = url.searchParams.get('v') || (/^\/(embed|shorts|live)\//.test(url.pathname) ? url.pathname.split('/')[2] : '') || '';
    }
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function artistPhotos(artist: {image?: string | null; gallery_images?: string[] | null; card_media_url?: string | null; card_media_is_video?: boolean | null}): string[] {
  const gallery = Array.isArray(artist.gallery_images) ? artist.gallery_images.map(artistMediaUrl).filter(Boolean).slice(0, 3) : [];
  const poster=artist.card_media_is_video?'':artistMediaUrl(artist.card_media_url);
  return [...new Set(gallery.length ? gallery : [poster||artistMediaUrl(artist.image)].filter(Boolean))];
}

export function artistTime(value: number): string {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function getArtistKind(artist: Partial<GuestArtist>): 'artist' | 'band' | 'dj' {
  if (artist.artist_kind === 'band' || artist.artist_kind === 'dj' || artist.artist_kind === 'artist') return artist.artist_kind;
  const role = `${artist.title || ''} ${artist.specialty || ''}`;
  return /\bband\b|\bduo\b|\bgroup\b/i.test(role) ? 'band' : /\bdj\b/i.test(role) ? 'dj' : 'artist';
}

export function artistStageClips(artist: Partial<GuestArtist>): string[] {
  const clips = Array.isArray(artist.stage_clip_urls) ? artist.stage_clip_urls.map(artistMediaUrl).filter(Boolean).slice(0, 3) : [];
  const legacy = artist.card_media_is_video ? artistMediaUrl(artist.card_media_url) : '';
  return [...new Set(clips.length ? clips : legacy ? [legacy] : [])];
}

export function spotifyResource(value: unknown): {type: 'artist'|'album'|'playlist'|'track'; id: string; url: string; embedUrl: string} | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const source = value.trim().replace(/^spotify:(artist|album|playlist|track):([a-zA-Z0-9]{22})$/, 'https://open.spotify.com/$1/$2');
    const url = new URL(source);
    if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (/^intl-[a-z-]+$/.test(parts[0] || '')) parts.shift();
    if (parts[0] === 'embed') parts.shift();
    const [type, id] = parts;
    if (!['artist','album','playlist','track'].includes(type) || !/^[a-zA-Z0-9]{22}$/.test(id || '')) return null;
    return {type:type as 'artist'|'album'|'playlist'|'track',id,url:`https://open.spotify.com/${type}/${id}`,embedUrl:`https://open.spotify.com/embed/${type}/${id}`};
  } catch { return null; }
}

export function artistSongTarget(value: unknown): {provider: 'Spotify'|'YouTube'; url: string; embedUrl: string} | null {
  const spotify = spotifyResource(value);
  if (spotify) return {provider:'Spotify',url:spotify.url,embedUrl:spotify.embedUrl};
  const youtube = artistYoutubeId(value);
  return youtube ? {provider:'YouTube',url:`https://www.youtube.com/watch?v=${youtube}`,embedUrl:`https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0`} : null;
}

export function normalizeArtistSongs(value: unknown): ArtistSong[] {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && typeof item === 'object' && !Array.isArray(item)).map(item => ({title:typeof item.title === 'string' ? item.title.trim().slice(0,120) : '',url:artistSongTarget(item.url)?.url || ''})).filter(item => item.title && item.url).slice(0,12);
}
