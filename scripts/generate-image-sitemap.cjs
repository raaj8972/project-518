#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SITE = 'https://ricorrenza.fun';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const OUT_FILE = path.join(PUBLIC_DIR, 'image-sitemap.xml');

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp', '.gif']);

function walkDir(dir) {
  const results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) {
      // skip node_modules or hidden dirs
      if (it.name === 'node_modules' || it.name.startsWith('.')) continue;
      results.push(...walkDir(full));
    } else if (it.isFile()) {
      const ext = path.extname(it.name).toLowerCase();
      if (IMAGE_EXTS.has(ext)) {
        results.push(full);
      }
    }
  }
  return results;
}

function toUrl(filePath) {
  const rel = path.relative(PUBLIC_DIR, filePath).split(path.sep).join('/');
  return `${SITE}/${rel}`;
}

function pageFor(filePath) {
  const rel = path.relative(PUBLIC_DIR, filePath).split(path.sep).join('/');
  // heuristics: images under storage/uploads => /gallery, icons & root images => /
  if (rel.startsWith('storage/uploads')) return `${SITE}/gallery`;
  // if image is under assets or img folders, assume root
  return `${SITE}/`;
}

function buildXml(groups) {
  const header = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  const urlsetOpen = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n\n`;
  const urlsetClose = `</urlset>\n`;

  let body = '';
  for (const [page, images] of Object.entries(groups)) {
    body += `  <url>\n    <loc>${page}</loc>\n\n`;
    for (const img of images) {
      body += `    <image:image>\n      <image:loc>${img}</image:loc>\n    </image:image>\n\n`;
    }
    body += `  </url>\n\n`;
  }

  return header + urlsetOpen + body + urlsetClose;
}

function main() {
  if (!fs.existsSync(PUBLIC_DIR)) {
    console.error('public directory not found at', PUBLIC_DIR);
    process.exit(1);
  }

  const images = walkDir(PUBLIC_DIR);
  const groups = {};
  for (const imgPath of images) {
    const imgUrl = toUrl(imgPath);
    const page = pageFor(imgPath);
    groups[page] = groups[page] || [];
    groups[page].push(imgUrl);
  }

  const xml = buildXml(groups);
  fs.writeFileSync(OUT_FILE, xml, 'utf8');
  console.log(`Wrote ${OUT_FILE} (${images.length} images, ${Object.keys(groups).length} pages)`);
}

main();
