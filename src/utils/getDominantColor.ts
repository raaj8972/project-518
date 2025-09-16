// Extracts the dominant color from an image URL using canvas
// Returns a promise that resolves to a CSS rgb/rgba string
export async function getDominantColor(url: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve('rgba(255,255,255,0.18)');
      ctx.drawImage(img, 0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      const [r, g, b] = data;
      resolve(`rgba(${r},${g},${b},0.22)`); // Stronger alpha for visible glow
    };
    img.onerror = function () {
      resolve('rgba(255,255,255,0.18)');
    };
  });
}
