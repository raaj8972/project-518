export interface PassData {
  id: string; // database id
  token: string; // secure token for QR
  name?: string;
  type: string;
  valid_date?: string; // YYYY-MM-DD
  includeName?: boolean; // Override per pass
}

export interface TemplateConfig {
  bgUrl: string;
  qr: {
    x: number; // percentage
    y: number; // percentage
    size: number; // percentage of width
  };
  name?: {
    enabled: boolean;
    x: number; // percentage
    y: number; // percentage
    fontSize: number; // percentage of width
    color: string; // hex
    align: 'left' | 'center' | 'right';
    fontFamily?: string;
    bold?: boolean;
  };
}

export interface GenerateOptions {
  passes: PassData[];
  templateConfigs: Record<string, TemplateConfig>; // { "day_0": config, ... }
  selectedDays: number[]; // indices [0, 1, 2]
  eventDates: string[]; // ['2026-01-03', '2026-01-04', ...]
  onProgress?: (progress: number) => void;
  includeName?: boolean;
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

  eventDates: string[],
  includeName?: boolean,
  loadedFonts?: Record<string, string> // New argument
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

  // 3. Draw Name (if enabled and configured)
  // Precedence: Pass-specific override > Global batch override > Template default
  const shouldDrawName = pass.includeName !== undefined 
      ? pass.includeName 
      : (includeName !== undefined ? includeName : (config?.name?.enabled || false));

  if (shouldDrawName && config?.name && pass.name) {
    try {
       const nConfig = config.name;
       const fontSize = (width * (nConfig.fontSize || 3)) / 100;
       const nX = x + ((width * nConfig.x) / 100);
       const nY = y + ((height * nConfig.y) / 100);
       
       doc.setFontSize(fontSize); // jsPDF uses points, but we might need to convert scale. 
       // Actually jsPDF setFontSize is in Points. The doc unit is custom (px or mm).
       // If unit is 'px', fontSize is in px? jsPDF documentation says setFontSize is always points? 
       // NOTE: in recent jsPDF, setFontSize is in "points" (1/72 inch), but coordinates are in "units".
       // If unit is 'px', 1 unit = 1 px. 1 pt = 1.33 px.
       // Let's assume proportional scaling for now or just set font size in units directly if possible.
       // For safety, let's use the fontSize calculated in units.
       
       // Correct approach for jsPDF text size:
       // The fontSize argument is always generally in points (pt).
       // We need to convert our 'unit' size to points.
       // 1 unit (px or mm) -> points.
       // If unit is px (1/96 inch): 1 px = 0.75 pt.
       // If unit is mm: 1 mm = 2.835 pt.
       
       // However, to keep it simple and consistent with canvas logic, we will iterate until text fits? No, too slow.
       // Let's approximate: 
       // In 'px' mode (used by single pass gen): fontSize in points ~= fontSizePx * 0.75
       // In 'mm' mode (used by A4): fontSize in points ~= fontSizeMm * 2.83
       
       let fontSizePt = fontSize; // Default assumption
       if (doc.internal.scaleFactor) {
           // scaleFactor is (72 / 96) for px? 
           // actually scaleFactor converts units to points.
           fontSizePt = fontSize * doc.internal.scaleFactor;
       }
       
       doc.setFontSize(fontSizePt);
       doc.setFontSize(fontSizePt);
       doc.setTextColor(nConfig.color || '#ffffff');
       
       // Font Selection with Embed Support
       let fontName = 'helvetica';
       let fontStyle = nConfig.bold ? 'bold' : 'normal';
       
       if (nConfig.fontFamily && loadedFonts && loadedFonts[nConfig.fontFamily]) {
          // Add font if not exists (jsPDF might need re-adding or global add)
          // We can add it once per doc usually.
          const family = nConfig.fontFamily;
          const fileName = `${family}-Regular.ttf`; // we loaded regular/bold specific URLs but let's simplify
          
          if (!doc.existsFileInVFS(fileName)) {
             doc.addFileToVFS(fileName, loadedFonts[family]);
             doc.addFont(fileName, family, 'normal');
             doc.addFont(fileName, family, 'bold'); // Reuse same file for "bold" if we only fetched one weight (Anton is only one weight)
          }
          fontName = family;
          // Anton is black/bold by default, so style 'normal' is fine, or 'bold' aliases to it
          fontStyle = 'normal'; 
       }
       
       doc.setFont(fontName, fontStyle);
       
       const align = nConfig.align || 'center';
       doc.text(pass.name, nX, nY, { align: align, baseline: 'middle' });

    } catch (e) {
       console.error('Name drawing failed', e);
    }
  }
};

