import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

it.each([
  ['https://ricorrenza.fun/media/cinematic/ricorrenza-mobile-v2.mp4', {}],
  ['https://ricorrenza.fun/media/cinematic/ricorrenza-desktop-v2.mp4', { Range: 'bytes=0-2047' }],
  ['https://ricorrenza.fun/other-media', { Range: 'bytes=100-200' }],
])('leaves streaming/range delivery to the browser/CDN for %s', (url, headers) => {
  const handlers = new Map<string, (event: unknown) => void>(), caches = { match: vi.fn(), open: vi.fn() };
  runInNewContext(readFileSync(new URL('../public/service-worker.js', import.meta.url), 'utf8'), {
    self: { location: { origin: 'https://ricorrenza.fun' }, addEventListener: (name: string, listener: (event: unknown) => void) => handlers.set(name, listener) }, URL, caches,
  });
  const event = { request: new Request(url, { headers }), respondWith: vi.fn() };
  handlers.get('fetch')!(event);
  expect(event.respondWith).not.toHaveBeenCalled(); expect(caches.match).not.toHaveBeenCalled();
});
