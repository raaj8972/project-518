#!/usr/bin/env node
/*
Usage:
  node scripts/list-images.mjs [--dir <path>] [--base <baseUrl>] [--out <file>]

Examples:
  # list images under dist
  node scripts/list-images.mjs --dir dist

  # list images under dist and print full URLs for Netlify site
  node scripts/list-images.mjs --dir dist --base https://your-site.netlify.app

  # write results to file
  node scripts/list-images.mjs --dir dist --base https://your-site.netlify.app --out images.txt

This script recursively searches the given directory for common image extensions and prints one path per line.
If --base is provided, each path is prefixed by the base URL to create absolute URLs.
*/

import fs from 'fs/promises';
import path from 'path';

const ARGS = process.argv.slice(2);
const opts = {};
for (let i = 0; i < ARGS.length; i++) {
  const a = ARGS[i];
  if (a === '--dir' && ARGS[i+1]) { opts.dir = ARGS[++i]; }
  else if (a === '--base' && ARGS[i+1]) { opts.base = ARGS[++i]; }
  else if (a === '--out' && ARGS[i+1]) { opts.out = ARGS[++i]; }
  else if (a === '--help' || a === '-h') { opts.help = true; }
}

if (opts.help) {
  console.log('Usage: node scripts/list-images.mjs [--dir <path>] [--base <baseUrl>] [--out <file>]');
  process.exit(0);
}

const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      const sub = await walk(full);
      results.push(...sub);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (extensions.includes(ext)) results.push(full);
    }
  }
  return results;
}

async function main() {
  const dirs = opts.dir ? [opts.dir] : ['dist', 'public'];
  const found = [];
  for (const d of dirs) {
    try {
      const stat = await fs.stat(d);
      if (!stat.isDirectory()) continue;
    } catch (e) {
      // skip missing dirs
      continue;
    }
    const list = await walk(d);
    for (const f of list) {
      // normalize to posix-style forward slashes for URLs
      const rel = path.posix.join(...path.relative(process.cwd(), f).split(path.sep));
      found.push(rel);
    }
  }

  const lines = opts.base
    ? found.map(p => `${opts.base.replace(/\/+$/, '')}/${p.replace(/^\/+/, '')}`)
    : found;

  if (opts.out) {
    await fs.writeFile(opts.out, lines.join('\n'));
    console.log(`Wrote ${lines.length} entries to ${opts.out}`);
  } else {
    for (const l of lines) console.log(l);
    console.log(`\nTotal: ${lines.length}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
