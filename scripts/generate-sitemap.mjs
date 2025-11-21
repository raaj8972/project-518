#!/usr/bin/env node
/**
 * Simple sitemap generator: crawl same-origin links starting from base URL
 * Usage: node scripts/generate-sitemap.mjs --base https://example.com --out dist/sitemap.xml --max 1000
 */
import fs from 'fs/promises';
import { URL } from 'url';
import path from 'path';

const ARGS = process.argv.slice(2);
const opts = {};
for (let i = 0; i < ARGS.length; i++) {
  const a = ARGS[i];
  if (a === '--base' && ARGS[i+1]) opts.base = ARGS[++i];
  else if (a === '--out' && ARGS[i+1]) opts.out = ARGS[++i];
  else if (a === '--max' && ARGS[i+1]) opts.max = Number(ARGS[++i]);
  else if (a === '--help' || a === '-h') opts.help = true;
}

if (opts.help || !opts.base) {
  console.log('Usage: node scripts/generate-sitemap.mjs --base https://example.com [--out dist/sitemap.xml] [--max 1000]');
  process.exit(opts.help ? 0 : 1);
}

const BASE = opts.base.replace(/\/$/, '');
const OUT = opts.out || 'dist/sitemap.xml';
const MAX = opts.max || 5000;

const visited = new Set();
const toVisit = [BASE];
const found = new Set();

const isHtml = (headers) => {
  const ct = headers.get('content-type') || '';
  return ct.includes('text/html') || ct.includes('application/xhtml+xml');
};

const shouldSkipUrl = (u) => {
  // Only same origin
  try {
    const url = new URL(u);
    const base = new URL(BASE);
    if (url.origin !== base.origin) return true;
    // skip asset file extensions
    if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|avif|css|js|ico|pdf|zip)$/i)) return true;
    return false;
  } catch {
    return true;
  }
};

async function fetchHtml(u) {
  try {
    const res = await fetch(u, { redirect: 'follow' });
    if (!res.ok) return null;
    if (!isHtml(res.headers)) return null;
    const text = await res.text();
    return text;
  } catch (e) {
    return null;
  }
}

function extractLinks(html, baseUrl) {
  const links = new Set();
  // crude href extraction
  const hrefRe = /href\s*=\s*"([^"]+)"/ig;
  let m;
  while ((m = hrefRe.exec(html)) !== null) {
    try {
      const u = new URL(m[1], baseUrl).toString();
      links.add(u.split('#')[0]);
    } catch {}
  }
  // also look for src attributes that may be HTML anchors
  const srcRe = /src\s*=\s*"([^"]+)"/ig;
  while ((m = srcRe.exec(html)) !== null) {
    try {
      const u = new URL(m[1], baseUrl).toString();
      links.add(u.split('#')[0]);
    } catch {}
  }
  return Array.from(links);
}

async function crawl() {
  while (toVisit.length && found.size < MAX) {
    const url = toVisit.shift();
    if (!url) break;
    if (visited.has(url)) continue;
    visited.add(url);
    if (shouldSkipUrl(url)) continue;
    const html = await fetchHtml(url);
    if (html === null) continue;
    found.add(url);
    const links = extractLinks(html, url);
    for (const l of links) {
      if (!visited.has(l) && !toVisit.includes(l) && !shouldSkipUrl(l)) {
        toVisit.push(l);
      }
    }
  }
}

function buildSitemap(urls) {
  const now = new Date().toISOString();
  const items = Array.from(urls).map(u => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${now}</lastmod>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;
}

(async () => {
  console.log(`Crawling ${BASE} ...`);
  await crawl();
  console.log(`Found ${found.size} HTML pages`);
  if (found.size === 0) {
    console.error('No pages found — aborting');
    process.exit(1);
  }
  const sitemap = buildSitemap(found);
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, sitemap, 'utf8');
  console.log(`Wrote sitemap to ${OUT}`);
})();
