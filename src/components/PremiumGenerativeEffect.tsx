import React, { useEffect, useRef } from 'react';

interface PremiumGenerativeEffectProps {
  type: 'hospitality' | 'money' | 'photography' | 'social' | 'stage' | 'reporter' | 'art' | 'logistics' | 'emcee';
  layer?: 'background' | 'foreground';
}

/**
 * Performance-optimized PremiumGenerativeEffect.
 * - Caps DPR at 1.5 to reduce fill-rate on high-DPI screens.
 * - Reduced particle counts by 50%.
 * - Wrapped in React.memo to prevent unnecessary re-renders.
 */
const PremiumGenerativeEffect: React.FC<PremiumGenerativeEffectProps> = React.memo(({ type, layer = 'background' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let mouseX = 0;
    let mouseY = 0;
    
    // Performance: Cap DPR at 1.5 to avoid rendering massive canvases on Retina displays
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) - 0.5;
      mouseY = (e.clientY / window.innerHeight) - 0.5;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    // Performance: Throttle resize slightly
    let resizeTimer: any;
    const throttledResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    };

    window.addEventListener('resize', throttledResize);
    resize();

    const isForeground = layer === 'foreground';
    const isMobile = width < 768;

    // Optimized Asset Draw Functions
    const drawFocusBrackets = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        const bSize = size / 2;
        ctx.beginPath(); 
        ctx.moveTo(-bSize, -bSize + 8); ctx.lineTo(-bSize, -bSize); ctx.lineTo(-bSize + 8, -bSize);
        ctx.moveTo(bSize, -bSize + 8); ctx.lineTo(bSize, -bSize); ctx.lineTo(bSize - 8, -bSize);
        ctx.moveTo(-bSize, bSize - 8); ctx.lineTo(-bSize, bSize); ctx.lineTo(-bSize + 8, bSize);
        ctx.moveTo(bSize, bSize - 8); ctx.lineTo(bSize, bSize); ctx.lineTo(bSize - 8, bSize);
        ctx.stroke();
        ctx.restore();
    };

    const drawApertureHex = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    };

    const drawHUDText = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = `${size/4}px monospace`;
        const labels = ["1/125", "ISO 400", "F/2.8", "4K", "AF-C"];
        ctx.fillText(labels[Math.floor(x % labels.length)], 0, 0);
        ctx.restore();
    };

    const drawMoneyNote = (ctx: CanvasRenderingContext2D, x: number, y: number, currency: 'INR' | 'USD', val: string, size: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        const color = currency === 'USD' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)';
        ctx.fillStyle = color;
        ctx.fillRect(-size, -size/2, size*2, size);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = `${size/2}px monospace`;
        ctx.fillText(`${currency === 'USD' ? '$' : '₹'}${val}`, -size + 4, size/4);
        ctx.restore();
    };

    const drawInstagramIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.strokeStyle = 'rgba(217, 70, 239, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-size/2, -size/2, size, size);
        ctx.beginPath(); ctx.arc(0, 0, size/4, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    };

    // Particle Logic
    class Particle {
        x: number; y: number; vx: number; vy: number; 
        size: number; life: number; opacity: number;
        type: string; rot: number; rotV: number;
        currency: 'INR' | 'USD' = 'INR';
        val: string = '500';

        constructor(theme: string) {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.2;
            this.vy = (Math.random() - 0.5) * 0.2;
            const scaleFactor = isMobile ? 0.5 : 0.8;
            this.size = (Math.random() * 50 + 30) * scaleFactor;
            this.life = Math.random() * 200 + 400;
            this.opacity = 0;
            this.type = theme;
            this.rot = Math.random() * Math.PI * 2;
            this.rotV = (Math.random() - 0.5) * 0.001;
            if (theme === 'money') {
                this.currency = Math.random() > 0.5 ? 'INR' : 'USD';
                this.val = this.currency === 'INR' ? '500' : '100';
            }
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.rot += this.rotV;
            this.life--;
            if (this.opacity < 1 && this.life > 50) this.opacity += 0.02;
            if (this.life < 50) this.opacity -= 0.02;

            if (this.x < -100 || this.x > width + 100 || this.y < -100 || this.y > height + 100 || this.life <= 0) {
                this.reset();
            }
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.life = Math.random() * 200 + 300;
            this.opacity = 0;
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.globalAlpha = Math.max(0, this.opacity);
            if (this.type === 'money') drawMoneyNote(ctx, this.x, this.y, this.currency, this.val, this.size, this.rot);
            else if (this.type === 'photography') {
                const r = (this.x + this.y) % 10;
                if (r < 4) drawFocusBrackets(ctx, this.x, this.y, this.size);
                else if (r < 7) drawApertureHex(ctx, this.x, this.y, this.size/2, this.rot);
                else drawHUDText(ctx, this.x, this.y, this.size);
            }
            else if (this.type === 'social') drawInstagramIcon(ctx, this.x, this.y, this.size, this.rot);
            // ... Add others as simple shapes if needed, keeping it lightweight
        }
    }

    const particles: Particle[] = [];
    // Performance: Reduced counts significantly
    const count = isMobile ? 4 : width < 1280 ? 8 : 12;
    for (let i = 0; i < count; i++) particles.push(new Particle(type));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      const parallaxFactor = isForeground ? 15 : 8;
      ctx.translate(mouseX * parallaxFactor, mouseY * parallaxFactor);

      particles.forEach(p => {
          p.update();
          p.draw(ctx);
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', throttledResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [type, layer]);

  return (
    <div className={`absolute inset-0 pointer-events-none ${layer === 'foreground' ? 'z-[50]' : 'z-0'}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full mix-blend-screen opacity-60" />
    </div>
  );
});

export default PremiumGenerativeEffect;
