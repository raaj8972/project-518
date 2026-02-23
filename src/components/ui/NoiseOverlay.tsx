import React from 'react';

export const NoiseOverlay: React.FC = () => {
  return (
    <>
      <svg
        className="pointer-events-none fixed inset-0 z-[99999] opacity-[0.03] mix-blend-overlay w-full h-full"
        style={{ filter: 'contrast(120%) brightness(120%)' }}
      >
        <filter id="noiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
      {/* Optional faint vignette to ground the cinematic look */}
      <div 
        className="pointer-events-none fixed inset-0 z-[99998] w-full h-full mix-blend-multiply"
        style={{
          background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.3) 100%)'
        }}
      />
    </>
  );
};
