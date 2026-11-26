import { supabase } from '../lib/supabase';
import { prepareBrandAsset } from '../utils/brandAsset';

export type PdfBrandSlot = 'watermark' | 'stamp' | 'email_stamp';
export interface PdfBrandAsset { url: string; dataUrl: string; }
const bucket = () => supabase.storage.from('pdf-watermarks');

async function readAsset(name: string): Promise<PdfBrandAsset> {
  const signed = await bucket().createSignedUrl(name, 3600);
  if (signed.error || !signed.data?.signedUrl) throw new Error('The branding image could not be opened. Please retry.');
  const response = await fetch(signed.data.signedUrl);
  if (!response.ok) throw new Error('The branding image could not be downloaded.');
  const blob = await response.blob();
  if (blob.size > 5 * 1024 * 1024) throw new Error('The branding image exceeds 5 MB.');
  // Legacy SVGs are rasterized before jsPDF receives them.
  const file = await prepareBrandAsset(new File([blob], name, { type: name.endsWith('.svg') ? 'image/svg+xml' : 'image/png' }));
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('The branding image could not be read.')); reader.readAsDataURL(file);
  });
  return { url: signed.data.signedUrl, dataUrl };
}

export async function loadPdfBranding() {
  const { data, error } = await bucket().list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw new Error('PDF branding could not load. Please retry before exporting.');
  const assets: Record<'watermark' | 'stamp', PdfBrandAsset | null> = { watermark: null, stamp: null };
  await Promise.all((['watermark', 'stamp'] as const).map(async slot => {
    const name = [`${slot}.png`, `${slot}.svg`].find(candidate => data?.some(item => item.name === candidate));
    if (name) assets[slot] = await readAsset(name);
  }));
  return assets;
}

export async function uploadPdfBrandAsset(slot: PdfBrandSlot, file: File): Promise<PdfBrandAsset> {
  const png = await prepareBrandAsset(file);
  // Replace atomically. A failed upload never removes the previous asset.
  const { error } = await bucket().upload(`${slot}.png`, png, { cacheControl: '0', upsert: true, contentType: 'image/png' });
  if (error) throw new Error(error.message || 'The branding image could not upload.');
  return readAsset(`${slot}.png`);
}

export async function removePdfBrandAsset(slot: PdfBrandSlot) {
  const { error } = await bucket().remove([`${slot}.png`, `${slot}.svg`]);
  if (error) throw new Error(error.message || 'The branding image could not be removed.');
}
