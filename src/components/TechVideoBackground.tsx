import React, { useEffect, useRef } from 'react';

interface TechVideoBackgroundProps {
  layer?: 'background' | 'foreground';
}

const TechVideoBackground: React.FC<TechVideoBackgroundProps> = ({ layer = 'background' }) => {
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
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
    };

    window.addEventListener('resize', resize);
    resize();

    const isForeground = layer === 'foreground';
    const isMobile = width < 768;

    // --- HUD Components ---

    class RotatingRing {
        size: number;
        speed: number;
        dash: number[];
        rot: number;
        color: string;
        x: number; y: number;

        constructor() {
            this.size = Math.random() * (isMobile ? 150 : 300) + 100;
            this.speed = (Math.random() - 0.5) * 0.005;
            this.dash = [Math.random() * 50 + 10, Math.random() * 50 + 20];
            this.rot = Math.random() * Math.PI * 2;
            this.color = 'rgba(34, 211, 238, ' + (Math.random() * 0.2 + 0.1) + ')';
            this.x = Math.random() * width;
            this.y = Math.random() * height;
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.save();
            ctx.translate(this.x + mouseX * 50, this.y + mouseY * 50);
            ctx.rotate(this.rot);
            ctx.strokeStyle = this.color;
            ctx.setLineDash(this.dash);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.stroke();
            
            // Inner decorative ticks
            if (this.size > 150) {
                ctx.setLineDash([]);
                for (let i = 0; i < 4; i++) {
                    ctx.rotate(Math.PI / 2);
                    ctx.beginPath();
                    ctx.moveTo(this.size - 20, 0);
                    ctx.lineTo(this.size + 5, 0);
                    ctx.stroke();
                }
            }
            ctx.restore();
            this.rot += this.speed;
        }
    }

    class DataNode {
        // ... (previous properties)
        x: number; y: number; bx: number; by: number;
        size: number;
        opacity: number;
        pulse: number;
        text: string;

        constructor() {
            this.bx = Math.random() * width;
            this.by = Math.random() * height;
            this.x = this.bx;
            this.y = this.by;
            this.size = Math.random() * 5 + 2;
            this.opacity = Math.random() * 0.5 + 0.2;
            this.pulse = Math.random() * Math.PI * 2;
            const codes = ["0xFA", "SYS", "SYNC", "1011", "DAT", "CORE"];
            this.text = codes[Math.floor(Math.random() * codes.length)];
        }

        update() {
            this.pulse += 0.02;
            this.x = this.bx + Math.sin(this.pulse) * 10;
            this.y = this.by + Math.cos(this.pulse) * 10;
        }

        draw(ctx: CanvasRenderingContext2D) {
            const currentOpacity = this.opacity * (0.5 + Math.sin(this.pulse) * 0.5);
            ctx.save();
            ctx.translate(this.x + mouseX * 30, this.y + mouseY * 30);
            ctx.globalAlpha = currentOpacity;
            
            ctx.fillStyle = '#22d3ee';
            ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
            
            ctx.font = '8px monospace';
            ctx.fillText(this.text, this.size + 5, 3);
            
            ctx.restore();
        }
    }

    class Spark {
        x: number; y: number; vy: number;
        len: number;
        opacity: number;

        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vy = -(Math.random() * 2 + 1);
            this.len = Math.random() * 20 + 10;
            this.opacity = Math.random() * 0.5 + 0.5;
        }

        update() {
            this.y += this.vy;
            if (this.y < -50) {
                this.y = height + 50;
                this.x = Math.random() * width;
            }
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x, this.y + this.len);
            ctx.stroke();
            
            // Glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#22d3ee';
            ctx.stroke();
            ctx.restore();
        }
    }

    const rings: RotatingRing[] = Array.from({ length: isMobile ? 3 : 6 }, () => new RotatingRing());
    const nodes: DataNode[] = Array.from({ length: isMobile ? 10 : 25 }, () => new DataNode());
    const sparks: Spark[] = isForeground ? Array.from({ length: 15 }, () => new Spark()) : [];

    const drawGrid = () => {
        ctx.save();
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.05)';
        ctx.lineWidth = 1;
        
        const step = isMobile ? 60 : 100;
        const pX = mouseX * 20;
        const pY = mouseY * 20;

        // Perspective grid lines
        for (let i = -step; i < width + step; i += step) {
            ctx.beginPath();
            ctx.moveTo(i + pX, 0);
            ctx.lineTo(i + pX * 2, height);
            ctx.stroke();
        }
        for (let i = -step; i < height + step; i += step) {
            ctx.beginPath();
            ctx.moveTo(0, i + pY);
            ctx.lineTo(width, i + pY * 2);
            ctx.stroke();
        }
        ctx.restore();
    };

    const render = () => {
        if (layer === 'background') {
            ctx.fillStyle = '#030712';
            ctx.fillRect(0, 0, width, height);
            drawGrid();
        } else {
            ctx.clearRect(0, 0, width, height);
        }

        rings.forEach(r => r.draw(ctx));
        nodes.forEach(n => {
            n.update();
            n.draw(ctx);
        });
        sparks.forEach(s => {
            s.update();
            s.draw(ctx);
        });

        // Foreground sparks logic remains if in foreground
        if (isForeground) {
            // Add technical scanline
            ctx.fillStyle = 'rgba(34, 211, 238, 0.03)';
            const scanY = (Date.now() / 20) % height;
            ctx.fillRect(0, scanY, width, 2);
        }

        animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [layer]);

  return (
    <div className={`absolute inset-0 pointer-events-none ${layer === 'foreground' ? 'z-[50]' : 'z-0'}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full mix-blend-screen" />
      {layer === 'background' && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(3,7,18,0.6)_100%)]" />
      )}
    </div>
  );
};

export default TechVideoBackground;
