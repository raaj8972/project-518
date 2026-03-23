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
    const spacing = 65; // Increased spacing (from 45) to reduce point count by ~50%
    let cols = 0, rows = 0;

    const initPoints = () => {
      const parent = canvas.parentElement;
      width = parent?.clientWidth || window.innerWidth;
      height = parent?.clientHeight || window.innerHeight;
      
      // Use a lower resolution for the internal canvas buffer to save fill-rate
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * Math.min(dpr, 1.5); 
      canvas.height = height * Math.min(dpr, 1.5);
      ctx.scale(Math.min(dpr, 1.5), Math.min(dpr, 1.5));

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
      const maxDist = 200; // Reduced from 250
      const mouseX = mouse.x;
      const mouseY = mouse.y;

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        
        // Use squared distance for faster check
        const distSq = dx * dx + dy * dy;
        
        let pX = p.baseX + Math.sin(p.angle + time) * 12;
        let pY = p.baseY + Math.cos(p.angle + time) * 12;

        if (distSq < maxDist * maxDist) {
            const dist = Math.sqrt(distSq);
            const force = (maxDist - dist) / maxDist;
            pX -= (dx / dist) * force * 40;
            pY -= (dy / dist) * force * 40;
        }

        p.x += (pX - p.x) * 0.1;
        p.y += (pY - p.y) * 0.1;
      }

      // Draw lines
      ctx.lineWidth = 1;
      const mouseReach = 250; // Reduced from 300
      
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const idx = i * rows + j;
          const p = points[idx];
          
          // Pre-calculate squared distance for mouse reach once per point
          const distSqToMouse = (mouseX - p.x)**2 + (mouseY - p.y)**2;
          const reachSq = mouseReach * mouseReach;
          const isInReach = distSqToMouse < reachSq;

          // Draw right connection
          if (i < cols - 1) {
            const right = points[(i + 1) * rows + j];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(right.x, right.y);
            
            if (isInReach) {
                const intensity = 0.5 * (1 - Math.sqrt(distSqToMouse) / mouseReach);
                ctx.strokeStyle = `hsla(270, 90%, 65%, ${intensity})`; 
            } else {
                ctx.strokeStyle = 'rgba(99, 102, 241, 0.05)'; 
            }
            ctx.stroke();
          }
          // Draw bottom connection
          if (j < rows - 1) {
            const bottom = points[i * rows + (j + 1)];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(bottom.x, bottom.y);
            
            if (isInReach) {
                const intensity = 0.5 * (1 - Math.sqrt(distSqToMouse) / mouseReach);
                ctx.strokeStyle = `hsla(185, 100%, 50%, ${intensity})`;
            } else {
                ctx.strokeStyle = 'rgba(99, 102, 241, 0.05)';
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
