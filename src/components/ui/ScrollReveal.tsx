import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
  children: React.ReactNode;
  animation?: 'fadeUp' | 'glitchReveal' | 'scaleIn';
  delay?: number;
  className?: string;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({ 
  children, 
  animation = 'fadeUp',
  delay = 0,
  className = ''
}) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    // A tiny timeout to ensure React gives it dimensions first
    const t = setTimeout(() => {
      let animProps: gsap.TweenVars = {};

      if (animation === 'fadeUp') {
        gsap.set(el, { opacity: 0, y: 50 });
        animProps = { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' };
      } 
      else if (animation === 'glitchReveal') {
        gsap.set(el, { opacity: 0, scale: 0.95, filter: 'blur(10px)' });
        animProps = { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'back.out(1.2)' };
      }
      else if (animation === 'scaleIn') {
        gsap.set(el, { opacity: 0, scale: 0.8, rotationX: 15 });
        animProps = { opacity: 1, scale: 1, rotationX: 0, duration: 0.7, ease: 'power2.out' };
      }

      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%', // trigger when element top hits 85% of viewport height
        animation: gsap.to(el, { ...animProps, delay }),
        once: true // Only animate once
      });
    }, 100);

    return () => {
      clearTimeout(t);
      ScrollTrigger.getAll().forEach(st => {
        if (st.trigger === el) st.kill();
      });
    };
  }, [animation, delay]);

  return (
    <div ref={elementRef} className={className} style={{ perspective: '1000px' }}>
      {children}
    </div>
  );
};
