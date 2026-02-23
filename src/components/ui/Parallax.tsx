import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ParallaxProps {
  children: React.ReactNode;
  speed?: number; // Positive moves faster/up, negative moves slower/down relative to scroll (default 1)
  className?: string;
  id?: string;
}

export const Parallax: React.FC<ParallaxProps> = ({ 
  children, 
  speed = 1,
  className = '',
  id
}) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // We only enable parallax on non-touch devices for performance/smoothness
    const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    if (isTouch) return;

    const trigger = triggerRef.current;
    const target = targetRef.current;

    if (!trigger || !target) return;

    // The y movement is based on speed. A speed of 1 means very little movement, > 1 means moves faster than scroll, < 1 moves slower
    // We'll calculate a pixel offset based on window heights.
    
    // Y translation amount (pixels). You can tweak this multiplier to adjust the feel.
    const yVal = window.innerHeight * 0.3 * speed;

    const ctx = gsap.context(() => {
      gsap.fromTo(target, 
        { y: -yVal }, 
        {
          y: yVal,
          ease: 'none',
          scrollTrigger: {
            trigger: trigger,
            start: 'top bottom', // Start animating when the top of the trigger hits the bottom of the viewport
            end: 'bottom top',   // End animating when the bottom of the trigger hits the top of the viewport
            scrub: 1,            // Smooth scrubbing taking 1 second to catch up
            invalidateOnRefresh: true, // Recalculate values if window resized
          }
        }
      );
    }, trigger);

    return () => ctx.revert(); // Cleanup GSAP animations and ScrollTriggers on unmount
  }, [speed]);

  return (
    <div ref={triggerRef} className={`w-full h-full overflow-hidden ${className}`} id={id}>
      <div ref={targetRef} className="w-full h-full will-change-transform">
        {children}
      </div>
    </div>
  );
};
