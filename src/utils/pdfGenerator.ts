export interface PassData {
  id: string; // database id
  token: string; // secure token for QR
  name?: string;
  type: string;
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
  onProgress?: (progress: number) => void;
}

export const generatePassPDF = async ({
  passes,
  templateConfigs,
  selectedDays,
  onProgress
}: GenerateOptions) => {
  if (passes.length === 0) return;

  // Dynamically load heavy libraries only when needed
  const [{ default: jsPDF }, QRCode] = await Promise.all([
    import('jspdf'),
    import('qrcode')
  ]);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [1500, 500], // Using a fixed high-res canvas size (3:1 ratio) to match template recommendation
    hotfixes: ['px_scaling']
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  let totalPages = passes.length * selectedDays.length;
  let processed = 0;

  // Pre-load images to avoid fetching multiple times
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
      } catch (e) {
        console.error(`Failed to load background for ${key}`, e);
      }
    }
  }

  // Iterate passes
  for (let i = 0; i < passes.length; i++) {
    const pass = passes[i];

    for (const dayIndex of selectedDays) {
      const key = `day_${dayIndex}`;
      const config = templateConfigs[key];
      const bgImage = loadedImages[key];

      // Add page (except first one which is auto-created)
      if (processed > 0) {
        doc.addPage([1500, 500], 'landscape');
      }

      // 1. Draw Background with Object-Cover logic
      if (bgImage) {
        const imgRatio = bgImage.width / bgImage.height;
        const pageRatio = width / height; // 3:1

        let drawW = width;
        let drawH = height;
        let offsetX = 0;
        let offsetY = 0;

        if (imgRatio > pageRatio) {
          // Image is wider than page (crop sides)
          drawH = height;
          drawW = height * imgRatio;
          offsetX = (width - drawW) / 2;
        } else {
          // Image is taller than page (crop top/bottom)
          drawW = width;
          drawH = width / imgRatio;
          offsetY = (height - drawH) / 2;
        }

        // jsPDF clips content outside the page automatically
        doc.addImage(bgImage, 'PNG', offsetX, offsetY, drawW, drawH, undefined, 'FAST');
      } else {
        // Fallback
        doc.setFillColor(20, 20, 20);
        doc.rect(0, 0, width, height, 'F'); 
        doc.setTextColor(255, 255, 255);
        doc.text(`Pass: ${pass.token}`, 50, 50);
        doc.text(`Day: ${dayIndex + 1}`, 50, 100);
      }

      // 2. Generate and Draw QR
      if (config) {
        try {
          // QR Data
          const qrDataUrl = await QRCode.toDataURL(pass.token, {
            errorCorrectionLevel: 'H',
            margin: 0, // No internal margin, we'll draw our own white box
            width: 500,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          });

          // Config dimensions
          const boxSize = (width * config.qr.size) / 100;
          const boxX = (width * config.qr.x) / 100;
          const boxY = (height * config.qr.y) / 100;

          // Top-left of the CONTAINER box
          const pdfBoxX = boxX - (boxSize / 2);
          const pdfBoxY = boxY - (boxSize / 2);

          // Draw White Container Box (simulates bg-white p-2)
          doc.setFillColor(255, 255, 255);
          doc.rect(pdfBoxX, pdfBoxY, boxSize, boxSize, 'F');

          // Draw QR inside with padding
          // Increased to 15% to ensure a robust "quiet zone" (white border) for checking scanning reliability
          const padding = boxSize * 0.15; 
          const qrSize = boxSize - (padding * 2);
          
          doc.addImage(qrDataUrl, 'PNG', pdfBoxX + padding, pdfBoxY + padding, qrSize, qrSize);

        } catch (e) {
          console.error('QR Generation failed', e);
        }
      }

      processed++;
      if (onProgress) onProgress(Math.round((processed / totalPages) * 100));
    }
  }

  doc.save(`passes-${Date.now()}.pdf`);
};
