import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
const bytes = readFileSync(new URL('../public/media/cinematic/ricorrenza-mobile-v2.mp4', import.meta.url));
function boxes(start = 0, end = bytes.length): { type: string; body: number; end: number }[] {
  const result = [];
  for (let i = start; i + 8 <= end;) {
    let size = bytes.readUInt32BE(i), header = 8;
    if (size === 1) { size = Number(bytes.readBigUInt64BE(i + 8)); header = 16; }
    if (!size) size = end - i;
    if (size < header || i + size > end) throw new Error('Invalid MP4 box');
    result.push({ type: bytes.toString('ascii', i + 4, i + 8), body: i + header, end: i + size }); i += size;
  }
  return result;
}
function find(type: string, start = 0, end = bytes.length): ReturnType<typeof boxes>[number] | undefined {
  for (const box of boxes(start, end)) {
    if (box.type === type) return box;
    if (['moov', 'trak', 'mdia', 'minf', 'stbl'].includes(box.type)) { const nested = find(type, box.body, box.end); if (nested) return nested; }
  }
}
it('ships fast-start H.264 with frequent keyframes for responsive browser seeking', () => {
  const top = boxes().map(box => box.type);
  expect(top.indexOf('moov')).toBeLessThan(top.indexOf('mdat'));
  const description = find('stsd')!;
  expect(bytes.toString('ascii', description.body + 12, description.body + 16)).toBe('avc1');
  const sync = find('stss')!, count = bytes.readUInt32BE(sync.body + 4);
  const frames = Array.from({ length: count }, (_, i) => bytes.readUInt32BE(sync.body + 8 + i * 4));
  expect(frames[0]).toBe(1); expect(count).toBeGreaterThan(100);
  expect(Math.max(...frames.slice(1).map((frame, i) => frame - frames[i]))).toBeLessThanOrEqual(4);
  expect(bytes.readUInt32BE(find('stsz')!.body + 8)).toBe(427);
});
it('includes the original first-frame posters for both device clips', () => {
  for (const name of ['ricorrenza-start-v1.webp', 'ricorrenza-desktop-start-v1.webp']) {
    const image = readFileSync(new URL(`../public/media/cinematic/${name}`, import.meta.url));
    expect(image.toString('ascii', 0, 4)).toBe('RIFF'); expect(image.toString('ascii', 8, 12)).toBe('WEBP'); expect(image.length).toBeGreaterThan(10000);
  }
});
