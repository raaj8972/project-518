
import QRCode from 'qrcode';
import JSZip from 'jszip';
// import { saveAs } from 'file-saver'; // Not needed, custom helper used

// Types matching pdfGenerator.ts
export interface PassData {
  id: string;
  token: string;
  name?: string;
  type: string;
  valid_date?: string;
}

export interface TemplateConfig {
  bgUrl: string;
  qr: {
    x: number;
    y: number;
    size: number;
  };
}

export interface GenerateImageOptions {
  passes: PassData[];
  templateConfigs: Record<string, TemplateConfig>;
  selectedDays: number[];
  eventDates: string[];
  format?: 'png' | 'jpg';
  onProgress?: (progress: number) => void;
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
  onProgress
}: GenerateImageOptions) => {
  if (passes.length === 0) return;

  const zip = new JSZip();
  let processed = 0;
  const totalOperations = passes.length * selectedDays.length;
  
  // Use high resolution for quality (matches the PDF generator's canvas concept) but adapt dynamically
  const MIME_TYPE = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const EXT = format === 'jpg' ? 'jpg' : 'png';

  // 1. Preload Background Images
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

  // Reuse canvas instance
  const canvas = document.createElement('canvas');

  // Helper to generate single pass blob
  const generateSinglePass = async (pass: PassData, dayIndex: number): Promise<{ blob: Blob | null, filename: string }> => {
     const key = `day_${dayIndex}`;
     const config = templateConfigs[key];
     const bgImage = loadedImages[key];

     // Re-acquire context after resize (safeguard)
     const ctx = canvas.getContext('2d');
     if (!ctx) return { blob: null, filename: '' };
     
     // Enforce 3:1 Aspect Ratio (Critical for alignment matching PDF)
     // But use the maximum native resolution available
     let width = 3000;
     if (bgImage && (bgImage.naturalWidth || bgImage.width) > 3000) {
        width = bgImage.naturalWidth || bgImage.width;
     }
     let height = width / 3;

     // Resize canvas
     canvas.width = width;
     canvas.height = height;

     // Reset Context Settings after resize
     ctx.imageSmoothingEnabled = true;
     ctx.imageSmoothingQuality = 'high';
     ctx.clearRect(0, 0, width, height);

     // Draw Background with Object-Cover (Crop) Logic
     if (bgImage) {
        const imgRatio = (bgImage.naturalWidth || bgImage.width) / (bgImage.naturalHeight || bgImage.height);
        const pageRatio = width / height; // Always 3
        
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

        ctx.drawImage(bgImage, offsetX, offsetY, drawW, drawH);
     } else {
        // Fallback
        ctx.fillStyle = '#141414';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.font = `${width * 0.026}px sans-serif`; // Scale font roughly (80px at 3000w)
        ctx.fillText(`Pass: ${pass.token}`, width * 0.033, height * 0.2);
        ctx.fillText(`Day: ${dayIndex + 1}`, width * 0.033, height * 0.32);
     }

     // Draw QR
     if (config) {
        let qrToken = pass.token;
        if (eventDates && eventDates.length > dayIndex) {
            const targetDate = eventDates[dayIndex];
            qrToken = `${pass.token}|${targetDate}`;
        }

        const qrDataUrl = await QRCode.toDataURL(qrToken, {
            errorCorrectionLevel: 'H',
            margin: 0,
            width: 1000, // High res source for QR
            color: { dark: '#000000', light: '#ffffff' }
        });
        
        const qrImg = new Image();
        await new Promise((resolve) => { qrImg.onload = resolve; qrImg.src = qrDataUrl; });

        const boxSize = (width * config.qr.size) / 100;
        const boxX = (width * config.qr.x) / 100;
        const boxY = (height * config.qr.y) / 100;
        
        // Centered coordinates
        const drawX = boxX - (boxSize / 2);
        const drawY = boxY - (boxSize / 2);

        // White background for QR
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(drawX, drawY, boxSize, boxSize);

        // QR with padding
        const padding = boxSize * 0.15;
        const qrSize = boxSize - (padding * 2);
        ctx.drawImage(qrImg, drawX + padding, drawY + padding, qrSize, qrSize);
     }

     return new Promise((resolve) => {
        canvas.toBlob((blob: Blob | null) => {
            if (!blob) {
                resolve({ blob: null, filename: '' });
                return;
            }
            const sanitizedName = (pass.name || 'guest').replace(/[^a-z0-9]/gi, '_');
            const filename = `${sanitizedName}_${pass.token}_Day${dayIndex + 1}.${EXT}`;
            resolve({ blob, filename });
        }, MIME_TYPE, 0.95); // 0.95 quality for JPG
     });
  };


  // 2. Generate All Images
  const files: { blob: Blob, filename: string }[] = [];

  for (const pass of passes) {
    for (const dayIndex of selectedDays) {
        // Skip invalid dates for this pass
        if (pass.valid_date && eventDates && eventDates.length > 0) {
            const targetDate = eventDates[dayIndex];
            if (pass.valid_date !== targetDate) continue;
        }

        const result = await generateSinglePass(pass, dayIndex);
        if (result.blob) {
            files.push({ blob: result.blob, filename: result.filename });
        }
        
        processed++;
        if (onProgress) onProgress(Math.round((processed / totalOperations) * 100));
    }
  }

  // 3. Download Logic
  if (files.length === 0) return;

  if (files.length === 1) {
      // Single file download directly
      downloadBlob(files[0].blob, files[0].filename);
  } else {
      // Multiple files -> Zip
      files.forEach(f => {
          zip.file(f.filename, f.blob);
      });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `passes_${Date.now()}.zip`);
  }
};
