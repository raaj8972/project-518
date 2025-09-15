import React from 'react';

// Lightweight, GPU-friendly sparkle burst that orbits around a child element
const Sparkle3D: React.FC<{
  size?: number; // visual size of sparkle orbit
  color?: string; // css color
  intensity?: number; // number of particles (3-12 reasonable)
  className?: string;
}> = ({ size = 64, color = 'rgba(255, 105, 180, 0.9)', intensity = 6, className = '' }) => {
  const particles = React.useMemo(() => Array.from({ length: intensity }), [intensity]);

  return (
    <div
      className={`pointer-events-none absolute inset-0 ${className}`}
      aria-hidden
      style={{ filter: 'drop-shadow(0 0 8px rgba(255,105,180,0.35))' }}
    >
      {particles.map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full will-change-transform"
          style={{
            width: 3,
            height: 3,
            left: '50%',
            top: '50%',
            background: color,
            transformOrigin: '0 0',
            animation: `sparkle-orbit ${2.5 + (i % 3) * 0.4}s linear infinite`,
            // distribute starting angles
            rotate: `${(360 / intensity) * i}deg`,
            translate: `${size / 2}px 0`,
            opacity: 0.9,
          }}
        />
      ))}
      <style>{`
        @keyframes sparkle-orbit {
          0% { transform: rotate(0deg) translateX(0); }
          100% { transform: rotate(360deg) translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default Sparkle3D;
