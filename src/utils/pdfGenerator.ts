export interface PassData {
  id: string; // database id
  token: string; // secure token for QR
  name?: string;
  type: string;
  valid_date?: string; // YYYY-MM-DD
}

export interface TemplateConfig {
  bgUrl: string;
  qr: {
    x: number; // percentage
    y: number; // percentage
    size: number; // percentage of width
  };
}

export interface GenerateOptions {
  passes: PassData[];
  templateConfigs: Record<string, TemplateConfig>; // { "day_0": config, ... }
  selectedDays: number[]; // indices [0, 1, 2]
  eventDates: string[]; // ['2026-01-03', '2026-01-04', ...]
  onProgress?: (progress: number) => void;
}

// Helper to draw a single pass onto a specific region of the PDF
const drawPassOnDoc = async (
  doc: any, // jsPDF instance type is complex to import dynamically
  QRCode: any,
  pass: PassData,
  dayIndex: number,
  config: TemplateConfig,
  bgImage: HTMLImageElement | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  eventDates: string[]

) => {
  // 0. Safety Check for NaN
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
      console.error('Invalid coordinates passed to drawPassOnDoc:', { x, y, width, height });
      return;
  }

  // 1. Draw Background with Object-Cover logic (Strict 3:1 cropping)
  if (bgImage) {
    const imgRatio = bgImage.width / bgImage.height;
    const pageRatio = width / height; // Should be 3:1

    let drawW = width;
    let drawH = height;
    let offsetX = 0;
    let offsetY = 0;

    if (imgRatio > pageRatio) {
      // Image is wider than target area (crop sides)
      drawH = height;
      drawW = height * imgRatio;
      offsetX = (width - drawW) / 2;
    } else {
      // Image is taller than target area (crop top/bottom)
      drawW = width;
      drawH = width / imgRatio;
      offsetY = (height - drawH) / 2;
    }

    try {
        // Use a clipping rect to ensure we don't draw outside the specific x,y,w,h box
        doc.saveGraphicsState();
        
        // Construct path for clipping
        // Note: calling rect without style allows it to be part of the current path for clipping.
        // We accept a potential thin border which is actually useful for cutting.
        doc.rect(x, y, width, height); 
        doc.clip();
        
        doc.addImage(bgImage, 'PNG', x + offsetX, y + offsetY, drawW, drawH, undefined, 'FAST');
        doc.restoreGraphicsState();
    } catch (e) {
        console.error('Error drawing background:', e);
        // Fallback if image fails (e.g. invalid format or clipping error)
        try {
           doc.restoreGraphicsState(); // Try to restore if we crashed mid-clip
        } catch (ignore) {}
        
        doc.setFillColor(20, 20, 20);
        doc.rect(x, y, width, height, 'F'); 
        doc.setTextColor(255, 255, 255);
        doc.text(`Pass: ${pass.token}`, x + 50, y + 50);
        doc.text(`Day: ${dayIndex + 1}`, x + 50, y + 100);
    }
  } else {
    // Fallback
    doc.setFillColor(20, 20, 20);
    doc.rect(x, y, width, height, 'F'); 
    doc.setTextColor(255, 255, 255);
    doc.text(`Pass: ${pass.token}`, x + 50, y + 50);
    doc.text(`Day: ${dayIndex + 1}`, x + 50, y + 100);
  }

  // 2. Generate and Draw QR
  if (config && config.qr) {
    try {
      // Validation for QR Config
      const qSize = Number(config.qr.size);
      const qX = Number(config.qr.x);
      const qY = Number(config.qr.y);

      if (!Number.isFinite(qSize) || !Number.isFinite(qX) || !Number.isFinite(qY)) {
          console.warn('Invalid QR config:', config.qr);
          return;
      }

      // QR Data - Append Date Suffix for Strict Day Validation
      let qrToken = pass.token;
      if (eventDates && eventDates.length > dayIndex) {
         const targetDate = eventDates[dayIndex];
         qrToken = `${pass.token}|${targetDate}`;
      }

      const qrDataUrl = await QRCode.toDataURL(qrToken, {
        errorCorrectionLevel: 'H',
        margin: 0,
        width: 500,
        color: { dark: '#000000', light: '#ffffff' }
      });

      // Config dimensions relative to the pass width/height
      // qSize, qX, qY are percentages (0-100)
      const boxSize = (width * qSize) / 100;
      const boxX = (width * qX) / 100;
      const boxY = (height * qY) / 100;
      
      if (!Number.isFinite(boxSize) || !Number.isFinite(boxX) || !Number.isFinite(boxY)) {
          console.error('Calculated QR dimensions invalid:', { boxSize, boxX, boxY });
          return;
      }

      // Top-left of the CONTAINER box (relative to pass origin)
      const relativeBoxX = boxX - (boxSize / 2);
      const relativeBoxY = boxY - (boxSize / 2);
      
      const absoluteBoxX = x + relativeBoxX;
      const absoluteBoxY = y + relativeBoxY;

      // Draw White Container Box
      doc.setFillColor(255, 255, 255);
      doc.rect(absoluteBoxX, absoluteBoxY, boxSize, boxSize, 'F');

      // Draw QR inside with padding
      const padding = boxSize * 0.15; 
      const qrSize = boxSize - (padding * 2);
      
      doc.addImage(qrDataUrl, 'PNG', absoluteBoxX + padding, absoluteBoxY + padding, qrSize, qrSize);

    } catch (e) {
      console.error('QR Generation failed', e);
    }
  }
};

