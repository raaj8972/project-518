import React from 'react';
import { useData } from '../context/DataContext';
import { CountdownTimer } from '../components/CountdownTimer';
import { SEO } from '../components/SEO';

interface ComingSoonProps {
  previewSettings?: {
    site_closed?: boolean;
    coming_soon_enabled?: boolean;
    coming_soon_until?: string | null;
    coming_soon_title?: string | null;
    coming_soon_message?: string | null;
    coming_soon_ended_text?: string | null;
  };
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ previewSettings }) => {
  const { siteSettings: globalSettings } = useData();
  
  // Use preview settings if provided, otherwise fall back to global settings
  const settings = previewSettings || globalSettings;
  
  const until = settings?.coming_soon_until ? new Date(settings.coming_soon_until) : null;
  const enabled = !!settings?.coming_soon_enabled;
  const hardClosed = !!settings?.site_closed;
  const endedText = (settings as any)?.coming_soon_ended_text || "We'll be back soon";
  const csTitle = (settings as any)?.coming_soon_title || null;
  const csMessage = (settings as any)?.coming_soon_message || null;
  const showTimer = enabled && !!until;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden">
      <SEO 
        title="Coming Soon" 
        description={csMessage || "Something big is coming. Stay tuned for updates."}
      />
      {/* Cyber grid + glow backdrop */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(closest-side,rgba(255,255,255,0.08),transparent_60%)]" />
      <div className="absolute -top-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-fuchsia-500/15 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 w-[30rem] h-[30rem] rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="relative z-10 px-6 text-center max-w-4xl">

        {/* Big Ricorrenza neon with 3D-ish layers */}
        <div className="relative inline-block select-none">
          <div className="absolute inset-0 blur-md opacity-60" style={{textShadow: '0 0 30px rgba(236,72,153,0.45), 0 0 60px rgba(34,211,238,0.35)'}}>
            <span className="text-[clamp(40px,12vw,140px)] font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-white to-cyan-300">Ricorrenza</span>
          </div>
          <h1
            className="relative text-[clamp(40px,12vw,140px)] font-black tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-pink-300 via-white to-cyan-200 drop-shadow-[0_2px_8px_rgba(255,255,255,0.35)]"
            style={{
              WebkitTextStroke: '1px rgba(255,255,255,0.15)',
              textShadow: '0 0 12px rgba(236,72,153,0.35), 0 0 22px rgba(34,211,238,0.25)'
            }}
          >
            Ricorrenza
          </h1>
          {/* Subtle animated scanline sheen */}
          <div className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_40%,black_60%,transparent)] overflow-hidden">
            <div className="w-full h-[140%] -translate-y-[20%] bg-gradient-to-b from-transparent via-white/10 to-transparent animate-[sheen_2.5s_linear_infinite]" />
          </div>
        </div>

        {/* Optional owner-configured title/message */}
        {(csTitle || csMessage) && (
          <div className="mt-6">
            {csTitle && <h2 className="text-2xl md:text-4xl font-semibold tracking-tight">{csTitle}</h2>}
            {csMessage && <p className="mt-3 text-lg text-white/80 max-w-3xl mx-auto">{csMessage}</p>}
          </div>
        )}

        {/* Owner-configured timer (when an end time is set) */}
        {showTimer && (
          <div className="mt-8 animate-[fadeInUp_600ms_ease-out_100ms_both]">
            <CountdownTimer
              target={until as Date}
              neon
              size="xl"
              className="scale-110"
              endedText={hardClosed ? endedText : 'We\'re live!'}
              showEnded
            />
          </div>
        )}

        {/* If there's no timer but the site is gated (enabled) or hard-closed, show the configured message/ended text */}
        {!showTimer && (enabled || hardClosed) && (
          <div className="mt-8 animate-[fadeInUp_600ms_ease-out_100ms_both]">
            <div className="text-lg md:text-2xl font-medium text-white/90">
              {csMessage || endedText}
            </div>
          </div>
        )}

        {/* Helper */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="text-sm text-white/60">Admin can still access the dashboard and login.</div>
          <a href="/login" className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded shadow hover:shadow-lg hover:translate-y-[-1px] transition-all">
            Go to Admin Login
          </a>
        </div>
      </div>

      {/* Keyframes for sheen */}
      <style>{`
        @keyframes sheen { 0% { transform: translateY(-60%); } 100% { transform: translateY(60%); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
};

export default ComingSoon;
