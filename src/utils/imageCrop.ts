export interface PixelCrop { x: number; y: number; width: number; height: number; }
export type ProfileCropKind = 'head' | 'council' | 'member' | 'faculty';
export const PROFILE_CROP_ASPECTS = { faculty: 4 / 5, head: 48 / 55, council: 5 / 6, member: 1 } as const;

/** Used by both the live preview and the saved image, including rotation. */
export function drawImageCrop(image: HTMLImageElement, crop: PixelCrop, rotation: number, maxDimension = 1200) {
  if (!crop || crop.width <= 0 || crop.height <= 0) throw new Error('Select an image crop first.');
  const radians = rotation * Math.PI / 180;
  const width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
  const rotated = document.createElement('canvas');
  rotated.width = Math.ceil(Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height));
  rotated.height = Math.ceil(Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height));
  const context = rotated.getContext('2d');
  if (!context) throw new Error('Image preview is unavailable.');
  context.translate(rotated.width / 2, rotated.height / 2); context.rotate(radians);
  context.drawImage(image, -width / 2, -height / 2);
  const output = document.createElement('canvas');
  const scale = Math.min(1, maxDimension / Math.max(crop.width, crop.height));
  output.width = Math.max(1, Math.round(crop.width * scale)); output.height = Math.max(1, Math.round(crop.height * scale));
  const target = output.getContext('2d');
  if (!target) throw new Error('Image preview is unavailable.');
  target.imageSmoothingEnabled = true; target.imageSmoothingQuality = 'high';
  target.drawImage(rotated, crop.x, crop.y, crop.width, crop.height, 0, 0, output.width, output.height);
  return output;
}
