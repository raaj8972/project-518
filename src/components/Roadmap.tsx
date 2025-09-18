import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { useData } from '../context/DataContext';

/*
  New Roadmap (Diagonal Zig‑Zag + Moving Rickshaw) 
  Style reference: Screenshot 1 (diagonal track + vehicle)
  Content reference: Screenshot 2 (years & bullet lists)

  Features:
  - Responsive SVG polyline forming diagonal zig‑zag across container
  - Rickshaw image (or fallback capsule) animates along path, loops
  - Milestone pins (MapPin) placed proportionally along total length
  - Alternating content blocks (left/right of path) with year + bullets
  - Glow + dashed inner lane similar to road metaphor
  - Accessible (aria labels, reduced motion respect)

  Assumptions (can be changed later):
  - Loop duration 18s
  - Equal spacing of milestones along path
  - Provide optional vehicleImage prop (PNG / SVG). If not supplied, fallback.
*/

type Milestone = {
  year: string;
  lines: string[];
};

// Local fallback if DB empty
const FALLBACK_MILESTONES: Milestone[] = [
  { year: '2015', lines: ['Biggest ever in History of RICORRENZA', 'Radiant Glow Bands', 'National Artists', 'Indo Western Band'] },
  { year: '2017', lines: ['20+ events', '500+ participants', '3 days of cultural extravaganza'] },
  { year: '2019', lines: ['Bollywood Artist Mohammad Irfan', 'Bengals Favourite Anupam Roy', 'Waves in Town Band', '10000+ Footfall'] },
  { year: '2022', lines: ['Develop branding & marketing campaigns', '1000+ Footfall', 'DJ Night', 'Guest Artists'] },
  { year: '2023', lines: ['Bollywood Artist Amit Mishra', 'Ehsaas India Band', 'DJ Nights', 'College Band Homeground'] },
  { year: '2025', lines: ['Commencement of Ricorrenza'] }
];

interface RoadmapProps {
  vehicleImage?: string; // path to rickshaw image
  height?: number; // px height of the container
  durationMs?: number; // animation loop duration
  vehicleSize?: number; // square size in px
  offsetAlong?: number; // shift along the path direction after rotation (px)
  offsetNormal?: number; // shift perpendicular to path (px) after rotation (positive = to the right of direction)
  textDistance?: number; // horizontal distance of text block from road edge
  textNormalDistance?: number; // perpendicular distance of text block from path center
}

const DEFAULT_HEIGHT = 1200;

const ROAD_WIDTH = 90; // stroke width of outer base (matches path strokeWidth below)
// Edge padding so rounded caps appear visually flush; reduce extra gap for better edge alignment
const EDGE_PAD = ROAD_WIDTH * 0.5; 

const buildPathD = (w: number, h: number) => {
  // dynamic zig-zag based on width/height percentages
  // Four points: left→right→left→right with vertical progression
  const pts = [
    `M ${EDGE_PAD} 0`,
    `L ${w - EDGE_PAD} ${h * 0.29}`,
    `L ${EDGE_PAD} ${h * 0.58}`,
    `L ${w - EDGE_PAD} ${h * 0.87}`
  ];
  return pts.join(' ');
};

