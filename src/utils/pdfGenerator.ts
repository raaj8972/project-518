import {
  loadSafeImage,
  renderPassToCanvas,
  resolveDayConfig,
  type PassData,
  type TemplateConfig,
} from './passRenderer';

export type { PassData, TemplateConfig };

export interface GenerateOptions {
  passes: PassData[];
  templateConfigs: Record<string, TemplateConfig>;
  selectedDays: number[];
  eventDates: string[];
  onProgress?: (progress: number) => void;
  includeName?: boolean;
}

async function preloadDayImages(
  templateConfigs: Record<string, TemplateConfig>,
  selectedDays: number[]
): Promise<Record<string, HTMLImageElement>> {
  const loaded: Record<string, HTMLImageElement> = {};
  await Promise.all(
    selectedDays.map(async (dayIndex) => {
      const cfg = resolveDayConfig(templateConfigs, dayIndex);
      if (cfg?.bgUrl) {
        const key = `day_${dayIndex}`;
        const img = await loadSafeImage(cfg.bgUrl);
        if (img) loaded[key] = img;
      }
    })
  );
  return loaded;
}

function buildPrintQueue(
  passes: PassData[],
  selectedDays: number[],
  eventDates: string[]
): Array<{ pass: PassData; dayIndex: number }> {
  const queue: Array<{ pass: PassData; dayIndex: number }> = [];
  passes.forEach((pass) => {
    selectedDays.forEach((dayIndex) => {
      if (pass.valid_date && eventDates?.length > 0 && eventDates[dayIndex]) {
        if (pass.valid_date !== eventDates[dayIndex]) return;
      }
      queue.push({ pass, dayIndex });
    });
  });

  // If valid_date did not match any configured eventDates (e.g. custom VIP date), fall back to first selected day
  if (queue.length === 0 && passes.length > 0 && selectedDays.length > 0) {
    passes.forEach((pass) => queue.push({ pass, dayIndex: selectedDays[0] }));
  }

  return queue;
}

/**
 * Generates a PDF with one crisp pass per page (rendered via canvas -> JPEG so it never renders black).
 */
export const generatePassPDF = async ({
  passes,
  templateConfigs,
  selectedDays,
  eventDates,
  onProgress,
  includeName,
}: GenerateOptions) => {
  if (passes.length === 0) return;

  const days = selectedDays.length > 0 ? selectedDays : [0];
  const queue = buildPrintQueue(passes, days, eventDates);
  if (queue.length === 0) return;

  const [{ default: jsPDF }, loadedImages] = await Promise.all([
    import('jspdf'),
    preloadDayImages(templateConfigs, days),
  ]);

  let doc: any = null;

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

    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    const pgW = canvas.width;
    const pgH = canvas.height;
    const orient = pgW >= pgH ? 'landscape' : 'portrait';

    if (!doc) {
      doc = new jsPDF({
        orientation: orient,
        unit: 'px',
        format: [pgW, pgH],
        hotfixes: ['px_scaling'],
      });
    } else {
      doc.addPage([pgW, pgH], orient);
    }

    doc.addImage(dataUrl, 'JPEG', 0, 0, pgW, pgH, undefined, 'FAST');
    onProgress?.(Math.round(((i + 1) / queue.length) * 100));
  }

  const safeName =
    passes.length === 1 && passes[0].name
      ? `${passes[0].name.replace(/[^a-z0-9]/gi, '_')}-pass.pdf`
      : `entry-passes-${Date.now()}.pdf`;

  doc?.save(safeName);
};

/**
 * Generates an A4 Landscape (297mm × 210mm) printable PDF with strictly 2 passes per page.
 * Automatically places wide passes top/bottom and vertical/square passes side-by-side.
 */
export const generateA4SheetPDF = async ({
  passes,
  templateConfigs,
  selectedDays,
  eventDates,
  onProgress,
  includeName,
}: GenerateOptions) => {
  if (passes.length === 0) return;

  const days = selectedDays.length > 0 ? selectedDays : [0];
  const queue = buildPrintQueue(passes, days, eventDates);
  if (queue.length === 0) return;

  const [{ default: jsPDF }, loadedImages] = await Promise.all([
    import('jspdf'),
    preloadDayImages(templateConfigs, days),
  ]);

  // A4 Landscape = 297mm × 210mm
  const PAGE_W = 297;
  const PAGE_H = 210;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Render all queued passes to high-res canvases first or in pairs
  for (let i = 0; i < queue.length; i += 2) {
    if (i > 0) doc.addPage('a4', 'landscape');

    // Fill page white explicitly
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

    const pair = [queue[i], queue[i + 1]].filter(Boolean);
    const rendered = await Promise.all(
      pair.map(async (item) => {
        const config = resolveDayConfig(templateConfigs, item.dayIndex);
        const bgImage = loadedImages[`day_${item.dayIndex}`];
        const canvas = await renderPassToCanvas({
          pass: item.pass,
          dayIndex: item.dayIndex,
          config,
          bgImage,
          eventDates,
          includeName,
          targetWidth: 2200,
        });
        return {
          dataUrl: canvas.toDataURL('image/jpeg', 0.94),
          ratio: canvas.width / canvas.height,
        };
      })
    );

    const firstRatio = rendered[0]?.ratio || 3;
    const isWide = firstRatio >= 1.45;

    if (isWide) {
      // Top & Bottom (2 passes per A4 Landscape page)
      const maxW = 265;
      const maxSlotH = 88;
      const drawPass = (item: { dataUrl: string; ratio: number }, slotY: number) => {
        let w = maxW;
        let h = w / item.ratio;
        if (h > maxSlotH) {
          h = maxSlotH;
          w = h * item.ratio;
        }
        const x = (PAGE_W - w) / 2;
        const y = slotY + (maxSlotH - h) / 2;
        doc.addImage(item.dataUrl, 'JPEG', x, y, w, h, undefined, 'FAST');
      };

      drawPass(rendered[0], 11);
      if (rendered[1]) {
        // Subtle dashed horizontal cut line
        doc.setDrawColor(200, 205, 200);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(12, PAGE_H / 2, PAGE_W - 12, PAGE_H / 2);
        doc.setLineDashPattern([], 0);
        drawPass(rendered[1], 111);
      }
    } else {
      // Side-by-Side (Left & Right halves on A4 Landscape)
      const maxSlotW = 132;
      const maxH = 186;
      const drawPass = (item: { dataUrl: string; ratio: number }, slotX: number) => {
        let w = maxSlotW;
        let h = w / item.ratio;
        if (h > maxH) {
          h = maxH;
          w = h * item.ratio;
        }
        const x = slotX + (maxSlotW - w) / 2;
        const y = (PAGE_H - h) / 2;
        doc.addImage(item.dataUrl, 'JPEG', x, y, w, h, undefined, 'FAST');
      };

      drawPass(rendered[0], 11);
      if (rendered[1]) {
        // Subtle dashed vertical cut line
        doc.setDrawColor(200, 205, 200);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(PAGE_W / 2, 10, PAGE_W / 2, PAGE_H - 10);
        doc.setLineDashPattern([], 0);
        drawPass(rendered[1], 154);
      }
    }

    onProgress?.(Math.round((Math.min(i + 2, queue.length) / queue.length) * 100));
  }

  const safeName =
    passes.length === 1 && passes[0].name
      ? `${passes[0].name.replace(/[^a-z0-9]/gi, '_')}-A4-print.pdf`
      : `entry-passes-a4-landscape-${Date.now()}.pdf`;

  doc.save(safeName);
};
