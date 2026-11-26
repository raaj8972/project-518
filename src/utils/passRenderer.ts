import QRCode from 'qrcode';

export interface TextLayerConfig {
  enabled: boolean;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  fontSize: number; // percentage of pass width
  color: string; // hex
  align: 'left' | 'center' | 'right';
  fontFamily?: string;
  bold?: boolean;
  text?: string;
}

export interface TemplateConfig {
  bgUrl: string;
  aspectRatio?: number; // width / height, defaults to 3 if omitted
  qr: {
    x: number; // center X percentage
    y: number; // center Y percentage
    size: number; // width percentage
    transparentBg?: boolean;
  };
  name?: TextLayerConfig;
  gateTime?: TextLayerConfig;
  allowedLimit?: TextLayerConfig;
  dateLabel?: TextLayerConfig;
}

export interface PassData {
  id: string;
  token: string;
  name?: string;
  type: string;
  valid_date?: string;
  includeName?: boolean;
  gateTime?: string;
  allowedLimit?: string;
}

const imageCache = new Map<string, HTMLImageElement>();

/**
 * Loads an image safely without tainting HTML5 Canvas (eliminates black PDF exports).
 */
export async function loadSafeImage(url: string): Promise<HTMLImageElement | undefined> {
  if (!url) return undefined;
  const cached = imageCache.get(url);
  if (cached && cached.complete && cached.naturalWidth > 0) return cached;

  // Strategy 1: fetch as Blob -> Object URL (never taints canvas)
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = objUrl;
      });
      imageCache.set(url, img);
      return img;
    }
  } catch {
    // Fall back to direct crossOrigin load below
  }

  // Strategy 2: direct crossOrigin load
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    imageCache.set(url, img);
    return img;
  } catch (err) {
    console.warn('Could not load pass background image:', url, err);
    return undefined;
  }
}

export function resolveDayConfig(
  templateConfigs: Record<string, TemplateConfig> | undefined | null,
  dayIndex: number
): TemplateConfig | undefined {
  if (!templateConfigs) return undefined;
  const exact = templateConfigs[`day_${dayIndex}`];
  if (exact) return exact;
  const firstKey = Object.keys(templateConfigs).sort()[0];
  return firstKey ? templateConfigs[firstKey] : undefined;
}

