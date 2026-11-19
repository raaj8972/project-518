// Only configured media providers may be contacted; every redirect is checked again.
const imageHosts = new Set(['images.pexels.com', 'images.unsplash.com', 'www.google.com', 'www.gstatic.com',
  'drive.google.com', 'lh3.googleusercontent.com', 'www.googleapis.com', 'api.qrserver.com', 'res.cloudinary.com']);
export function allowedMediaUrl(value: string): URL {
  const url = new URL(value);
  const hosts = new Set(imageHosts);
  for (const value of [process.env.SUPABASE_URL, process.env.VITE_SUPABASE_URL, process.env.R2_PUBLIC_DOMAIN,
    ...(process.env.IMAGE_PROXY_ALLOWED_HOSTS || '').split(',')]) {
    if (!value?.trim()) continue;
    try { hosts.add(new URL(value.includes('://') ? value : `https://${value.trim()}`).hostname); } catch { /* Ignore invalid configuration. */ }
  }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !hosts.has(url.hostname)
    || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/i.test(url.hostname)) throw new Error('Media host is not allowed');
  return url;
}

export async function fetchImage(value: string, maxBytes = 10 * 1024 * 1024) {
  let url = allowedMediaUrl(value);
  const signal = AbortSignal.timeout(12000);
  for (let hop = 0; hop <= 3; hop++) {
    const response = await fetch(url, { redirect: 'manual', signal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) throw new Error('Invalid media redirect');
      url = allowedMediaUrl(new URL(location, url).href);
      continue;
    }
    const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || '';
    if (!response.ok || !['image/jpeg','image/png','image/webp','image/gif','image/avif'].includes(type)
      || Number(response.headers.get('content-length') || 0) > maxBytes) {
      await response.body?.cancel();
      throw new Error('Unsupported or oversized image');
    }
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (!response.body) throw new Error('Empty image');
    const reader = response.body.getReader();
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error('Image too large'); }
      chunks.push(chunk.value);
    }
    return { buffer: Buffer.concat(chunks), contentType: type };
  }
  throw new Error('Too many media redirects');
}
