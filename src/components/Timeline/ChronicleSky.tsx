import { useId } from 'react';

/** The dormant artwork, orbit and eye light are independent registered layers. */
export default function ChronicleSky() {
  const id = useId();
  const artwork = '/images/ricorrenza-chronicles-dormant.webp';
  return <div className="chronicles__sky" aria-hidden="true">
    <svg className="chronicles__sky-art" viewBox="0 0 887 1774" fill="none" focusable="false">
      <defs>
        <clipPath id={`${id}-character`}><path d="M615 0C554 7 517 33 502 73C486 130 466 152 457 191C450 216 465 241 485 256C458 282 430 305 409 349L887 430V0Z"/></clipPath>
        <radialGradient id={`${id}-orbit`}><stop offset=".65" stopColor="#11e67b" stopOpacity="0"/><stop offset=".85" stopColor="#19f189" stopOpacity=".15"/><stop offset="1" stopColor="#19f189" stopOpacity="0"/></radialGradient>
        <radialGradient id={`${id}-eye`}><stop stopColor="#caffad" stopOpacity=".9"/><stop offset=".24" stopColor="#38ff74" stopOpacity=".75"/><stop offset="1" stopColor="#08ef6a" stopOpacity="0"/></radialGradient>
        <linearGradient id={`${id}-mist`} x1="0" y1="0" x2="0" y2="430" gradientUnits="userSpaceOnUse"><stop offset=".35" stopColor="white"/><stop offset=".74" stopColor="white" stopOpacity=".65"/><stop offset="1" stopColor="white" stopOpacity="0"/></linearGradient>
        <mask id={`${id}-orbit-mist`} maskUnits="userSpaceOnUse" x="0" y="0" width="887" height="500"><rect width="887" height="500" fill={`url(#${id}-mist)`}/></mask>
        <filter id={`${id}-bloom`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3"/></filter>
        <mask id={`${id}-lit-sockets`} maskUnits="userSpaceOnUse" x="516" y="78" width="136" height="82">
          <ellipse cx="551" cy="134" rx="24" ry="14" transform="rotate(-18 551 134)" fill="white" filter={`url(#${id}-bloom)`}/>
          <ellipse cx="616" cy="106" rx="26" ry="14" transform="rotate(-25 616 106)" fill="white" filter={`url(#${id}-bloom)`}/>
        </mask>
      </defs>
      <image href={artwork} width="887" height="1774"/>
      <g mask={`url(#${id}-orbit-mist)`}><g transform="translate(481 187)">
        <circle r="221" fill={`url(#${id}-orbit)`}/>
        <g className="chronicles__orbit chronicles__orbit--outer">
          <image href="/images/ricorrenza-chronicles-orbit.webp" x="-224" y="-224" width="448" height="448" opacity=".88"/>
        </g>
        <g className="chronicles__orbit chronicles__orbit--inner">
          <circle r="134" stroke="#63f49c" strokeWidth=".7" strokeDasharray="73 12 4 14" opacity=".35"/>
        </g>
      </g></g>
      <image href={artwork} width="887" height="1774" clipPath={`url(#${id}-character)`}/>
      <g className="chronicles__mask-light">
        <ellipse cx="548" cy="134" rx="38" ry="23" fill={`url(#${id}-eye)`}/>
        <ellipse cx="616" cy="105" rx="42" ry="23" fill={`url(#${id}-eye)`}/>
        <image href="/images/ricorrenza-chronicles-eyes.webp" x="516" y="78" width="136" height="82" mask={`url(#${id}-lit-sockets)`}/>
      </g>
    </svg>
  </div>;
}
