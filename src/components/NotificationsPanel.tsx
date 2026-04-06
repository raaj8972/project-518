import React from 'react';
import { useData } from '../context/DataContext';

type Variant = 'info' | 'success' | 'warning' | 'error' | 'urgent' | 'custom';

const variantAccent: Record<Variant, { ring: string; glowFrom: string; glowTo: string; label: string }> = {
  info:    { ring: 'ring-cyan-400/60',   glowFrom: 'from-cyan-400/25',    glowTo: 'to-violet-500/20', label: 'text-cyan-300' },
  success: { ring: 'ring-cyan-500/60',   glowFrom: 'from-cyan-500/25',    glowTo: 'to-indigo-500/20', label: 'text-cyan-400' },
  warning: { ring: 'ring-violet-400/70',  glowFrom: 'from-violet-400/25',   glowTo: 'to-indigo-500/20', label: 'text-violet-300' },
  error:   { ring: 'ring-indigo-600/70',   glowFrom: 'from-indigo-600/25',    glowTo: 'to-violet-600/20',label: 'text-indigo-400' },
  urgent:  { ring: 'ring-violet-600/80', glowFrom: 'from-violet-600/30',  glowTo: 'to-cyan-400/25',   label: 'text-violet-400' },
  custom:  { ring: 'ring-violet-400/60', glowFrom: 'from-violet-400/25',  glowTo: 'to-indigo-500/20', label: 'text-violet-300' },
};

// Configure default auto-dismiss per type (ms). Omit or set to 0/undefined to disable.
// Examples:
//  - info: 4000 (4s)
//  - success: 5000
//  - warning/error/urgent: disabled by default
const autoDismissMsByType: Partial<Record<Variant, number>> = {
  info: 4000,    // 4s for informational
  success: 5000, // 5s for success
  warning: 8000, // 8s for warnings
  // error: undefined => no auto-dismiss by default
  // urgent: undefined => no auto-dismiss by default
};

const keyFor = (id: number, starts_at: string | null | undefined) => `notif:dismissed:${id}:${starts_at ?? ''}`;

