export function driveFileId(source: string): string | null {
  const value = source?.trim() || '';
  if (value.startsWith('drive://')) return /^[\w-]{10,200}$/.test(value.slice(8)) ? value.slice(8) : null;
  try {
    const url = new URL(value, 'https://gallery.local');
    if (!['drive.google.com', 'lh3.googleusercontent.com', 'gallery.local'].includes(url.hostname)) return null;
    const id = url.pathname.match(/\/(?:file\/d|d)\/([\w-]+)/)?.[1] || url.searchParams.get('id');
    return id && /^[\w-]{10,200}$/.test(id) ? id : null;
  } catch { return null; }
}
export function galleryImageUrl(source: string, width = 800): string {
  const id = driveFileId(source);
  if (id) return `/api/drive-proxy?id=${encodeURIComponent(id)}&width=${Math.min(2400, Math.max(160, Math.round(width)))}`;
  const value = source?.trim() || '';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
export function galleryImageSources(source: string, width = 800): string[] {
  const first = galleryImageUrl(source, width);
  if (!first) return [];
  const id = driveFileId(source);
  return id ? [first, `${first}&refresh=1&mode=thumbnail`, `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w${width}`] : [first];
}
export function driveFolderId(value: string): string {
  const trimmed = value.trim();
  if (/^[\w-]{10,200}$/.test(trimmed)) return trimmed;
  try { const url = new URL(trimmed); const id = url.hostname === 'drive.google.com' ? url.pathname.match(/\/folders\/([\w-]+)/)?.[1] : null; return id && /^[\w-]{10,200}$/.test(id) ? id : ''; } catch { return ''; }
}
