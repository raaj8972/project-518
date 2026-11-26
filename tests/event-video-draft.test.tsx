// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { VideoUpload } from '../src/components/VideoUpload';
const mocks = vi.hoisted(() => ({ options: null as any, remove: vi.fn(), upload: vi.fn(), select: vi.fn() }));
vi.mock('../src/hooks/useMediaUpload', () => ({ useMediaUpload: (options: any) => { mocks.options = options; return { uploading: false, uploadPercent: 0, error: '', setError: vi.fn(), handleUploadProcess: mocks.upload, deleteFromStorageByPublicUrl: mocks.remove, resetUploadState: vi.fn() }; } }));
vi.mock('../src/components/VideoTrimmer', () => ({ VideoTrimmer: () => null }));
let host: HTMLDivElement, root: Root;
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; vi.useFakeTimers(); mocks.remove.mockClear(); mocks.upload.mockClear(); mocks.select.mockClear(); host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); });
const click = async (text: string) => { const target = [...host.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.trim() === text)!; expect(target, text).toBeTruthy(); await act(async () => target.click()); };
it('removes an event video from the draft without deleting the published file', async () => {
  await act(async () => root.render(<VideoUpload bucket="event-videos" currentVideo="https://files.example/published.mp4" onVideoSelect={mocks.select} preserveExistingMedia />));
  expect(mocks.options.preserveExistingMedia).toBe(true);
  await click('Delete'); expect(host.textContent).toContain('Remove video from draft?');
  await act(async () => vi.advanceTimersByTime(2100)); await click('OK');
  expect(mocks.remove).not.toHaveBeenCalled(); expect(mocks.select).toHaveBeenCalledExactlyOnceWith('');
});
it('keeps legacy upload deletion behaviour opt-in compatible for other video editors', async () => {
  await act(async () => root.render(<VideoUpload bucket="videos" currentVideo="https://files.example/legacy.mp4" onVideoSelect={mocks.select} />));
  await click('Delete'); expect(host.textContent).toContain('Delete this video?');
  await act(async () => vi.advanceTimersByTime(2100)); await click('OK');
  expect(mocks.remove).toHaveBeenCalledExactlyOnceWith('https://files.example/legacy.mp4');
});
