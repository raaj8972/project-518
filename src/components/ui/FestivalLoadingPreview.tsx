/** Visible while route code or essential settings load; no protected content. */
export function FestivalLoadingPreview() {
  return <div role="status" className="festival-loading-preview" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '100px 24px', background: "linear-gradient(#04110966, #04110999), url('/images/ricorrenza-emerald-preview.webp') center / cover", color: '#eee2b9', textAlign: 'center' }}>
    <div><p style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(28px, 6vw, 60px)', fontStyle: 'italic' }}>RICORRENZA</p><p style={{ marginTop: 16, fontSize: 13 }}>Opening your campus…</p></div>
  </div>;
}
