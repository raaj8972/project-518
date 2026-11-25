// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BrochureDownload } from '../src/components/Sponsors/BrochureDownload';

let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
let originalCreate: typeof URL.createObjectURL, originalRevoke: typeof URL.revokeObjectURL;
let savedDownload: { filename: string; href: string } | null;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  originalCreate = URL.createObjectURL; originalRevoke = URL.revokeObjectURL; savedDownload = null;
  URL.createObjectURL = vi.fn(() => 'blob:brochure-fixture'); URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { savedDownload = { filename: this.download, href: this.href }; });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function mount(url = 'https://festival.example/guide.pdf') { await act(async () => root.render(<BrochureDownload url={url} year={2027} />)); }
async function click() { await act(async () => host.querySelector<HTMLButtonElement>('button')!.click()); }

it('downloads a PDF using the active edition in its filename and cleans up its object URL', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob(['%PDF-fixture'], { type: 'application/pdf' }) })));
  await mount(); await click();
  expect(savedDownload).toEqual({ filename: 'Ricorrenza-2027-Sponsorship.pdf', href: 'blob:brochure-fixture' });
  expect(fetch).toHaveBeenCalledWith('https://festival.example/guide.pdf', expect.objectContaining({ credentials: 'omit' }));
});

it('offers the saved PDF link when cross-origin downloading fails and supports retry', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('CORS')).mockResolvedValueOnce({ ok: true, blob: async () => new Blob(['%PDF']) }));
  await mount(); await click();
  expect(host.querySelector('[role="status"] a')?.getAttribute('href')).toBe('https://festival.example/guide.pdf');
  expect(host.querySelector<HTMLButtonElement>('button')!.disabled).toBe(false);
  await click(); expect(host.querySelector('[role="status"]')).toBeNull(); expect(savedDownload).not.toBeNull();
});

it('renders no download action for an unsafe or absent URL', async () => {
  vi.stubGlobal('fetch', vi.fn()); await mount('javascript:alert(1)');
  expect(host.querySelector('button')).toBeNull(); expect(fetch).not.toHaveBeenCalled();
});
