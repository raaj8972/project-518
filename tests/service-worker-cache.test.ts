import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

const script = readFileSync(new URL('../public/service-worker.js', import.meta.url), 'utf8');
function worker() {
  const handlers = new Map<string, (event: any) => void>();
  const cache = { put: vi.fn().mockResolvedValue(undefined), match: vi.fn().mockResolvedValue(new Response('<html>Current shell</html>')) };
  const caches = { match: vi.fn().mockResolvedValue(undefined), open: vi.fn().mockResolvedValue(cache), keys: vi.fn().mockResolvedValue([]), delete: vi.fn() };
  const fetch = vi.fn().mockImplementation(async () => new Response('Network asset'));
  const pending: Promise<unknown>[] = [];
  const self = { location: {origin:'https://ricorrenza.fun'}, clients: {claim:vi.fn()}, addEventListener: (name: string, listener: (event: any) => void) => handlers.set(name,listener) };
  runInNewContext(script, {self, caches, fetch, URL, Headers, Response, console:{log:vi.fn(),error:vi.fn()}, setTimeout:(callback:()=>void) => {callback();return 0;} });
  const settle = async () => { while (pending.length) await Promise.all(pending.splice(0)); };
  const request = async (path: string, options?: RequestInit) => {
    let response: Promise<Response> | undefined;
    const event = {request:new Request(`https://ricorrenza.fun${path}`,options), respondWith:(value:Promise<Response>)=>{response=value;}, waitUntil:(value:Promise<unknown>)=>pending.push(value)};
    handlers.get('fetch')!(event);
    const result = await response; await settle(); return result;
  };
  const activate = async () => {handlers.get('activate')!({waitUntil:(value:Promise<unknown>)=>pending.push(value)});await settle();};
  return {cache,caches,fetch,request,activate};
}

it.each(['/assets/App-aB12_cD3.js','/assets/index-A12b34Cd.css','/assets/geist-latin-wght-normal-DC_C43M5.woff2'])('serves an unchanged content-hashed asset with zero repeat network requests: %s', async path => {
  const sw=worker(), cached=new Response('Cached bytes');sw.caches.match.mockResolvedValue(cached);
  expect(await sw.request(path)).toBe(cached);expect(sw.fetch).not.toHaveBeenCalled();
});
it('still refreshes mutable image URLs in the background',async()=>{
  const sw=worker(), cached=new Response('Cached artwork');sw.caches.match.mockResolvedValue(cached);
  expect(await sw.request('/images/current-artwork.webp')).toBe(cached);
  expect(sw.fetch).toHaveBeenCalledOnce();expect(sw.cache.put).toHaveBeenCalledOnce();
});
it('fetches new hashed versions once and saves the exact downloaded response',async()=>{
  const sw=worker();const response=await sw.request('/assets/App-nEw12345.js');
  expect(await response!.text()).toBe('Network asset');expect(sw.fetch).toHaveBeenCalledOnce();
  expect(sw.cache.put).toHaveBeenCalledOnce();expect(await sw.cache.put.mock.calls[0][1].text()).toBe('Network asset');
});
it('keeps HTML network-first so a deployment can reference new chunks',async()=>{
  const sw=worker();sw.caches.match.mockResolvedValue(new Response('Old HTML'));
  expect(await (await sw.request('/',{headers:{accept:'text/html'}}))!.text()).toBe('Network asset');
  expect(sw.fetch).toHaveBeenCalledOnce();
});
it('warms offline SPA routes from the cached shell without downloading 15 copies',async()=>{
  const sw=worker();await sw.activate();expect(sw.fetch).not.toHaveBeenCalled();
  const routes=sw.cache.put.mock.calls.map(([route])=>route);
  expect(routes).toContain('/events');expect(routes).toContain('/security-dashboard');expect(routes).toHaveLength(15);
  const content=await Promise.all(sw.cache.put.mock.calls.map(([,response])=>response.text()));
  expect(new Set(content)).toEqual(new Set(['<html>Current shell</html>']));
});