function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  text: string,
  layer: TextLayerConfig,
  width: number,
  height: number
) {
  if (!text) return;
  const fontSize = Math.max(12, (width * (layer.fontSize || 3)) / 100);
  const x = (width * (layer.x ?? 50)) / 100;
  const y = (height * (layer.y ?? 50)) / 100;
  const weight = layer.bold ? '700' : '500';
  const family = layer.fontFamily ? `"${layer.fontFamily}", sans-serif` : 'sans-serif';

  ctx.save();
  ctx.fillStyle = layer.color || '#111827';
  ctx.font = `${weight} ${fontSize}px ${family}`;
  ctx.textAlign = layer.align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

export interface RenderPassCanvasOptions {
  pass: PassData;
  dayIndex: number;
  config?: TemplateConfig;
  bgImage?: HTMLImageElement;
  eventDates?: string[];
  includeName?: boolean;
  targetWidth?: number;
}

/**
 * Renders a complete entry pass (background, QR code, name, gate time, limit, date)
 * onto an offscreen canvas with a white base so exports never turn black.
 */
export async function renderPassToCanvas({
  pass,
  dayIndex,
  config,
  bgImage,
  eventDates = [],
  includeName,
  targetWidth = 2400,
}: RenderPassCanvasOptions): Promise<HTMLCanvasElement> {
  try {
    await document.fonts.ready;
  } catch {
    // Proceed with fallback system fonts if font readiness check fails
  }

  const aspectRatio =
    config?.aspectRatio && config.aspectRatio > 0
      ? config.aspectRatio
      : bgImage && bgImage.naturalWidth > 0 && bgImage.naturalHeight > 0
      ? bgImage.naturalWidth / bgImage.naturalHeight
      : 3;

  const width = targetWidth;
  const height = Math.max(300, Math.round(width / aspectRatio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Always start with solid white so transparent PNGs never turn black in JPEG/PDF
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  if (bgImage && bgImage.naturalWidth > 0) {
    const imgRatio = bgImage.naturalWidth / bgImage.naturalHeight;
    const targetRatio = width / height;
    let drawW = width;
    let drawH = height;
    let offsetX = 0;
    let offsetY = 0;

    if (imgRatio > targetRatio) {
      drawH = height;
      drawW = height * imgRatio;
      offsetX = (width - drawW) / 2;
    } else {
      drawW = width;
      drawH = width / imgRatio;
      offsetY = (height - drawH) / 2;
    }
    ctx.drawImage(bgImage, offsetX, offsetY, drawW, drawH);
  } else {
    // Clean light-studio fallback ticket if no background template was uploaded
    ctx.fillStyle = '#f6f8f4';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#d3e2cf';
    ctx.lineWidth = Math.max(4, width * 0.004);
    ctx.strokeRect(width * 0.02, height * 0.05, width * 0.96, height * 0.9);

    ctx.fillStyle = '#426b52';
    ctx.fillRect(width * 0.02, height * 0.05, width * 0.96, height * 0.22);

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(width * 0.03)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`RICORRENZA ENTRY PASS · DAY ${dayIndex + 1}`, width * 0.05, height * 0.16);

    ctx.fillStyle = '#26352e';
    ctx.font = `700 ${Math.round(width * 0.04)}px sans-serif`;
    ctx.fillText(pass.name || 'Guest Pass', width * 0.05, height * 0.46);

    ctx.fillStyle = '#65726a';
    ctx.font = `500 ${Math.round(width * 0.022)}px sans-serif`;
    const dateText = pass.valid_date || eventDates[dayIndex] || 'Festival Entry';
    ctx.fillText(`Valid Date: ${dateText}   ·   Pass Code: ${pass.token.slice(0, 14)}`, width * 0.05, height * 0.64);
  }

  // Draw QR Code
  const qrCfg = config?.qr || { x: 84, y: 50, size: 18 };
  const targetDate = pass.valid_date || (eventDates.length > dayIndex ? eventDates[dayIndex] : undefined);
  const qrToken =
    targetDate && !pass.token.includes('|') ? `${pass.token}|${targetDate}` : pass.token;

  const qrDataUrl = await QRCode.toDataURL(qrToken, {
    errorCorrectionLevel: 'H',
    margin: 0,
    width: 800,
    color: {
      dark: '#000000',
      light: qrCfg.transparentBg ? '#00000000' : '#ffffff',
    },
  });

  const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = qrDataUrl;
  });

  const boxSize = (width * (qrCfg.size || 18)) / 100;
  const centerX = (width * (qrCfg.x ?? 84)) / 100;
  const centerY = (height * (qrCfg.y ?? 50)) / 100;
  const drawX = centerX - boxSize / 2;
  const drawY = centerY - boxSize / 2;

  ctx.save();
  if (!qrCfg.transparentBg) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(drawX, drawY, boxSize, boxSize);
  }
  const padding = boxSize * 0.03;
  ctx.drawImage(qrImg, drawX + padding, drawY + padding, boxSize - padding * 2, boxSize - padding * 2);
  ctx.restore();

  // Draw Name
  const shouldDrawName =
    pass.includeName !== undefined
      ? pass.includeName
      : includeName !== undefined
      ? includeName
      : Boolean(config?.name?.enabled);

  if (shouldDrawName && config?.name && pass.name) {
    drawTextLayer(ctx, pass.name, config.name, width, height);
  }

  // Draw Gate Time
  const gateText = pass.gateTime || config?.gateTime?.text;
  if (config?.gateTime?.enabled && gateText) {
    drawTextLayer(ctx, gateText, config.gateTime, width, height);
  }

  // Draw Allowed Entries / Limit
  const limitText = pass.allowedLimit || config?.allowedLimit?.text;
  if (config?.allowedLimit?.enabled && limitText) {
    drawTextLayer(ctx, limitText, config.allowedLimit, width, height);
  }

  // Draw Date Label
  const dateDisplay = pass.valid_date || eventDates[dayIndex] || config?.dateLabel?.text;
  if (config?.dateLabel?.enabled && dateDisplay) {
    drawTextLayer(ctx, dateDisplay, config.dateLabel, width, height);
  }

  return canvas;
}
