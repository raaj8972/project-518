import React from 'react';

// Lightweight wrapper around threejs-toys particlesCursor
// Loads only on client and skips on devices without fine pointer

const isClient = typeof window !== 'undefined';

export const ParticlesCursor: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const destroyRef = React.useRef<(() => void) | null>(null);
  const pcRef = React.useRef<any | null>(null);

  React.useEffect(() => {
    if (!isClient) return;
    // Respect reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    // Skip on touch / coarse pointers for performance
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (!finePointer) return;
    // Skip on small screens (phones)
    if (window.innerWidth < 768) return;

    let cancelled = false;
    // Create a top-level overlay container attached to <body>
    const el = document.createElement('div');
    el.className = 'particles-cursor-layer';
    // Ensure it spans the viewport and never steals events
    Object.assign(el.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '60',
    } as CSSStyleDeclaration);
    document.body.appendChild(el);
    containerRef.current = el;

    const ensureScript = () => new Promise<void>((resolve, reject) => {
      if ((window as any).threejsToys) return resolve();
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/threejs-toys@0.0.8/build/threejs-toys.umd.cdn.min.js';
      s.async = true;
      const onLoad = () => {
        cleanup();
        resolve();
      };
      const onError = (ev?: Event | string | any) => {
        cleanup();
        const msg = ev && typeof ev === 'object' ? (ev.type || (ev as any).message || String(ev)) : String(ev);
        reject(new Error(`Failed to load threejs-toys script: ${msg}`));
      };
      const cleanup = () => {
        s.removeEventListener('load', onLoad);
        s.removeEventListener('error', onError as any);
      };

      s.addEventListener('load', onLoad);
      s.addEventListener('error', onError as any);
      document.head.appendChild(s);
    });

    ensureScript()
      .then(() => {
        if (cancelled) return;
        const lib = (window as any).threejsToys;
        const particlesCursor = lib && lib.particlesCursor;
        if (!particlesCursor || !containerRef.current) {
          console.warn('Particles cursor not initialized: library or container missing');
          return;
        }

        const pc = particlesCursor({
          el: containerRef.current,
          gpgpuSize: 512,
          // Match requested palette and parameters
          colors: [0x00ff00, 0x0000ff],
          color: 0xff0000,
          coordScale: 0.5,
          noiseIntensity: 0.001,
          noiseTimeCoef: 0.0001,
          pointSize: 5,
          pointDecay: 0.0025,
          sleepRadiusX: 250,
          sleepRadiusY: 250,
          sleepTimeCoefX: 0.001,
          sleepTimeCoefY: 0.002,
        });

        pcRef.current = pc;

        // capture destroy/cleanup if available
        if (pc && typeof pc.destroy === 'function') {
          destroyRef.current = pc.destroy.bind(pc);
        } else {
          destroyRef.current = () => {
            if (containerRef.current) containerRef.current.innerHTML = '';
          };
        }

        // Click-to-randomize behavior (matches provided sample)
        const handleClick = () => {
          try {
            const ref = pcRef.current;
            if (!ref || !ref.uniforms) return;
            ref.uniforms.uColor.value.set(Math.random() * 0xffffff);
            ref.uniforms.uCoordScale.value = 0.001 + Math.random() * 2;
            ref.uniforms.uNoiseIntensity.value = 0.0001 + Math.random() * 0.001;
            ref.uniforms.uPointSize.value = 1 + Math.random() * 10;
          } catch {}
        };
        document.body.addEventListener('click', handleClick);
        // Stash remover on destroy
        const prevDestroy = destroyRef.current;
        destroyRef.current = () => {
          try { document.body.removeEventListener('click', handleClick); } catch {}
          if (prevDestroy) prevDestroy();
        };
      })
      .catch((err) => {
        console.warn('Particles cursor failed to load:', err);
      });

    return () => {
      cancelled = true;
      if (destroyRef.current) {
        try { destroyRef.current(); } catch {}
      }
      // Remove overlay container
      if (el && el.parentNode) {
        try { el.parentNode.removeChild(el); } catch {}
      }
    };
  }, []);

  // Rendering via DOM node; nothing to render in React tree
  return null;
};

export default ParticlesCursor;
