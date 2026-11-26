import JSZip from 'jszip';
import {
  loadSafeImage,
  renderPassToCanvas,
  resolveDayConfig,
  type PassData,
  type TemplateConfig,
} from './passRenderer';

export type { PassData, TemplateConfig };

export interface GenerateImageOptions {
  passes: PassData[];
  templateConfigs: Record<string, TemplateConfig>;
  selectedDays: number[];
  eventDates: string[];
  format?: 'png' | 'jpg';
  onProgress?: (progress: number) => void;
  includeName?: boolean;
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const generatePassImages = async ({
  passes,
  templateConfigs,
  selectedDays,
  eventDates,
  format = 'png',
  onProgress,
  includeName,
}: GenerateImageOptions) => {
  if (passes.length === 0) return;

  const days = selectedDays.length > 0 ? selectedDays : [0];
  const MIME_TYPE = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const EXT = format === 'jpg' ? 'jpg' : 'png';

  const loadedImages: Record<string, HTMLImageElement> = {};
  await Promise.all(
    days.map(async (dayIndex) => {
      const cfg = resolveDayConfig(templateConfigs, dayIndex);
      if (cfg?.bgUrl) {
        const img = await loadSafeImage(cfg.bgUrl);
        if (img) loadedImages[`day_${dayIndex}`] = img;
      }
    })
  );

  const queue: Array<{ pass: PassData; dayIndex: number }> = [];
  for (const pass of passes) {
    for (const dayIndex of days) {
      if (pass.valid_date && eventDates?.length > 0 && eventDates[dayIndex]) {
        if (pass.valid_date !== eventDates[dayIndex]) continue;
      }
      queue.push({ pass, dayIndex });
    }
  }
  if (queue.length === 0) {
    passes.forEach((pass) => queue.push({ pass, dayIndex: days[0] }));
  }

  const files: { blob: Blob; filename: string }[] = [];

  for (let i = 0; i < queue.length; i++) {
    const { pass, dayIndex } = queue[i];
    const config = resolveDayConfig(templateConfigs, dayIndex);
    const bgImage = loadedImages[`day_${dayIndex}`];

    const canvas = await renderPassToCanvas({
      pass,
      dayIndex,
      config,
      bgImage,
      eventDates,
      includeName,
      targetWidth: 2400,
    });

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), MIME_TYPE, 0.94)
    );

    if (blob) {
      const sanitizedName = (pass.name || 'guest').replace(/[^a-z0-9]/gi, '_');
      files.push({
        blob,
        filename: `${sanitizedName}_${pass.token.slice(0, 8)}_Day${dayIndex + 1}.${EXT}`,
      });
    }
    onProgress?.(Math.round(((i + 1) / queue.length) * 100));
  }

  if (files.length === 1) {
    downloadBlob(files[0].blob, files[0].filename);
  } else if (files.length > 1) {
    const zip = new JSZip();
    files.forEach((f) => zip.file(f.filename, f.blob));
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, `entry-passes-${EXT}-${Date.now()}.zip`);
  }
};
