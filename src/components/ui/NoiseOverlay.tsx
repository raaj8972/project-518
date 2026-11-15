import React from 'react';

/**
 * Performance-optimized NoiseOverlay.
 * Wrapped in React.memo to prevent unnecessary re-renders when the parent App shell
 * updates from context changes.
 */
export const NoiseOverlay: React.FC = React.memo(() => {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[99999] opacity-[0.03] mix-blend-overlay w-full h-full"
        // Reuse a small raster tile instead of filtering every viewport pixel.
        style={{ backgroundImage: 'url(/noise.png)', backgroundRepeat: 'repeat' }}
      />
      {/* Optional faint vignette to ground the cinematic look */}
      <div 
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[99998] w-full h-full mix-blend-multiply"
        style={{
          background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.3) 100%)'
        }}
      />
    </>
  );
});

export default NoiseOverlay;
