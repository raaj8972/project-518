import { useId } from 'react';

/** Original geometric spider mark shared by the opening screen and hero. */
export function SpiderEmblem({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 120 160" fill="none" aria-hidden="true">
    <g stroke="currentColor" strokeWidth="3.3" strokeLinejoin="miter">
      <path d="M50 64L28 38L23 5M46 76L14 59L4 22M46 87L16 100L6 137M50 97L33 119L30 156M70 64L92 38L97 5M74 76L106 59L116 22M74 87L104 100L114 137M70 97L87 119L90 156" />
    </g>
    <path d="M60 51L73 68L68 82L77 99L60 124L43 99L52 82L47 68Z" fill="currentColor" />
    <path d="M60 58L64 69L60 79L56 69Z" fill="#b5ff91" opacity=".95" />
    <path d="M60 88L69 100L60 113L51 100Z" fill="#0b1c12" />
  </svg>;
}

/** A matching static model for browsers that cannot create a WebGL context. */
export function MechanicalSpiderIllustration({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const legs = ['M128 92L90 49L54 29L12 60', 'M120 108L68 77L31 89L6 139', 'M122 126L72 128L41 165L25 222', 'M135 139L110 175L111 213L99 248', 'M167 88L202 42L241 19L289 46', 'M178 106L229 68L265 81L301 126', 'M177 125L234 119L268 158L288 214', 'M164 139L193 174L196 210L213 244'];
  return <svg className={className} viewBox="0 0 310 260" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-metal`} x1="110" y1="60" x2="183" y2="149" gradientUnits="userSpaceOnUse"><stop stopColor="#758376" /><stop offset=".35" stopColor="#233b2e" /><stop offset=".7" stopColor="#081b12" /><stop offset="1" stopColor="#466242" /></linearGradient>
      <linearGradient id={`${id}-gold`} x1="39" y1="20" x2="250" y2="222" gradientUnits="userSpaceOnUse"><stop stopColor="#f5df9b" /><stop offset=".4" stopColor="#b59450" /><stop offset=".65" stopColor="#f3dc94" /><stop offset="1" stopColor="#796134" /></linearGradient>
      <radialGradient id={`${id}-glow`}><stop stopColor="#ccffad" stopOpacity=".8" /><stop offset="1" stopColor="#71ff4d" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}-beam`} x1="146" y1="131" x2="100" y2="245" gradientUnits="userSpaceOnUse"><stop stopColor="#88ff61" stopOpacity=".45" /><stop offset="1" stopColor="#88ff61" stopOpacity="0" /></linearGradient>
    </defs>
    <path d="M143 132L61 257L145 257L157 136Z" fill={`url(#${id}-beam)`} />
    <g stroke="#08180f" strokeWidth="8" strokeLinejoin="bevel">{legs.map((d, i) => <path key={i} d={d} />)}</g>
    <g stroke={`url(#${id}-gold)`} strokeWidth="3.7" strokeLinejoin="bevel">{legs.map((d, i) => <path key={i} d={d} />)}</g>
    <g fill="#071810" stroke="#bca064" strokeWidth="1.4">{[[90,49],[68,77],[72,128],[110,175],[202,42],[229,68],[234,119],[193,174],[54,29],[31,89],[41,165],[111,213],[241,19],[265,81],[268,158],[196,210]].map(([cx,cy], i) => <circle key={i} cx={cx} cy={cy} r="3.3" />)}</g>
    <ellipse cx="152" cy="100" rx="43" ry="41" transform="rotate(17 152 100)" fill={`url(#${id}-metal)`} stroke="#bca365" strokeWidth="1.6" />
    <path d="M139 61L148 90L180 88M153 63L162 79L181 79M115 92L134 108L130 135" stroke={`url(#${id}-gold)`} strokeWidth="4" />
    <path d="M154 67L163 91L189 96M118 101L137 116L134 135" stroke="#091a10" strokeWidth="2" />
    <ellipse cx="146" cy="125" rx="28" ry="22" transform="rotate(17 146 125)" fill={`url(#${id}-metal)`} stroke="#bba269" strokeWidth="1.4" />
    <circle cx="141" cy="134" r="32" fill={`url(#${id}-glow)`} />
    <circle cx="141" cy="134" r="13" fill="#06190d" stroke="#cdb977" strokeWidth="3" />
    <circle cx="141" cy="134" r="9" fill="#103e17" stroke="#7aff4b" strokeWidth="2" />
    <circle cx="141" cy="134" r="5.5" fill="#bdff99" />
    <path d="M128 116L136 118M158 118L166 115M71 76L74 78M231 118L235 119M202 42L205 42M110 174L111 179" stroke="#91ff66" strokeWidth="3" strokeLinecap="round" />
  </svg>;
}
