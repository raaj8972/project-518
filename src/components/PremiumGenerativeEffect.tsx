import React, { useEffect, useRef } from 'react';

interface PremiumGenerativeEffectProps {
  type: 'hospitality' | 'money' | 'photography' | 'social' | 'stage' | 'reporter' | 'art' | 'logistics' | 'emcee';
  layer?: 'background' | 'foreground';
}

const PremiumGenerativeEffect: React.FC<PremiumGenerativeEffectProps> = ({ type, layer = 'background' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let mouseX = 0;
    let mouseY = 0;
    let dpr = window.devicePixelRatio || 1;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) - 0.5;
      mouseY = (e.clientY / window.innerHeight) - 0.5;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    window.addEventListener('resize', resize);
    resize();

    const isForeground = layer === 'foreground';
    const isMobile = width < 768;

    // Asset Draw Functions (CINE HUD)
    const drawFocusBrackets = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        const bSize = size / 2;
        // Top Left
        ctx.beginPath(); ctx.moveTo(-bSize, -bSize + 10); ctx.lineTo(-bSize, -bSize); ctx.lineTo(-bSize + 10, -bSize); ctx.stroke();
        // Top Right
        ctx.beginPath(); ctx.moveTo(bSize, -bSize + 10); ctx.lineTo(bSize, -bSize); ctx.lineTo(bSize - 10, -bSize); ctx.stroke();
        // Bottom Left
        ctx.beginPath(); ctx.moveTo(-bSize, bSize - 10); ctx.lineTo(-bSize, bSize); ctx.lineTo(-bSize + 10, bSize); ctx.stroke();
        // Bottom Right
        ctx.beginPath(); ctx.moveTo(bSize, bSize - 10); ctx.lineTo(bSize, bSize); ctx.lineTo(bSize - 10, bSize); ctx.stroke();
        ctx.restore();
    };

    const drawApertureHex = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
        }
        ctx.closePath();
        ctx.stroke();
        // Internal aperture lines
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * size, Math.sin(angle) * size);
            ctx.lineTo(Math.cos(angle + 0.5) * (size * 0.4), Math.sin(angle + 0.5) * (size * 0.4));
            ctx.stroke();
        }
        ctx.restore();
    };

    const drawAnamorphicFlare = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
        ctx.save();
        ctx.translate(x, y);
        const grad = ctx.createLinearGradient(-size * 2, 0, size * 2, 0);
        grad.addColorStop(0, 'rgba(34, 211, 238, 0)');
        grad.addColorStop(0.5, 'rgba(34, 211, 238, 0.4)');
        grad.addColorStop(1, 'rgba(34, 211, 238, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(-size * 2, -1, size * 4, 2);
        // Center sparkle
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    const drawHUDText = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = `bold ${size/4}px monospace`;
        const labels = ["1/125", "ISO 400", "F/2.8", "4K", "RAW", "AF-C"];
        const text = labels[Math.floor((x + y) % labels.length)];
        ctx.fillText(text, 0, 0);
        // Small decorative rect
        ctx.strokeRect(-2, -size/4, size/2, size/4 + 4);
        ctx.restore();
    };

    const drawMoneyNote = (ctx: CanvasRenderingContext2D, x: number, y: number, currency: 'INR' | 'USD', val: string, size: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        
        // Color based on currency
        const color = currency === 'USD' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)';
        const strokeColor = currency === 'USD' ? 'rgba(34, 197, 94, 0.6)' : 'rgba(245, 158, 11, 0.6)';
        
        ctx.fillStyle = color;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.fillRect(-size, -size/2, size*2, size);
        ctx.strokeRect(-size, -size/2, size*2, size);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = `bold ${size/1.8}px monospace`;
        const symbol = currency === 'USD' ? '$' : '$';
        ctx.fillText(`${symbol}${val}`, -size + 8, 4);
        ctx.restore();
    };



    const drawInstagramIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.strokeStyle = 'rgba(217, 70, 239, 0.7)';
        ctx.lineWidth = 2.5;
        const r = size / 3;
        // Outer square
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-size/2, -size/2, size, size, r);
        } else {
            ctx.rect(-size/2, -size/2, size, size);
        }
        ctx.stroke();
        // Inner circle
        ctx.beginPath();
        ctx.arc(0, 0, size/4, 0, Math.PI * 2);
        ctx.stroke();
        // Camera dot
        ctx.beginPath();
        ctx.arc(size/4, -size/4, size/10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(217, 70, 239, 0.8)';
        ctx.fill();
        ctx.restore();
    };

    const drawStagePlatform = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
        ctx.lineWidth = 2;
        // 3D Perspective Stage
        ctx.beginPath();
        ctx.moveTo(-size, size/4);
        ctx.lineTo(size, size/4);
        ctx.lineTo(size * 0.8, -size/4);
        ctx.lineTo(-size * 0.8, -size/4);
        ctx.closePath();
        ctx.stroke();
        // Technical markings
        ctx.font = `bold ${size/4}px monospace`;
        ctx.fillStyle = 'rgba(168, 85, 247, 0.5)';
        ctx.fillText("STAGE PLOT v2.0", -size * 0.7, size/8);
        ctx.restore();
    };

    const drawSpeakerArray = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
        ctx.lineWidth = 2;
        // Line array boxes
        for(let i = 0; i < 4; i++) {
            ctx.strokeRect(-size/4, i * (size/3) - size/2, size/2, size/4);
        }
        // Hanging cables
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(0, -size/2);
        ctx.stroke();
        ctx.restore();
    };

    const drawSpotlight = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.6)';
        ctx.lineWidth = 2;
        // Light body
        ctx.beginPath();
        ctx.moveTo(-size/4, -size/4);
        ctx.lineTo(size/4, -size/4);
        ctx.lineTo(size/2, size/2);
        ctx.lineTo(-size/2, size/2);
        ctx.closePath();
        ctx.stroke();
        // Fresnel lens
        ctx.beginPath();
        ctx.arc(0, size/3, size/4, 0, Math.PI);
        ctx.stroke();
        ctx.restore();
    };

    const drawMicrophone = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        // Grille
        ctx.beginPath();
        ctx.arc(0, -size/4, size/3, 0, Math.PI * 2);
        ctx.stroke();
        // Handle
        ctx.strokeRect(-size/8, 0, size/4, size/2);
        // Switch
        ctx.fillRect(-size/16, size/8, size/8, size/6);
        // Sound waves
        ctx.beginPath();
        for(let i = 1; i <= 3; i++) {
            ctx.arc(0, -size/4, size/3 + i*6, -Math.PI/4, -Math.PI*3/4, true);
        }
        ctx.stroke();
        ctx.restore();
    };

    const drawTrussComplex = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
        ctx.lineWidth = 2;
        // Main rails
        ctx.beginPath(); ctx.moveTo(-size, -size/6); ctx.lineTo(size, -size/6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-size, size/6); ctx.lineTo(size, size/6); ctx.stroke();
        // Bracing
        ctx.beginPath();
        for(let i = -size; i < size; i += size/3) {
            ctx.moveTo(i, -size/6);
            ctx.lineTo(i + size/6, size/6);
            ctx.moveTo(i + size/6, -size/6);
            ctx.lineTo(i, size/6);
        }
        ctx.stroke();
        ctx.restore();
    };

    const drawTeaCup = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
        ctx.lineWidth = 2;
        // Cup body
        ctx.beginPath();
        ctx.arc(0, 0, size/2, 0, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-size/2, 0); ctx.lineTo(size/2, 0);
        ctx.stroke();
        // Handle
        ctx.beginPath();
        ctx.arc(size/2, -size/4, size/4, -Math.PI/2, Math.PI/2);
        ctx.stroke();
        // Steam
        ctx.beginPath();
        ctx.moveTo(-size/4, -size/2); ctx.quadraticCurveTo(-size/8, -size*0.7, -size/4, -size*0.8);
        ctx.moveTo(0, -size/2.5); ctx.quadraticCurveTo(size/8, -size*0.6, 0, -size*0.75);
        ctx.stroke();
        ctx.restore();
    };

    const drawSnake = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
        ctx.lineWidth = 2.5;
        // Wavy body
        ctx.beginPath();
        ctx.moveTo(-size/2, 0);
        ctx.bezierCurveTo(-size/4, -size/2, size/4, size/2, size/2, 0);
        ctx.stroke();
        // Head
        ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
        ctx.beginPath();
        ctx.ellipse(size/2, 0, size/6, size/10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tongue
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(size/2 + size/6, 0);
        ctx.lineTo(size/2 + size/3, -size/10);
        ctx.moveTo(size/2 + size/6, 0);
        ctx.lineTo(size/2 + size/3, size/10);
        ctx.stroke();
        ctx.restore();
    };

    const drawBed = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.6)';
        ctx.lineWidth = 2;
        // Mattress
        ctx.strokeRect(-size/2, -size/6, size, size/3);
        // Headboard
        ctx.beginPath();
        ctx.moveTo(-size/2, -size/6);
        ctx.lineTo(-size/2, -size/2);
        ctx.stroke();
        // Pillow
        ctx.strokeRect(-size/2.5, -size/4, size/3, size/10);
        // Legs
        ctx.beginPath();
        ctx.moveTo(-size/2, size/6); ctx.lineTo(-size/2, size/3);
        ctx.moveTo(size/2, size/6); ctx.lineTo(size/2, size/3);
        ctx.stroke();
        ctx.restore();
    };

    const drawArtBrush = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.strokeStyle = 'rgba(217, 70, 239, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-size/2, 0);
        ctx.quadraticCurveTo(0, -size/2, size/2, 0);
        ctx.stroke();
        ctx.restore();
    };

    // Particles/Elements Classes
    class Particle {
        x: number; y: number; vx: number; vy: number; 
        size: number; life: number; opacity: number;
        type: string; rot: number; rotV: number;
        currency: 'INR' | 'USD' = 'INR';
        val: string = '200';

        constructor(theme: string) {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            // Even slower movement
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
        const scaleFactor = isMobile ? 0.6 : 1;
        this.size = (Math.random() * 60 + 40) * scaleFactor;
        this.life = Math.random() * 200 + 300;
        this.opacity = 0;
        this.type = theme;
        this.rot = Math.random() * Math.PI * 2;
        // Even slower rotation
        this.rotV = (Math.random() - 0.5) * 0.002;
        if (theme === 'money') {
            this.currency = Math.random() > 0.5 ? 'INR' : 'USD';
            if (this.currency === 'INR') {
                this.val = Math.random() > 0.5 ? '500' : '200';
            } else {
                this.val = Math.random() > 0.5 ? '100' : '50';
            }
            this.size = (40 + Math.random() * 20) * scaleFactor;
        }
    }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.rot += this.rotV;
            this.life--;
            if (this.opacity < 1 && this.life > 20) this.opacity += 0.05;
            if (this.life < 20) this.opacity -= 0.05;

            if (this.x < -100 || this.x > width + 100 || this.y < -100 || this.y > height + 100 || this.life <= 0) {
                this.reset();
            }
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.life = Math.random() * 100 + 100;
            this.opacity = 0;
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.globalAlpha = Math.max(0, this.opacity);
            if (this.type === 'money') {
                drawMoneyNote(ctx, this.x, this.y, this.currency, this.val, this.size, this.rot);
            } else if (this.type === 'photography') {
                const rand = (this.x + this.y) % 10;
                if (rand < 3) drawFocusBrackets(ctx, this.x, this.y, this.size);
                else if (rand < 5) drawApertureHex(ctx, this.x, this.y, this.size/2, this.rot);
                else if (rand < 8) drawHUDText(ctx, this.x, this.y, this.size);
                else drawAnamorphicFlare(ctx, this.x, this.y, this.size);
            } else if (this.type === 'social' && isForeground) {
                drawInstagramIcon(ctx, this.x, this.y, this.size, this.rot);
                this.y -= 0.3; // Even slower float up
            } else if (this.type === 'hospitality') {
                const rand = (this.x + this.y) % 10;
                if (rand < 3.3) drawTeaCup(ctx, this.x, this.y, this.size/2, this.rot);
                else if (rand < 6.6) drawSnake(ctx, this.x, this.y, this.size/2, this.rot);
                else drawBed(ctx, this.x, this.y, this.size/2, this.rot);
            } else if (this.type === 'stage') {
                const rand = (this.x + this.y) % 10;
                if (rand < 3) drawStagePlatform(ctx, this.x, this.y, this.size, this.rot);
                else if (rand < 5) drawSpeakerArray(ctx, this.x, this.y, this.size, this.rot);
                else if (rand < 7) drawSpotlight(ctx, this.x, this.y, this.size, this.rot);
                else drawTrussComplex(ctx, this.x, this.y, this.size, this.rot);
            } else if (this.type === 'emcee') {
                const rand = (this.x + this.y) % 10;
                if (rand < 6) drawMicrophone(ctx, this.x, this.y, this.size/2, this.rot);
                else drawHUDText(ctx, this.x, this.y, this.size);
            } else if (this.type === 'art') {
                drawArtBrush(ctx, this.x, this.y, this.size, this.rot);
            }
        }
    }

    const particles: Particle[] = [];
    const count = isMobile ? 6 : width < 1280 ? 12 : 18;
    for (let i = 0; i < count; i++) particles.push(new Particle(type));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      ctx.save();
      const parallaxFactor = isForeground ? 20 : 10;
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
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [type, layer]);

  return (
    <div className={`absolute inset-0 pointer-events-none ${layer === 'foreground' ? 'z-[50]' : 'z-0'}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full mix-blend-screen" />
    </div>
  );
};

export default PremiumGenerativeEffect;
