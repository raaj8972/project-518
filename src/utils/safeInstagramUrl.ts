export function safeInstagramUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const path = url.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/);
    if (url.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(url.hostname) || url.username || url.password || url.port || !path) return null;
    return `https://www.instagram.com/${path[1]}/${path[2]}/`;
  } catch { return null; }
}
