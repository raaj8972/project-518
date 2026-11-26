import { expect, it, vi, afterEach } from 'vitest';
import { driveFileId, driveFolderId, galleryImageSources, galleryImageUrl } from '../shared/galleryMedia';
import { photoAlbums, validatePhoto, photoDraft } from '../src/components/admin/gallery/library';
afterEach(() => vi.unstubAllGlobals());
it('uses one resized proxy locally and in production, retains original IDs and rejects unsafe sources', () => {
 expect(galleryImageUrl('drive://drive-photo-12345', 640)).toBe('/api/drive-proxy?id=drive-photo-12345&width=640'); expect(driveFileId('https://drive.google.com/file/d/drive-photo-12345/view')).toBe('drive-photo-12345'); expect(galleryImageSources('drive://drive-photo-12345')).toHaveLength(3);
 expect(galleryImageUrl('javascript:alert(1)')).toBe(''); expect(galleryImageUrl('//evil.example/photo')).toBe(''); expect(driveFolderId('https://evil.example/folders/drive-photo-12345')).toBe(''); expect(driveFolderId('https://drive.google.com/drive/folders/drive-photo-12345')).toBe('drive-photo-12345');
});
it('keeps albums from different editions separate and validates new photo details', () => {
 const images = [{ id: 1, category: 'Cultural', subcategory: 'Stage', year: '2026' }, { id: 2, category: 'Cultural', subcategory: 'Stage', year: '2025' }] as any;
 expect(photoAlbums(images)).toHaveLength(2); expect(() => validatePhoto(photoDraft())).toThrow('title');
 expect(() => validatePhoto({ ...photoDraft(), title: 'Night', src: 'javascript:alert(1)' })).toThrow('valid image');
});
