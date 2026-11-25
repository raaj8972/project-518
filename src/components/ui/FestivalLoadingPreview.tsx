import { useEffect, useState } from 'react';

export const LOADING_RECOVERY_MS = 8000;

/** Visible while route code or essential settings load; no protected content. */
export function FestivalLoadingPreview() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), LOADING_RECOVERY_MS);
    return () => window.clearTimeout(timer);
  }, []);
  const direct = new URL(window.location.href);
  direct.searchParams.set('intro', 'off');
  return <div role="status" className="festival-loading-preview" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '100px 24px', background: "linear-gradient(#04110966, #04110999), url('/images/ricorrenza-emerald-preview.webp') center / cover", color: '#eee2b9', textAlign: 'center' }}>
    <div><p style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(28px, 6vw, 60px)', fontStyle: 'italic' }}>RICORRENZA</p><p style={{ marginTop: 16, fontSize: 13 }}>{slow ? 'Taking longer than usual. You can try opening the website directly.' : 'Opening your campus…'}</p>
      {slow && <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 24 }}>
        <a href={`${direct.pathname}${direct.search}${direct.hash}`} style={{ display: 'inline-block', padding: '12px 20px', border: '1px solid #dbbd72', borderRadius: 8, color: '#fff0c9', background: '#14291e' }}>Open website without intro</a>
        <button type="button" onClick={() => window.location.reload()} style={{ padding: '12px 20px', border: '1px solid #809781', borderRadius: 8, color: '#eee2b9', background: '#0b1d14' }}>Retry loading</button>
      </div>}
    </div>
  </div>;
}
