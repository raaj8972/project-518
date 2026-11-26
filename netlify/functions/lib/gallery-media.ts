import sharp from 'sharp';
import { fetchImage } from './media-fetch';
import { driveFileId } from '../../../shared/galleryMedia';

export async function fetchDriveImage(fileId: string, width = 1600) {
  if (!/^[\w-]{10,200}$/.test(fileId)) throw new Error('Invalid Drive image ID.');
  const candidates = [
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${width}`,
    `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w${width}`,
    ...(process.env.GOOGLE_API_KEY ? [`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${encodeURIComponent(process.env.GOOGLE_API_KEY)}`] : []),
  ];
  for (const url of candidates) {
    try {
      const result = await fetchImage(url, 24 * 1024 * 1024);
      // Decode before returning: a response header alone cannot prove an image is valid.
      await sharp(result.buffer, { limitInputPixels: 80_000_000 }).metadata();
      return result;
    } catch { /* A public thumbnail may fail while the same public file's API URL works. */ }
  }
  throw new Error('This Drive photo could not be downloaded. Check that it exists and is shared for public viewing, then retry.');
}
export async function fetchGalleryImage(source: string, width = 1600) {
  const id = driveFileId(source);
  return id ? fetchDriveImage(id, width) : fetchImage(source, 24 * 1024 * 1024);
}
export async function resizeGalleryImage(buffer: Buffer, width: number) {
  return sharp(buffer, { limitInputPixels: 80_000_000 }).rotate().resize({ width, height: width, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
}
