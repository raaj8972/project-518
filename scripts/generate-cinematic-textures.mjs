/** Derive local relief from the existing stone albedo; no external downloads. */
import sharp from 'sharp';

const size = 512;
const { data: pixels, info } = await sharp('public/images/festival-natural-stone.webp')
  .resize(size, size).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const normal = Buffer.alloc(size * size * 3);
const sample = (x, y) => {
  const i = (((y + size) % size) * size + (x + size) % size) * info.channels;
  return (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 765;
};
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const dx = (sample(x - 1, y) - sample(x + 1, y)) * 2.5;
  const dy = (sample(x, y - 1) - sample(x, y + 1)) * 2.5;
  const length = Math.hypot(dx, dy, 1), i = (y * size + x) * 3;
  normal[i] = (dx / length * .5 + .5) * 255;
  normal[i + 1] = (dy / length * .5 + .5) * 255;
  normal[i + 2] = (.5 / length + .5) * 255;
}
await sharp(normal, { raw: { width: size, height: size, channels: 3 } })
  .png({ compressionLevel: 9 }).toFile('public/images/cinematic-stone-normal.png');
console.log('Generated public/images/cinematic-stone-normal.png');