// Original Single-Pass Generator (Dynamic Resolution)
export const generatePassPDF = async ({
  passes,
  templateConfigs,
  selectedDays,
  eventDates,
  onProgress,
  includeName
}: GenerateOptions) => {
  if (passes.length === 0) return;

  const [{ default: jsPDF }, QRCode] = await Promise.all([
    import('jspdf'),
    import('qrcode')
  ]);

  // Hardcoded Font URLs (CORS-enabled from Google Fonts)
  const FONTS = {
    Anton: 'https://fonts.gstatic.com/s/anton/v27/1Ptgg87LROyAm0K0.ttf',
    Orbitron: 'https://fonts.gstatic.com/s/orbitron/v35/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1ny_Cmxpg.ttf', // Bold 700
    Rajdhani: 'https://fonts.gstatic.com/s/rajdhani/v15/L1VqHMjA3rYF2P4xXj4.ttf' // Bold 700 guess (we will use default fallback if fails)
  };

  const loadFontBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
             const base64 = reader.result as string;
             // Remove data:application/octet-stream;base64, prefix
             resolve(base64.split(',')[1]); 
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Failed to load font:', url, e);
      return null;
    }
  };

  const loadedImages: Record<string, HTMLImageElement> = {};
  
  // Preload Fonts map
  const loadedFonts: Record<string, string> = {}; // Name -> Base64
  
  // Load Images and Fonts in parallel
  await Promise.all([
    // Images
    ...selectedDays.map(async (dayIndex) => {
        const key = `day_${dayIndex}`;
        const config = templateConfigs[key];
        if (config?.bgUrl && !loadedImages[key]) {
            try {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = config.bgUrl; });
                loadedImages[key] = img;
            } catch (e) { console.error(e); }
        }
    }),
    // Fonts (Only load if referenced)
    (async () => {
       // Check which fonts are needed
       const neededFonts = new Set<string>();
       Object.values(templateConfigs).forEach(c => {
         if (c.name?.fontFamily && FONTS[c.name.fontFamily as keyof typeof FONTS]) {
           neededFonts.add(c.name.fontFamily);
         }
       });
       
       await Promise.all(Array.from(neededFonts).map(async (fontName) => {
          const url = FONTS[fontName as keyof typeof FONTS];
          if (url) {
             const b64 = await loadFontBase64(url);
             if (b64) loadedFonts[fontName] = b64;
          }
       }));
    })()
  ]);

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

      await drawPassOnDoc(doc, QRCode, pass, dayIndex, config, bgImage, 0, 0, pgW, pgH, eventDates, includeName, loadedFonts);

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
    onProgress,
    includeName
  }: GenerateOptions) => {
    if (passes.length === 0) return;
  
    const [{ default: jsPDF }, QRCode] = await Promise.all([
      import('jspdf'),
      import('qrcode')
    ]);
  
    // Hardcoded Font URLs (CORS-enabled from Google Fonts)
    const FONTS = {
      Anton: 'https://fonts.gstatic.com/s/anton/v27/1Ptgg87LROyAm0K0.ttf',
      Orbitron: 'https://fonts.gstatic.com/s/orbitron/v35/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1ny_Cmxpg.ttf', // Bold
      Rajdhani: 'https://fonts.gstatic.com/s/rajdhani/v15/L1VqHMjA3rYF2P4xXj4.ttf' 
    };
  
    const loadFontBase64 = async (url: string): Promise<string | null> => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
               const base64 = reader.result as string;
               resolve(base64.split(',')[1]); 
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error('Failed to load font:', url, e);
        return null;
      }
    };

    // Preload Images and Fonts
    const loadedImages: Record<string, HTMLImageElement> = {};
    const loadedFonts: Record<string, string> = {};

    await Promise.all([
      // Images
      ...selectedDays.map(async (dayIndex) => {
          const key = `day_${dayIndex}`;
          const config = templateConfigs[key];
          if (config?.bgUrl && !loadedImages[key]) {
              try {
                  const img = new Image();
                  img.crossOrigin = 'Anonymous';
                  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = config.bgUrl; });
                  loadedImages[key] = img;
              } catch (e) { console.error(e); }
          }
      }),
      // Fonts
      (async () => {
         const neededFonts = new Set<string>();
         Object.values(templateConfigs).forEach(c => {
           if (c.name?.fontFamily && FONTS[c.name.fontFamily as keyof typeof FONTS]) {
             neededFonts.add(c.name.fontFamily);
           }
         });
         await Promise.all(Array.from(neededFonts).map(async (fontName) => {
            const url = FONTS[fontName as keyof typeof FONTS];
            if (url) {
               const b64 = await loadFontBase64(url);
               if (b64) loadedFonts[fontName] = b64;
            }
         }));
      })()
    ]);
  
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
        await drawPassOnDoc(doc, QRCode, item1.pass, item1.dayIndex, cfg1, bg1, MARGIN_X, TOP_Y, PASS_W, PASS_H, eventDates, includeName, loadedFonts);
        processed++;
        if (onProgress) onProgress(Math.round((processed / total) * 100));

        // Draw Item 2 (Bottom) if exists
        if (item2) {
            const bg2 = loadedImages[`day_${item2.dayIndex}`];
            const cfg2 = templateConfigs[`day_${item2.dayIndex}`];
            await drawPassOnDoc(doc, QRCode, item2.pass, item2.dayIndex, cfg2, bg2, MARGIN_X, BOTTOM_Y, PASS_W, PASS_H, eventDates, includeName, loadedFonts);
            processed++;
            if (onProgress) onProgress(Math.round((processed / total) * 100));
        }
    }
  
    doc.save(`passes-a4-sheet-${Date.now()}.pdf`);
  };