export const NotificationsPanel: React.FC = () => {
  const { notifications, suppressPublicNotifications } = useData();
  const [dismissed, setDismissed] = React.useState<Record<string, boolean>>({});
  const timersRef = React.useRef<Record<string, number>>({});

  // Always compute lists before any early return to keep hook order stable
  const list = Array.isArray(notifications) ? notifications : [];
  const active = list.filter((n: any) => !dismissed[keyFor(n.id, n.starts_at)]);

  // Use the first active notification as primary; show all in a scroll area
  const acc = (n: any): Variant => {
    const t = String(n.type || 'info').toLowerCase();
    if (t === 'urgent') return 'urgent';
    return (['info','success','warning','error','custom'].includes(t) ? (t as Variant) : 'info');
  };

  // Auto-dismiss timer for info notifications (few seconds), while allowing manual dismiss earlier
  React.useEffect(() => {
    // If notifications are globally suppressed (e.g., during registration), don't start timers
    if (suppressPublicNotifications) return;
    active.forEach((n: any) => {
      const key = keyFor(n.id, n.starts_at);
      if (dismissed[key]) return;
      const v = acc(n);
      // Prefer per-notification override (seconds -> ms) if provided
      const overrideSec = Number((n as any).auto_dismiss_seconds ?? NaN);
      const overrideMs = Number.isFinite(overrideSec) && overrideSec > 0 ? overrideSec * 1000 : undefined;
      const ms = overrideMs ?? autoDismissMsByType[v];
      if (ms && ms > 0 && !timersRef.current[key]) {
        const id = window.setTimeout(() => {
          setDismissed((prev) => ({ ...prev, [key]: true }));
          delete timersRef.current[key];
        }, ms);
        timersRef.current[key] = id as unknown as number;
      }
    });
    return () => {
      // Clean any timers for items that no longer active
      Object.entries(timersRef.current).forEach(([k, id]) => {
        if (!active.find((n:any) => keyFor(n.id, n.starts_at) === k)) {
          window.clearTimeout(id);
          delete timersRef.current[k];
        }
      });
    };
  }, [active, dismissed, suppressPublicNotifications]);

  // Now it's safe to early-return without skipping hooks called above
  // Stable Shell: Return null internally for non-public routes so the component 
  // remains mounted as a sibling in AppShell but doesn't render visual content.
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isSecurityRoute = location.pathname.startsWith('/security-');
  const isCoordinatorRoute = location.pathname.startsWith('/coordinator/dashboard');
  if (isAdminRoute || isSecurityRoute || isCoordinatorRoute) return null;

  if (suppressPublicNotifications) return null;
  if (list.length === 0) return null;
  if (active.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Cyberpunk backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(closest-side,rgba(255,255,255,0.06),transparent_60%)]" />
      <div className="absolute -top-24 -left-16 w-[22rem] h-[22rem] rounded-full bg-indigo-600/15 blur-3xl" />
      <div className="absolute -bottom-24 -right-20 w-[24rem] h-[24rem] rounded-full bg-cyan-400/15 blur-3xl" />

      {/* Modal card with neon ring */}
      <div className={`relative z-10 w-full max-w-lg`}>
        {/* Animated glow ring */}
        <div className={`absolute -inset-[2px] rounded-xl bg-gradient-to-r ${variantAccent[acc(active[0])].glowFrom} ${variantAccent[acc(active[0])].glowTo} blur-md opacity-70 animate-[pulseGlow_2.5s_ease-in-out_infinite]`} />
    <div className={`relative rounded-xl bg-black/85 ring-1 ${variantAccent[acc(active[0])].ring} border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.06)] overflow-hidden`}>
          {/* scanline sheen */}
          <div className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_45%,black_55%,transparent)]">
            <div className="w-full h-[140%] -translate-y-[20%] bg-gradient-to-b from-transparent via-white/10 to-transparent animate-[sheen_3s_linear_infinite]" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3">
            <div className={`text-xs uppercase tracking-wider ${variantAccent[acc(active[0])].label} animate-notifLabel`}>{(active[0].type || 'info').toString()}</div>
            <button
              onClick={() => {
                // Dismiss all visible for this session
                const next: Record<string, boolean> = { ...dismissed };
                active.forEach((n:any) => { next[keyFor(n.id, n.starts_at)] = true; });
                setDismissed(next);
              }}
              className="text-white/70 hover:text-white text-sm"
              aria-label="Dismiss notifications"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pb-4 pt-1">
            <div className="max-h-[50vh] overflow-auto custom-scroll space-y-3 pr-1">
                {active.map((n: any, wordGroupIndex: number) => {
                const v = acc(n);
                const k = keyFor(n.id, n.starts_at);
                const textColor = (n as any).text_color as string | null | undefined;
                const glowColor = (n as any).glow_color as string | null | undefined;
                const fallbackGlow = (
                  v === 'info' ? 'rgba(34,211,238,0.8)' : // Cyan
                  v === 'success' ? 'rgba(6,182,212,0.8)' : // Cyan-500
                  v === 'warning' ? 'rgba(167,139,250,0.85)' : // Violet-400
                  v === 'urgent' ? 'rgba(139,92,246,0.85)' : // Violet-600
                  v === 'custom' ? 'rgba(124,58,237,0.85)' : // Violet-600
                  'rgba(79,70,229,0.85)' // Indigo-600 (Error fallback)
                );
                const glow = glowColor || fallbackGlow;
                  // Softer radius and spread per type
                  const glowLevelsByType: Record<Variant, [number, number, number]> = {
                    info: [6, 14, 28],
                    success: [5, 12, 24],
                    warning: [7, 16, 32],
                    error: [8, 18, 36],
                    urgent: [10, 22, 44],
                    custom: [6, 14, 30],
                  };
                  const [g1, g2, g3] = glowLevelsByType[v];
                return (
                  <div key={n.id} className="relative rounded-lg p-3 bg-white/3 animate-notifPop" style={{ color: textColor || undefined }}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-2 h-2 rounded-full shadow ${v==='info'?'bg-cyan-400': v==='success'?'bg-cyan-500': v==='warning'?'bg-violet-400': v==='urgent'?'bg-violet-600':'bg-indigo-600'}`}/>
                      <div className="flex-1 min-w-0">
                        {n.title && (
                          <div className="align-top max-w-full font-extrabold leading-snug text-[24px] whitespace-pre-wrap break-words">
                              {String(n.title).split(/(\s+)/).map((part: string, idx: number) => {
                              if (part.trim() === '') return <span key={idx}>{part}</span>;
                              return (
                                <span key={idx} className="relative inline-block align-top">
                                  <span
                                    aria-hidden
                                      className="absolute -inset-0.5 -z-10 rounded-md blur-md opacity-80 pointer-events-none"
                                      style={{
                                        boxShadow: `0 0 ${g1}px ${glow}, 0 0 ${g2}px ${glow}, 0 0 ${g3}px ${glow}`,
                                        animation: `wordPulse 2.8s ease-in-out infinite`,
                                        animationDelay: `${(wordGroupIndex * 80 + idx * 60) % 480}ms`,
                                        willChange: 'transform, opacity',
                                      }}
                                  />
                                  <span style={{ color: textColor || undefined, textShadow: `0 0 4px ${glow}` }}>{part}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <div
                          className="leading-snug whitespace-pre-wrap text-[15px] mt-0.5"
                          style={{ color: textColor ? textColor : undefined }}
                        >
                          {n.message}
                        </div>
                        {n.link_url && (
                          <div className="mt-2">
                            <a href={n.link_url} target="_blank" rel="noreferrer" className="inline-block text-xs px-2 py-1 rounded border border-white/20 hover:border-white/40 hover:bg-white/5">
                              Open link
                            </a>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setDismissed((prev) => ({ ...prev, [k]: true }))}
                        className="ml-2 text-[11px] text-white/60 hover:text-white"
                        aria-label="Dismiss"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* keyframes */}
      <style>{`
        @keyframes sheen { 0% { transform: translateY(-60%); } 100% { transform: translateY(60%); } }
        @keyframes pulseGlow { 0%,100% { opacity: 0.55; } 50% { opacity: 0.9; } }
        @keyframes wordPulse { 0% { opacity: .65; transform: scale(0.985); } 50% { opacity: .92; transform: scale(1.015); } 100% { opacity: .7; transform: scale(0.99); } }
        @keyframes notifPop { 0% { opacity: 0; transform: scale(0.985); } 60% { opacity: 1; transform: scale(1.04); } 100% { opacity: 1; transform: scale(1); } }
        .animate-notifPop { animation: notifPop 360ms cubic-bezier(0.2,0.9,0.2,1) both; transform-origin: center; will-change: transform, opacity; }
        @keyframes notifLabel { 0% { transform: scale(0.96); opacity: 0.6; } 50% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        .animate-notifLabel { animation: notifLabel 420ms cubic-bezier(0.2,0.9,0.2,1) both; transform-origin: left center; }
      `}</style>
    </div>
  );
};

export default NotificationsPanel;
