import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export const CustomCursor: React.FC = () => {
  const cursorDot = useRef<HTMLDivElement>(null);
  const cursorRing = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Check if it's a touch device
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setIsTouchDevice(true);
      return;
    }

    // Set initial centering
    gsap.set(cursorDot.current, { xPercent: -50, yPercent: -50 });
    gsap.set(cursorRing.current, { xPercent: -50, yPercent: -50 });

    // Set up GSAP quickTo for performance
    const xToDot = gsap.quickTo(cursorDot.current, "x", { duration: 0.1, ease: "power3" });
    const yToDot = gsap.quickTo(cursorDot.current, "y", { duration: 0.1, ease: "power3" });
    const xToRing = gsap.quickTo(cursorRing.current, "x", { duration: 0.4, ease: "power3" });
    const yToRing = gsap.quickTo(cursorRing.current, "y", { duration: 0.4, ease: "power3" });

    const handleMouseMove = (e: MouseEvent) => {
      if (!isVisible) setIsVisible(true);
      xToDot(e.clientX);
      yToDot(e.clientY);
      xToRing(e.clientX);
      yToRing(e.clientY);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('a') || 
        target.closest('button') || 
        target.closest('input') || 
        target.closest('textarea') || 
        target.closest('[role="button"]') ||
        target.tagName.toLowerCase() === 'select'
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseover', handleMouseOver);

    // Hide default cursor globally
    const style = document.createElement('style');
    // Ensure text inputs can still show text cursor if needed, but overall we hide it to enforce the custom one
    style.innerHTML = `
      * { cursor: none !important; }
      input, textarea { cursor: text !important; }
    `;
    document.head.appendChild(style);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseover', handleMouseOver);
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, [isVisible]);

  // Hide the custom cursor if hovering over text elements so native text cursor displays
  useEffect(() => {
    const handleMouseOverText = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea') {
        gsap.to([cursorDot.current, cursorRing.current], { opacity: 0, duration: 0.2 });
      } else {
        gsap.to([cursorDot.current, cursorRing.current], { opacity: 1, duration: 0.2 });
      }
    };
    document.addEventListener('mouseover', handleMouseOverText);
    return () => document.removeEventListener('mouseover', handleMouseOverText);
  }, []);

  if (isTouchDevice) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100000] overflow-hidden" style={{ opacity: isVisible ? 1 : 0, transition: 'opacity 0.3s' }}>
      <div
        ref={cursorDot}
        className="absolute top-0 left-0 w-2 h-2 bg-fuchsia-400 rounded-full shadow-[0_0_10px_rgba(232,108,255,0.8)]"
      />
      <div
        ref={cursorRing}
        className={`absolute top-0 left-0 w-8 h-8 border border-cyan-400 rounded-full shadow-[0_0_15px_rgba(0,248,255,0.4)] transition-all duration-300 ${
          isHovering ? 'scale-[1.5] bg-cyan-400/20 border-fuchsia-400 shadow-[0_0_20px_rgba(232,108,255,0.6)]' : 'scale-100'
        }`}
      />
    </div>
  );
};
