import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface MagneticWrapperProps {
  children: React.ReactElement;
  strength?: number; // How far the element pulls (default: 40)
  textStrength?: number; // How far the inner text pulls relative to wrapper (default: 15)
  className?: string;
}

export const MagneticWrapper: React.FC<MagneticWrapperProps> = ({ 
  children, 
  strength = 40,
  textStrength = 15,
  className = ''
}) => {
  const magneticRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = magneticRef.current;
    if (!element) return;
    
    // We expect the direct child to act as the text/content container we can pull independently
    const innerContent = element.firstElementChild as HTMLElement;

    const xTo = gsap.quickTo(element, 'x', { duration: 1, ease: 'elastic.out(1, 0.3)' });
    const yTo = gsap.quickTo(element, 'y', { duration: 1, ease: 'elastic.out(1, 0.3)' });
    
    let xTextTo: ReturnType<typeof gsap.quickTo> | null = null;
    let yTextTo: ReturnType<typeof gsap.quickTo> | null = null;

    if (innerContent) {
      xTextTo = gsap.quickTo(innerContent, 'x', { duration: 1, ease: 'elastic.out(1, 0.3)' });
      yTextTo = gsap.quickTo(innerContent, 'y', { duration: 1, ease: 'elastic.out(1, 0.3)' });
    }

    const mouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { height, width, left, top } = element.getBoundingClientRect();
      // Calculate center of element
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      // Distance from center (-1 to 1 depending on where mouse is relative to bounds)
      const xDistance = (clientX - centerX) / (width / 2);
      const yDistance = (clientY - centerY) / (height / 2);

      xTo(xDistance * strength);
      yTo(yDistance * strength);

      if (xTextTo && yTextTo) {
        xTextTo(xDistance * textStrength);
        yTextTo(yDistance * textStrength);
      }
    };

    const mouseLeave = () => {
      xTo(0);
      yTo(0);
      if (xTextTo && yTextTo) {
        xTextTo(0);
        yTextTo(0);
      }
    };

    element.addEventListener('mousemove', mouseMove);
    element.addEventListener('mouseleave', mouseLeave);

    return () => {
      element.removeEventListener('mousemove', mouseMove);
      element.removeEventListener('mouseleave', mouseLeave);
    };
  }, [strength, textStrength]);

  return (
    <div ref={magneticRef} className={`inline-block ${className}`} style={{ willChange: 'transform' }}>
      {React.cloneElement(children, {
        style: { ...children.props.style, willChange: 'transform' }
      })}
    </div>
  );
};
