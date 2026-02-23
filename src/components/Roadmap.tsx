import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { useData } from '../context/DataContext';
import { BRAND_YEAR } from '../constants/brand';

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
  { year: BRAND_YEAR, lines: ['Commencement of Ricorrenza'] }
];

interface RoadmapProps {
  vehicleImage?: string; // path to vehicle image or video
  vehicleAudio?: string; // path to audio file for vehicle sound
  height?: number; // px height of the container
  durationMs?: number; // animation loop duration
  vehicleSize?: number; // square size in px
  offsetAlong?: number; // shift along the path direction after rotation (px)
  offsetNormal?: number; // shift perpendicular to path (px) after rotation (positive = to the right of direction)
  textDistance?: number; // horizontal distance of text block from road edge
  textNormalDistance?: number; // perpendicular distance of text block from path center
}



const ROAD_WIDTH = 90; // stroke width of outer base (matches path strokeWidth below)
// Edge padding so rounded caps appear visually flush; using dynamic padding inside component.

const buildPathD = (w: number, h: number, segments: number, edgePad: number) => {
  const pts = [`M ${edgePad} 0`];
  for (let i = 1; i <= segments; i++) {
    const x = i % 2 === 0 ? edgePad : w - edgePad;
    const y = (i / segments) * h;
    pts.push(`L ${x} ${y}`);
  }
  // To make it "never ending", add one last segment pointing straight down or off-screen
  pts.push(`L ${segments % 2 !== 0 ? edgePad : w - edgePad} ${h + 200}`);
  return pts.join(' ');
};

