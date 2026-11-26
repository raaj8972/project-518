import type { GalleryImage } from '../../../types/data';
import { driveFileId, galleryImageUrl } from '../../../../shared/galleryMedia';
export type PhotoDraft = { title: string; src: string; category: string; subcategory: string; year: string; featured: boolean };
export type PhotoAlbum = { key: string; name: string; category: string; year: string; images: GalleryImage[] };
export function photoDraft(image?: GalleryImage, year = '2026'): PhotoDraft { return { title: image?.title || '', src: image?.src || '', category: image?.category || 'Cultural', subcategory: image?.subcategory || '', year: image?.year || year, featured: image?.featured || false }; }
export function validatePhoto(draft: PhotoDraft): PhotoDraft {
  if (!draft.title.trim()) throw new Error('Give this photo a title.');
  if (!galleryImageUrl(draft.src)) throw new Error('Upload a photo or enter a valid image URL.');
  if (!/^\d{4}$/.test(draft.year) || Number(draft.year) < 1900 || Number(draft.year) > 2200) throw new Error('Enter a valid four-digit festival year.');
  if (!draft.category.trim()) throw new Error('Choose a category.');
  return { ...draft, title: draft.title.trim(), src: draft.src.trim(), category: draft.category.trim(), subcategory: draft.subcategory.trim() };
}
export function photoAlbums(images: GalleryImage[]): PhotoAlbum[] {
  const groups = new Map<string, PhotoAlbum>();
  images.forEach(image => { const name = image.subcategory?.trim() || image.category || 'Unsorted'; const key = JSON.stringify([image.category, name, image.year]); const album = groups.get(key) || { key, name, category: image.category, year: image.year, images: [] }; album.images.push(image); groups.set(key, album); });
  return [...groups.values()].sort((a, b) => b.year.localeCompare(a.year) || a.name.localeCompare(b.name));
}
export const photoSource = (image: GalleryImage) => driveFileId(image.src) ? 'Google Drive' : image.src.includes('supabase') ? 'Supabase' : 'Uploaded / linked';