// Original Single-Pass Generator (Dynamic Resolution)
export const generatePassPDF = async ({
  passes,
  templateConfigs,
  selectedDays,
  eventDates,
  onProgress
}: GenerateOptions) => {
  if (passes.length === 0) return;

  const [{ default: jsPDF }, QRCode] = await Promise.all([
    import('jspdf'),
    import('qrcode')
  ]);

  const loadedImages: Record<string, HTMLImageElement> = {};
  for (const dayIndex of selectedDays) {
    const key = `day_${dayIndex}`;
    const config = templateConfigs[key];
    if (config?.bgUrl && !loadedImages[key]) {
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = config.bgUrl;
        });
        loadedImages[key] = img;
      } catch (e) { console.error(e); }
    }
  }

  const getDimensions = (img?: HTMLImageElement): [number, number] => {
     let w = 3000;
     if (img && (img.naturalWidth || img.width) > 3000) {
        w = img.naturalWidth || img.width;
     }
     return [w, w / 3];
  };

  const firstKey = `day_${selectedDays[0]}`;
  const [initW, initH] = getDimensions(loadedImages[firstKey]);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [initW, initH], 
    hotfixes: ['px_scaling']
  });

  let totalPages = passes.length * selectedDays.length;
  let processed = 0;

  for (let i = 0; i < passes.length; i++) {
    const pass = passes[i];
    for (const dayIndex of selectedDays) {
      if (pass.valid_date && eventDates && eventDates.length > 0) {
         const targetDate = eventDates[dayIndex];
         if (pass.valid_date !== targetDate) continue; 
      }

      const key = `day_${dayIndex}`;
      const config = templateConfigs[key];
      const bgImage = loadedImages[key];
      const [pgW, pgH] = getDimensions(bgImage);

      if (processed > 0) {
        doc.addPage([pgW, pgH], 'landscape');
      }

      await drawPassOnDoc(doc, QRCode, pass, dayIndex, config, bgImage, 0, 0, pgW, pgH, eventDates);

      processed++;
      if (onProgress) onProgress(Math.round((processed / totalPages) * 100));
    }
  }

  doc.save(`passes-${Date.now()}.pdf`);
};


