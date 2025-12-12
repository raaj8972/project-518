#!/usr/bin/env node

/**
 * SEO Sitemap Generator
 * Automatically updates sitemap.xml with current date
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SITEMAP_PATH = join(process.cwd(), 'public', 'sitemap.xml');
const currentDate = new Date().toISOString();

// Read current sitemap
let sitemap = readFileSync(SITEMAP_PATH, 'utf-8');

// Update all lastmod tags to current date
sitemap = sitemap.replace(/<lastmod>.*?<\/lastmod>/g, `<lastmod>${currentDate}</lastmod>`);

// Write back
writeFileSync(SITEMAP_PATH, sitemap);

console.log('✅ Sitemap updated with current dates:', currentDate);