const Roadmap: React.FC<RoadmapProps> = ({
  vehicleImage,
  height = DEFAULT_HEIGHT,
  durationMs = 18000,
  vehicleSize = 80,
  offsetAlong = 10,
  offsetNormal = -6,
  textDistance = 120, // legacy horizontal distance
  textNormalDistance = 130
}) => {
  const { roadmapMilestones } = useData();
  const MILESTONES: Milestone[] = useMemo(() => {
    if (roadmapMilestones && roadmapMilestones.length) {
      return roadmapMilestones
        .filter(m => m.enabled !== false)
        .sort((a,b) => a.order_position - b.order_position)
        .map(m => ({
          year: String(m.year),
          lines: m.points && m.points.length ? m.points : [m.title || String(m.year)]
        }));
    }
    return FALLBACK_MILESTONES;
  }, [roadmapMilestones]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const vehicleRef = useRef<HTMLDivElement | null>(null);
  const [positions, setPositions] = useState<{ x: number; y: number; angle: number }[]>([]); // path coords (viewBox space)
  const [scale, setScale] = useState({ x: 1, y: 1 });
  const [viewWidth, setViewWidth] = useState(1200); // dynamic width
  const [containerWidth, setContainerWidth] = useState(0); // pixel width for overflow checks
  // Mobile responsiveness heuristics
  const isMobile = containerWidth > 0 && containerWidth < 640;
  const effectiveHeight = isMobile ? Math.min(height, 900) : height; // reduce vertical scroll load on small screens
  const milestoneWidth = isMobile ? 240 : 340;
  const sideNormalDistance = isMobile ? Math.min(textNormalDistance, 90) : textNormalDistance;

  const pathD = buildPathD(viewWidth, effectiveHeight);
  const [activeIndex, setActiveIndex] = useState(0);
  // Reveal state for each milestone (years + content)
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const revealedRef = useRef<boolean[]>([]);
  const prevProgressRef = useRef(0);
  const lengthRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Animate only when in view
  const [inView, setInView] = useState(false);

  // Helper to place vehicle at a specific progress (0..1) without animation loop
  const positionVehicle = (progress: number) => {
    const path = pathRef.current; const vehicle = vehicleRef.current; if (!path || !vehicle) return;
    const length = lengthRef.current || path.getTotalLength();
    const l = progress * length;
    const pt = path.getPointAtLength(l);
    const ahead = path.getPointAtLength(Math.min(l + 2, length));
    const dx = ahead.x - pt.x; const dy = ahead.y - pt.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const sx = scale.x; const sy = scale.y;
    const vx = pt.x * sx; const vy = pt.y * sy;
    vehicle.style.left = `${vx}px`;
    vehicle.style.top = `${vy}px`;
    vehicle.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translate(${offsetAlong}px, ${offsetNormal}px)`;
  };

  // Precompute milestone positions along path
  useEffect(() => {
    const path = pathRef.current; if (!path) return;
    const length = path.getTotalLength();
    lengthRef.current = length;
    const arr: { x: number; y: number; angle: number }[] = [];
    MILESTONES.forEach((_, i) => {
      const t = i / (MILESTONES.length - 1);
      const l = t * length;
      const pt = path.getPointAtLength(l);
      // small delta ahead to estimate tangent
      const delta = 1;
      const ahead = path.getPointAtLength(Math.min(l + delta, length));
      const angle = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * (180 / Math.PI);
      arr.push({ x: pt.x, y: pt.y, angle });
    });
    setPositions(arr);
    // initialize reveal state for new milestones
    const init = Array(MILESTONES.length).fill(false) as boolean[];
    revealedRef.current = init;
    setRevealed(init);
  }, [pathD, MILESTONES.length]);

  // Track scaling between SVG viewBox and rendered size to keep vehicle & milestones centered on path
  // Measure container width & update viewBox + scaling
  useEffect(() => {
    const handleResize = () => {
      const el = containerRef.current; if (!el) return;
      const w = el.clientWidth;
      setContainerWidth(w);
      setViewWidth(w < 600 ? 600 : w); // enforce a min width to maintain shape
      const svg = svgRef.current; if (!svg) return;
      const rect = svg.getBoundingClientRect();
    setScale({ x: rect.width / (w < 600 ? 600 : w), y: rect.height / effectiveHeight });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [effectiveHeight]);

  // Observe visibility to gate animation
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setInView(entry.isIntersecting);
      },
      { root: null, threshold: 0.25, rootMargin: '0px 0px -10% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Vehicle animation
  useEffect(() => {
    if (reducedMotion) { // place vehicle statically at start and reveal everything
      positionVehicle(0);
      const all = Array(MILESTONES.length).fill(true) as boolean[];
      revealedRef.current = all;
      setRevealed(all);
      return;
    }
    // If not in view, pause and reset to start position
    if (!inView) {
      positionVehicle(0);
      startRef.current = null;
      prevProgressRef.current = 0;
      return;
    }
    const path = pathRef.current; if (!path) return;
    const vehicle = vehicleRef.current; if (!vehicle) return;
    let raf: number;
    const animate = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = (elapsed % durationMs) / durationMs; // 0..1
      positionVehicle(progress);

      // Track active milestone for pin highlighting
      const idx = Math.min(MILESTONES.length - 1, Math.floor(progress * MILESTONES.length));
      if (idx !== activeIndex) setActiveIndex(idx);

      // Progressive reveal: reveal a milestone shortly after the vehicle passes its position
      const current = revealedRef.current.slice();
      let changed = false;
      for (let i = 0; i < MILESTONES.length; i++) {
        if (!current[i]) {
          const threshold = (i + 0.2) / MILESTONES.length; // reveal when ~20% past the milestone boundary
          if (progress >= threshold || prevProgressRef.current > progress) { // also reveal on loop wrap
            current[i] = true;
            changed = true;
          }
        }
      }
      if (changed) {
        revealedRef.current = current;
        setRevealed(current);
      }

      // Remember previous progress to detect loop wraparound
      prevProgressRef.current = progress;

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, reducedMotion, inView, scale.x, scale.y, offsetAlong, offsetNormal, MILESTONES.length]);

  return (
  <section id="roadmap" className="relative w-full overflow-hidden py-24 bg-[#06121c]" aria-label="Ricorrenza Roadmap">
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, #1b3a4d 0%, transparent 60%)' }} />
      <div className="px-4">
        <h2 className="text-4xl md:text-5xl font-black text-center mb-16 tracking-tight text-white">
          <span className="relative inline-block">
            RICORRENZA ROADMAP
            <span className="absolute inset-x-0 -bottom-2 h-1 bg-gradient-to-r from-pink-500 via-indigo-400 to-cyan-400 rounded-full blur-[2px]" />
          </span>
        </h2>
      </div>
        {/* Full-width path container (no max-width constraint) */}
        <div className="relative w-full" style={{ height: effectiveHeight }} ref={containerRef}>
          <svg ref={svgRef} viewBox={`0 0 ${viewWidth} ${effectiveHeight}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#352d62" />
                <stop offset="50%" stopColor="#2d3f7a" />
                <stop offset="100%" stopColor="#233d85" />
              </linearGradient>
              <linearGradient id="dashGradRoad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
              <filter id="roadGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#4338ca" floodOpacity="0.45" />
              </filter>
            </defs>
            {/* Road base */}
            <path d={pathD} ref={pathRef} stroke="url(#roadGrad)" strokeWidth={ROAD_WIDTH} fill="none" strokeLinecap="round" filter="url(#roadGlow)" shapeRendering="geometricPrecision" vectorEffect="non-scaling-stroke" />
            <path d={pathD} stroke="#0d1420" strokeWidth={ROAD_WIDTH - 20} fill="none" strokeLinecap="round" shapeRendering="geometricPrecision" vectorEffect="non-scaling-stroke" />
            <path d={pathD} stroke="url(#dashGradRoad)" strokeWidth={8} strokeDasharray="28 28" strokeLinecap="round" fill="none" className="animate-[dash_10s_linear_infinite] mix-blend-screen" shapeRendering="geometricPrecision" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* Milestones */}
          {positions.map((pos, i) => {
            const milestone = MILESTONES[i];
            const baseLeftSide = i % 2 === 0; // initial alternating preference
            const active = i === activeIndex;
            const isRevealed = revealed[i];
            const sx = scale.x; const sy = scale.y;
            const px = pos.x * sx; const py = pos.y * sy;
            // Use path angle to compute a normal so text sits truly to the side of the road
            const theta = pos.angle * Math.PI / 180; // path tangent angle
            const nx = -Math.sin(theta); // normal x
            const ny = Math.cos(theta);  // normal y
            const normalDist = sideNormalDistance ?? textDistance; // responsive adjusted distance

            // Precompute candidate anchor X positions for left and right side
            const candidateLeftX = px + nx * normalDist * -1;
            const candidateRightX = px + nx * normalDist * 1;
            const candidateLeftY = py + ny * normalDist * -1;
            const candidateRightY = py + ny * normalDist * 1;

            // Decide which side to use to avoid clipping
            const halfWidth = milestoneWidth / 2; // responsive half width
            const margin = 24; // minimal horizontal margin from screen edge
            // Determine forced side from DB metadata if available
            const raw = roadmapMilestones.find(r => String(r.year) === milestone.year);
            const sideSetting = raw?.side; // 'left' | 'right' | 'auto'
            const forceLeft = sideSetting === 'left';
            const forceRight = sideSetting === 'right';
            let leftSide = forceLeft ? true : (forceRight ? false : baseLeftSide);
            if (containerWidth > 0 && !forceLeft && !forceRight) {
              const overflowLeftIfLeft = (candidateLeftX - halfWidth) < margin;
              const overflowRightIfLeft = (candidateLeftX + halfWidth) > (containerWidth - margin);
              const overflowLeftIfRight = (candidateRightX - halfWidth) < margin;
              const overflowRightIfRight = (candidateRightX + halfWidth) > (containerWidth - margin);
              // Flip if preferred side overflows and the opposite doesn't
              if (leftSide && (overflowLeftIfLeft || overflowRightIfLeft) && !(overflowLeftIfRight || overflowRightIfRight)) {
                leftSide = false;
              } else if (!leftSide && (overflowLeftIfRight || overflowRightIfRight) && !(overflowLeftIfLeft || overflowRightIfLeft)) {
                leftSide = true;
              }
            }

            // Choose final anchor based on resolved side
            let anchorX = leftSide ? candidateLeftX : candidateRightX;
            let anchorY = leftSide ? candidateLeftY : candidateRightY;
            if (forceLeft && milestone.year === '2025') {
              // Preserve special outward shift for 2025 hero milestone
              anchorX -= 24;
            }
            // Clamp inside viewport to be safe
            if (containerWidth > 0) {
              const minX = margin + halfWidth;
              const maxX = containerWidth - margin - halfWidth;
              if (anchorX < minX) anchorX = minX;
              if (anchorX > maxX) anchorX = maxX;
            }
            return (
              <div
                key={milestone.year}
                className="absolute"
                style={{ left: anchorX, top: anchorY, transform: 'translate(-50%, -50%)' }}
              >
                <div className={`transition-all duration-700 ease-out ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
                {/* Pin positioned back toward the path center */}
                <div className="absolute" style={{ left: leftSide ? '100%' : 'auto', right: leftSide ? 'auto' : '100%', top: 14 }}>
                  <MapPin className={`w-7 h-7 ${active ? 'text-yellow-300' : 'text-slate-300/70'} drop-shadow-[0_0_6px_rgba(255,255,255,0.3)] transition-colors`} />
                </div>
                <div style={{ width: milestoneWidth }} className={`${leftSide ? 'text-right pr-4 md:pr-6' : 'text-left pl-4 md:pl-6'} select-none`}>
                  <h3
                    className={`font-black tracking-tight ${isMobile ? 'text-xl' : 'text-2xl'} mb-2 ${active ? 'text-yellow-300' : 'text-slate-200'} transition-all duration-700`}
                    style={{ transitionDelay: isRevealed ? '80ms' : '0ms' }}
                  >
                    {milestone.year}
                  </h3>
                  <ul className={`space-y-1 ${isMobile ? 'text-[11px]' : 'text-[13px]'} leading-snug text-slate-300`}>
                    {milestone.lines.map((l, j) => (
                      <li
                        key={j}
                        className={`transition-all duration-500 ${active ? 'opacity-100' : 'opacity-80'} ${isRevealed ? 'translate-x-0 opacity-100' : (leftSide ? 'translate-x-2 opacity-0' : '-translate-x-2 opacity-0')}`}
                        style={{ transitionDelay: isRevealed ? `${120 + j * 80}ms` : '0ms' }}
                      >
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
                </div>
              </div>
            );
          })}

          {/* Vehicle */}
          <div
            ref={vehicleRef}
            aria-hidden="true"
            className="absolute z-10 will-change-transform"
            style={{ left: 0, top: 0, width: vehicleSize, height: vehicleSize }}
          >
            {vehicleImage ? (
              <img
                src={vehicleImage}
                alt="Rickshaw"
                className="w-full h-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)]"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                draggable={false}
              />
            ) : null}
            {/* Fallback / overlay frame */}
            {!vehicleImage && (
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 border border-amber-300 flex items-center justify-center relative shadow-[0_0_0_3px_rgba(255,255,255,0.15)_inset,0_6px_14px_-4px_rgba(0,0,0,0.6)]">
                <span className="text-[10px] font-black text-black tracking-tight select-none">AUTO</span>
                <div className="absolute inset-0 pointer-events-none rounded-xl bg-gradient-to-tr from-white/20 via-transparent to-transparent mix-blend-overlay" />
              </div>
            )}
          </div>
        </div>
      <style>{`
        @keyframes dash { to { stroke-dashoffset: -800; } }
      `}</style>
    </section>
  );
};

export { Roadmap };
export default Roadmap;