// New A4 Sheet Generator (2 Passes Per Page)
export const generateA4SheetPDF = async ({
    passes,
    templateConfigs,
    selectedDays,
    eventDates,
    onProgress
  }: GenerateOptions) => {
    if (passes.length === 0) return;
  
    const [{ default: jsPDF }, QRCode] = await Promise.all([
      import('jspdf'),
      import('qrcode')
    ]);
  
    // Preload Images
    const loadedImages: Record<string, HTMLImageElement> = {};
    for (const dayIndex of selectedDays) {
      const key = `day_${dayIndex}`;
      const config = templateConfigs[key];
      if (config?.bgUrl && !loadedImages[key]) {
        try {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = config.bgUrl;
          });
          loadedImages[key] = img;
        } catch (e) { console.error(e); }
      }
    }
  
    // Initialize A4 Landscape Doc
    // A4 (Landscape) is approx 297mm x 210mm
    // We work in pt or mm ensures compatibility. jsPDF default is mm if specified, but let's use 'mm'.
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
  
    // Layout Config (A4 Landscape = 297w x 210h)
    // We want 2 passes stacked vertically.
    // Pass Ratio 3:1.
    // Suggested width: 260mm (leaving ~18.5mm margins L/R)
    // Height: 260 / 3 = 86.66mm
    // Top Pass Y: ~15mm
    // Bottom Pass Y: 15mm + 86.66mm + 10mm(gap) = 111.66mm
    // This fits roughly within 210mm (111.66 + 86.66 = 198.32mm). Looks tight but fits.
    
    const PASS_W = 250; // Large Concert Pass (approx 10 inches)
    const PASS_H = PASS_W / 3; // Approx 83mm Height
    const MARGIN_X = (297 - PASS_W) / 2; // Balanced ~23mm margins
    const TOP_Y = 15; // Clean top spacing
    const GAP = 12; // Good separation between two passes
    const BOTTOM_Y = TOP_Y + PASS_H + GAP; // Fits perfectly with breathing room
  

    // Flatten the queue first to know total items
    const printQueue: Array<{pass: PassData, dayIndex: number}> = [];
    
    passes.forEach(pass => {
        selectedDays.forEach(dayIndex => {
            if (pass.valid_date && eventDates && eventDates.length > 0) {
                const targetDate = eventDates[dayIndex];
                if (pass.valid_date !== targetDate) return; 
             }
             printQueue.push({ pass, dayIndex });
        });
    });

    if (printQueue.length === 0) return;
  
    let processed = 0;
    const total = printQueue.length;
  
    // Iterate queue, taking 2 items at a time
    for (let i = 0; i < total; i += 2) {
        if (i > 0) doc.addPage('a4', 'landscape');
        
        const item1 = printQueue[i];
        const item2 = (i + 1 < total) ? printQueue[i + 1] : null;

        // Draw Item 1 (Top)
        const bg1 = loadedImages[`day_${item1.dayIndex}`];
        const cfg1 = templateConfigs[`day_${item1.dayIndex}`];
        await drawPassOnDoc(doc, QRCode, item1.pass, item1.dayIndex, cfg1, bg1, MARGIN_X, TOP_Y, PASS_W, PASS_H, eventDates);
        processed++;
        if (onProgress) onProgress(Math.round((processed / total) * 100));

        // Draw Item 2 (Bottom) if exists
        if (item2) {
            const bg2 = loadedImages[`day_${item2.dayIndex}`];
            const cfg2 = templateConfigs[`day_${item2.dayIndex}`];
            await drawPassOnDoc(doc, QRCode, item2.pass, item2.dayIndex, cfg2, bg2, MARGIN_X, BOTTOM_Y, PASS_W, PASS_H, eventDates);
            processed++;
            if (onProgress) onProgress(Math.round((processed / total) * 100));
        }
    }
  
    doc.save(`passes-a4-sheet-${Date.now()}.pdf`);
  };
