import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

interface KineticTextProps {
  children: string;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
  intensity?: number;
}

export const KineticText: React.FC<KineticTextProps> = ({ 
  children, 
  className = '', 
  as: Tag = 'h1',
  intensity = 0.03
}) => {
  const textRef = useRef<HTMLElement>(null);
  const filterId = useRef(`kinetic-filter-${Math.random().toString(36).substr(2, 9)}`).current;
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const animRef = useRef({ val: 0.01 });

  useEffect(() => {
    if (!turbulenceRef.current) return;

    // We animate the baseFrequency of the turbulence to create a liquid/rippling effect
    if (isHovered) {
      gsap.to(animRef.current, {
        val: intensity,
        duration: 0.8,
        ease: 'power2.out',
        onUpdate: () => {
          if (turbulenceRef.current) {
            turbulenceRef.current.setAttribute('baseFrequency', `${animRef.current.val} ${animRef.current.val * 1.5}`);
          }
        }
      });
    } else {
      gsap.to(animRef.current, {
        val: 0.001, // Near zero so it looks normal
        duration: 1.2,
        ease: 'power3.out',
        onUpdate: () => {
          if (turbulenceRef.current) {
            turbulenceRef.current.setAttribute('baseFrequency', `${animRef.current.val} ${animRef.current.val}`);
          }
        }
      });
    }
  }, [isHovered, intensity]);

  return (
    <div 
      className="relative inline-block" 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg className="absolute w-0 h-0 pointer-events-none">
        <filter id={filterId}>
          <feTurbulence 
            ref={turbulenceRef}
            type="fractalNoise" 
            baseFrequency="0.001 0.001" 
            numOctaves="2" 
            result="warp" 
          />
          <feDisplacementMap 
            xChannelSelector="R" 
            yChannelSelector="G" 
            scale={isHovered ? 40 : 10} 
            in="SourceGraphic" 
            in2="warp" 
          />
        </filter>
      </svg>
      {React.createElement(
        Tag,
        {
          ref: textRef as any,
          className: `transition-all duration-700 ${className}`,
          style: { filter: `url(#${filterId})` },
        },
        children
      )}
    </div>
  );
};