const DigitalGrid = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
    <div className="absolute inset-0" style={{ 
      backgroundImage: `linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
      backgroundSize: '40px 40px'
    }} />
    <div className="absolute inset-0 bg-gradient-to-b from-[#06121c] via-transparent to-[#06121c]" />
  </div>
);



const Roadmap: React.FC<RoadmapProps> = ({
  vehicleImage,
  vehicleAudio,
  height, // will use dynamic height if not provided
  durationMs, // dynamic if not provided
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [positions, setPositions] = useState<{ x: number; y: number; angle: number }[]>([]); // path coords (viewBox space)
  const [viewWidth, setViewWidth] = useState(1200); // dynamic width
  const [containerWidth, setContainerWidth] = useState(0); // pixel width for overflow checks
  // Mobile responsiveness heuristics
  const isMobile = containerWidth > 0 && containerWidth < 640;
  const isTablet = containerWidth >= 640 && containerWidth < 1024;

  // DYNAMIC SCALING: Height is now proportional to milestone count
  const dynamicHeight = Math.max(1200, MILESTONES.length * (isMobile ? 360 : isTablet ? 400 : 450));
  const ROAD_TAIL = isMobile ? 500 : 650; // extra room for "infinite" feel on bigger screens
  const containerHeight = height || (isMobile ? Math.min(dynamicHeight, 4000) : dynamicHeight);
  const roadHeight = containerHeight - ROAD_TAIL;
  
  // Adaptive segments: maintain road slope (approx 450px per segment for desktop, 380px for mobile)
  const segmentCount = Math.max(3, Math.ceil(roadHeight / (isMobile ? 380 : 450)));
  
  // Responsive milestone sizing
  const milestoneWidth = isMobile ? 180 : isTablet ? 260 : 340;
  const sideNormalDistance = isMobile ? 50 : isTablet ? 90 : textNormalDistance;
  
  // Responsive Roadmap Pad (Physical path width)
  const dynamicRoadWidth = isMobile ? 50 : isTablet ? 70 : 90;
  const dynamicEdgePad = dynamicRoadWidth * 0.6;

  const pathD = buildPathD(viewWidth, roadHeight, segmentCount, dynamicEdgePad);
  const [activeIndex, setActiveIndex] = useState(0);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const revealedRef = useRef<boolean[]>([]);
  const prevProgressRef = useRef(0);
  const lengthRef = useRef(0);
  const scaleRef = useRef({ x: 1, y: 1 });
  const startRef = useRef<number | null>(null);
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Animate only when in view
  const [inView, setInView] = useState(false);

  // Helper to place vehicle at a specific progress (0..1) without animation loop
  const positionVehicle = (progress: number) => {
    const path = pathRef.current;
    const vehicle = vehicleRef.current;
    if (!path || !vehicle) return;

    const length = lengthRef.current || path.getTotalLength();
    const l = progress * length;
    const pt = path.getPointAtLength(l);
    
    // Efficiency: get a point slightly ahead for rotation
    const ahead = path.getPointAtLength(Math.min(l + 2, length));
    const dx = ahead.x - pt.x; 
    const dy = ahead.y - pt.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    const { x: sx, y: sy } = scaleRef.current;
    const vx = pt.x * sx; 
    const vy = pt.y * sy;
    
    // Hardware acceleration: Use translate3d instead of top/left
    vehicle.style.transform = `translate3d(${vx}px, ${vy}px, 0) translate(-50%, -50%) rotate(${angle}deg) translate(${offsetAlong}px, ${offsetNormal}px)`;
  };

  // Precompute milestone positions along path
  useEffect(() => {
    const path = pathRef.current; if (!path) return;
    const totalLength = path.getTotalLength();
    lengthRef.current = totalLength;
    
    // We only want milestones to sit on the first ~85% of the path
    // so the rickshaw has a tail to drive into "forever"
    const milestoneZoneLimit = totalLength * 0.85;
    
    const arr: { x: number; y: number; angle: number }[] = [];
    MILESTONES.forEach((_, i) => {
      // Linear distribution within the zone
      const t = MILESTONES.length > 1 ? i / (MILESTONES.length - 1) : 0;
      const l = t * milestoneZoneLimit;
      const pt = path.getPointAtLength(l);
      
      const delta = 1;
      const ahead = path.getPointAtLength(Math.min(l + delta, totalLength));
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
      setViewWidth(w < 600 ? 600 : w); 
      
      const svg = svgRef.current; if (!svg) return;
      const rect = svg.getBoundingClientRect();
      scaleRef.current = { x: rect.width / (w < 600 ? 600 : w), y: rect.height / containerHeight };
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [containerHeight, viewWidth]);

  // Observe visibility to gate animation
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setInView(entry.isIntersecting);
      },
      { root: null, threshold: 0.1, rootMargin: '20% 0px 20% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Audio playback control
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !vehicleAudio) return;
    
    if (inView && !reducedMotion) {
      audio.play().catch(err => console.log('Audio autoplay prevented:', err));
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [inView, reducedMotion, vehicleAudio]);

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
    
    // FUTURE PROOF: Speed-based duration
    // totalLength / speed(px per ms) = duration
    const speed = 0.25; // slightly slower for premium feel
    const dynamicDurationMs = durationMs || (lengthRef.current > 0 ? (lengthRef.current / speed) : 18000);

    const animate = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = (elapsed % dynamicDurationMs) / dynamicDurationMs; // 0..1
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
  }, [durationMs, reducedMotion, inView, offsetAlong, offsetNormal, MILESTONES.length]);

  return (
  <section id="roadmap" className="relative w-full overflow-hidden pt-24 pb-48 bg-[#06121c]" aria-label="Ricorrenza Roadmap">
      <DigitalGrid />
      <div className="absolute inset-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 30% 0%, #4338ca 0%, transparent 60%)' }} />
      <div className="px-4 relative z-10">
        <h2 className="text-4xl md:text-5xl font-black text-center mb-16 tracking-tight text-white uppercase italic">
          <span className="relative inline-block">
            RICORRENZA Evolution
            <span className="absolute inset-x-0 -bottom-2 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 rounded-full blur-[1px]" />
          </span>
        </h2>
      </div>
        {/* Full-width path container (no max-width constraint) */}
        <div className="relative w-full" style={{ height: containerHeight }} ref={containerRef}>
          {/* Bottom fade mask to make it "never ending" */}
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#06121c] to-transparent z-30 pointer-events-none" />

          <svg ref={svgRef} viewBox={`0 0 ${viewWidth} ${containerHeight}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
                <stop offset="50%" stopColor="#22d3ee" stopOpacity="1" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </linearGradient>
              <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Road base */}
            <path d={pathD} ref={pathRef} stroke="#101827" strokeWidth={ROAD_WIDTH} fill="none" strokeLinecap="round" shapeRendering="geometricPrecision" vectorEffect="non-scaling-stroke" />
            
            {/* Inner lane */}
            <path d={pathD} stroke="rgba(255,255,255,0.05)" strokeWidth={ROAD_WIDTH - 16} fill="none" strokeLinecap="round" shapeRendering="geometricPrecision" vectorEffect="non-scaling-stroke" />
            
            {/* Neon Pulse Line */}
            <path d={pathD} stroke="url(#pulseGrad)" strokeWidth={4} fill="none" strokeLinecap="round" className="neon-pulse-anim" shapeRendering="geometricPrecision" vectorEffect="non-scaling-stroke" filter="url(#neonGlow)" />
            
            {/* Center Dashes */}
            <path d={pathD} stroke="rgba(255,255,255,0.2)" strokeWidth={2} strokeDasharray="12 24" fill="none" strokeLinecap="round" shapeRendering="geometricPrecision" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* Milestones */}
          {positions.map((pos, i) => {
            const milestone = MILESTONES[i];
            const baseLeftSide = i % 2 === 0; // initial alternating preference
            const active = i === activeIndex;
            const isRevealed = revealed[i];
            const { x: sx, y: sy } = scaleRef.current;
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
            const sideSetting = roadmapMilestones?.[i]?.side; // 'left' | 'right' | 'auto'
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
              } else if (!leftSide && (overflowLeftIfRight || overflowRightIfRight) && !(overflowLeftIfLeft || overflowLeftIfLeft)) {
                leftSide = true;
              }
            }

            // Choose final anchor based on resolved side
            let anchorX = leftSide ? candidateLeftX : candidateRightX;
            let anchorY = leftSide ? candidateLeftY : candidateRightY;
            
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
                <div className={`transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${isRevealed ? 'opacity-100 translate-y-0 filter-none' : 'opacity-0 translate-y-10 blur-md'}`}>
                {/* Pin positioned back toward the path center */}
                <div className="absolute" style={{ left: leftSide ? '100%' : 'auto', right: leftSide ? 'auto' : '100%', top: 14 }}>
                  <div className={`relative ${active ? 'scale-125' : 'scale-100'} transition-transform duration-500`}>
                    <MapPin className={`w-7 h-7 ${active ? 'text-cyan-400' : 'text-slate-500'} transition-colors duration-500`} />
                    {active && <div className="absolute inset-0 bg-cyan-400 rounded-full blur-xl opacity-40 animate-pulse" />}
                  </div>
                </div>
                <div style={{ width: milestoneWidth }} className={`${leftSide ? 'text-right pr-6' : 'text-left pl-6'} select-none relative group`}>
                    {active && (
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent -inset-y-4 -mx-4 rounded-2xl blur-xl" />
                    )}
                  <h3
                    className={`font-black tracking-tighter ${isMobile ? 'text-2xl' : 'text-4xl'} mb-2 italic transition-all duration-700 ${active ? 'text-cyan-400' : 'text-slate-400/80 group-hover:text-slate-200'}`}
                  >
                    {milestone.year}
                  </h3>
                  <ul className={`space-y-1.5 ${isMobile ? 'text-xs' : 'text-sm'} leading-snug font-medium text-slate-400 list-none pl-0`}>
                    {milestone.lines.map((l, j) => (
                      <li
                        key={j}
                        className={`transition-all duration-700 ${active ? 'text-slate-100' : 'text-slate-400'} flex items-start gap-2`}
                        style={{ transitionDelay: isRevealed ? `${200 + j * 100}ms` : '0ms' }}
                      >
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${active ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-slate-600'}`} />
                        <span className="flex-1">{l}</span>
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
            className="absolute z-20 will-change-transform"
            style={{ width: vehicleSize, height: vehicleSize }}
          >
            <div className="absolute inset-0 bg-cyan-400/20 blur-2xl rounded-full scale-150 animate-pulse" />
            
            {vehicleImage ? (
              vehicleImage.endsWith('.mp4') || vehicleImage.endsWith('.webm') || vehicleImage.endsWith('.mov') ? (
                <video
                  src={vehicleImage}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(34,211,238,0.4)]"
                  onError={(e) => { (e.currentTarget as HTMLVideoElement).style.display = 'none'; }}
                />
              ) : (
                <img
                  src={vehicleImage}
                  alt="Rickshaw"
                  className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(34,211,238,0.4)]"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  draggable={false}
                />
              )
            ) : (
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 border border-white/20 flex items-center justify-center relative shadow-2xl overflow-hidden group">
                  <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-colors" />
                  <span className="text-[10px] font-black text-white tracking-widest select-none drop-shadow-md">RICO-BOT</span>
                </div>
            )}
          </div>
        </div>
      {/* Audio element for vehicle sound */}
      {vehicleAudio && (
        <audio
          ref={audioRef}
          src={vehicleAudio}
          loop
          preload="auto"
          style={{ display: 'none' }}
        />
      )}
      <style>{`
        @keyframes neon-pulse {
          0% { stroke-dashoffset: 2000; }
          100% { stroke-dashoffset: 0; }
        }
        .neon-pulse-anim {
          stroke-dasharray: 400 1600;
          animation: neon-pulse 5s linear infinite;
        }
      `}</style>
    </section>
  );
};

export { Roadmap };
export default Roadmap;
