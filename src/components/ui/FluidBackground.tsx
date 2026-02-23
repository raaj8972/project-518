import React, { useEffect, useRef } from 'react';

export const FluidBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let mouse = { x: -1000, y: -1000 };
    let time = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    
    let points: any[] = [];
    const spacing = 45; // Spacing of the fluid grid
    let cols = 0, rows = 0;

    const initPoints = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      points = [];
      cols = Math.floor(width / spacing) + 1;
      rows = Math.floor(height / spacing) + 1;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          points.push({
            x: i * spacing,
            y: j * spacing,
            baseX: i * spacing,
            baseY: j * spacing,
            angle: Math.random() * Math.PI * 2
          });
        }
      }
    };

    window.addEventListener('resize', initPoints);
    initPoints();

    let animationFrameId: number;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.015;

      // Update points
      points.forEach(p => {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const maxDist = 250;
        // Natural drifting (fluid noise)
        let pX = p.baseX + Math.sin(p.angle + time) * 15;
        let pY = p.baseY + Math.cos(p.angle + time) * 15;

        // Mouse interaction (repulsion)
        if (dist < maxDist) {
            const force = (maxDist - dist) / maxDist;
            pX -= (dx / dist) * force * 50;
            pY -= (dy / dist) * force * 50;
        }

        // Elastic return
        p.x += (pX - p.x) * 0.1;
        p.y += (pY - p.y) * 0.1;
      });

      // Draw lines
      ctx.lineWidth = 1;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const idx = i * rows + j;
          const p = points[idx];
          
          if (i < cols - 1) {
            const right = points[(i + 1) * rows + j];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(right.x, right.y);
            
            const dist = Math.hypot(mouse.x - p.x, mouse.y - p.y);
            if(dist < 300) {
                const intensity = 0.6 * (1 - dist/300);
                ctx.strokeStyle = `rgba(168, 85, 247, ${intensity})`; // Purple glow
            } else {
                ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)'; // Dull indigo
            }
            ctx.stroke();
          }
          if (j < rows - 1) {
            const bottom = points[i * rows + (j + 1)];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(bottom.x, bottom.y);
            const dist = Math.hypot(mouse.x - p.x, mouse.y - p.y);
            if(dist < 300) {
                const intensity = 0.6 * (1 - dist/300);
                ctx.strokeStyle = `rgba(0, 248, 255, ${intensity})`; // Cyan glow
            } else {
                ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
            }
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', initPoints);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none z-0" 
      style={{ mixBlendMode: 'screen' }} 
    />
  );
};
