import React, { useState, startTransition } from 'react';
import { Music, Instagram, ChevronDown } from 'lucide-react';
import { useData } from '../context/DataContext';
import { AuditionModal } from '../components/AuditionModal';
import { SEO } from '../components/SEO';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import { ArtistScrollSection } from '../components/HomeBound/ArtistScrollSection';

import { HeroBackgroundV2 } from '../components/HeroBackgroundV2';

export const HomeBound: React.FC = () => {
  const { bandMembers, formSettings, homeboundSettings } = useData();
  const [auditionModal, setAuditionModal] = useState(false);

  // Filter enabled band members and sort by order
  const enabledBandMembers = (bandMembers || [])
    .filter(member => member.enabled)
    .sort((a, b) => {
       if (a.is_featured && !b.is_featured) return -1;
       if (!a.is_featured && b.is_featured) return 1;
       return a.order_position - b.order_position;
    })
    .map(member => ({
      ...member,
      id: String(member.id)
    }));

  // Performance Optimization: Prefetch critical assets
  React.useEffect(() => {
    if (enabledBandMembers.length > 0) {
      // Prefetch first two artist images to avoid flicker on scroll
      enabledBandMembers.slice(0, 2).forEach(member => {
        if (member.image) {
          const img = new Image();
          img.src = member.image;
        }
      });
    }
  }, [enabledBandMembers]);

  return (
    <div className="bg-[#030712] text-[#e2e8f0] selection:bg-cyan-500/30 min-h-screen font-sans antialiased overflow-x-hidden">
      <SEO 
        title="Home Bound" 
        description={`The official band of ${BRAND_NAME} ${BRAND_YEAR}.`} 
        canonical="https://ricorrenza.fun/home-bound" 
      />

      {/* CONTINUOUS SCROLL CONTAINER */}
      <div className="relative w-full">
        
        {/* SUBTLE GRITTY BACKGROUND (Fixed) */}
        <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.15]"
             style={{
               backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
               backgroundSize: '32px 32px'
             }}>
        </div>

        {/* FIXED HERO BACKGROUND */}
        <div className="fixed top-0 left-0 w-full h-[100dvh] z-0 overflow-hidden pointer-events-none">
           <div 
             className="absolute inset-0 z-0"
             style={{ animation: 'heroFadeIn 1.5s ease-out forwards' }}
           >
             <HeroBackgroundV2 pageKey="homebound" className="filter grayscale contrast-125 brightness-50 mix-blend-luminosity z-10" />
             <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-[#030712]/60 to-[#030712] z-20 transition-colors duration-1000"></div>
           </div>
        </div>

        {/* SEAMLESS HERO CONTENT */}
        <section className="relative w-full min-h-[100dvh] flex flex-col items-center justify-center pt-24 pb-12 z-10 px-4">
          
          <div className="animate-[fadeInUp_1s_ease-out_forwards] flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 md:mb-8 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
              <span className="text-[10px] md:text-xs font-semibold tracking-[0.2em] uppercase text-cyan-50">Official Lineup</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl md:text-9xl lg:text-[11rem] font-bold text-white mb-2 tracking-tighter leading-none" style={{ textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              HOME<span className="text-white/60 font-light">BOUND</span>
            </h1>
            
            <div className="flex items-center gap-6 mt-6 md:mt-10 opacity-70">
               <div className="h-[1px] w-12 md:w-24 bg-white/30"></div>
               <p className="text-sm md:text-lg text-white font-light tracking-[0.3em] uppercase">
                 {BRAND_YEAR} Core Identity
               </p>
               <div className="h-[1px] w-12 md:w-24 bg-white/30"></div>
            </div>
          </div>

          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/50 flex flex-col items-center gap-3 animate-[pulse_2s_infinite]">
            <span className="text-[10px] uppercase tracking-[0.2em] font-mono">Scroll to explore</span>
            <ChevronDown size={14} />
          </div>
        </section>

        {/* ARTIST LIST (Continuous) */}
        <div className="relative z-20 w-full bg-[#030712] rounded-t-[2rem] md:rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] pt-12 pb-24 md:pt-24 md:pb-32 flex flex-col gap-16 md:gap-40 min-h-screen">
          <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#030712] to-transparent pointer-events-none"></div>

          {enabledBandMembers.length > 0 ? (
            enabledBandMembers.map((member, index) => (
              <ArtistScrollSection key={member.id} member={member} index={index} />
            ))
          ) : (
            <div className="py-32 flex items-center justify-center min-h-[50vh]">
               <div className="flex flex-col items-center gap-4">
                 <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin"></div>
                 <p className="text-sm text-cyan-500/50 font-mono uppercase tracking-widest">Loading Secure Core Data...</p>
               </div>
            </div>
          )}
        </div>

        {/* 3. FINAL CTA SECTION */}
        <section className="relative w-full bg-[#030712] flex flex-col items-center justify-center py-24 md:py-40 z-20">
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#030712] via-[#030712] to-transparent z-10"></div>
          
          <div className="container mx-auto px-4 z-20 text-center flex flex-col items-center">
            <div className="max-w-4xl w-full border border-white/5 bg-white/[0.02] backdrop-blur-2xl p-8 sm:p-12 md:p-20 rounded-[2rem] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-[100px]"></div>
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px]"></div>
               
               <div className="relative z-10 mb-8 md:mb-10">
                  <h3 className="text-3xl sm:text-4xl md:text-6xl font-black text-white tracking-tight mb-4">
                    Join The Core
                  </h3>
                  <p className="text-white/50 text-base md:text-lg max-w-xl mx-auto font-light">
                    The portal is open. If you have what it takes, submit your audition and become a part of the legacy.
                  </p>
               </div>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center relative z-10">
                {formSettings?.audition_form_enabled ? (
                  <button 
                    onClick={() => startTransition(() => setAuditionModal(true))}
                    className="group relative px-8 py-4 md:px-10 md:py-5 bg-white text-black hover:bg-cyan-50 rounded-full font-bold text-base md:text-xl transition-all duration-300 flex items-center gap-3 overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-105"
                  >
                    <div className="relative z-20 flex items-center gap-3">
                       <Music className="w-5 h-5" />
                       Submit Audition
                    </div>
                  </button>
                ) : (
                  <div className="px-8 py-4 md:px-10 md:py-5 bg-white/5 rounded-full border border-white/10 flex items-center gap-3 text-white/40">
                    <Music className="w-5 h-5" />
                    <span className="text-xs md:text-sm font-medium uppercase tracking-widest">Auditions Closed</span>
                  </div>
                )}
              </div>
            </div>

            {/* Social Footer */}
            {(homeboundSettings?.instagram_enabled && homeboundSettings?.instagram_url) && (
              <div className="mt-12 md:mt-20">
                <a
                  href={homeboundSettings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-14 h-14 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 hover:border-white/30 hover:scale-110 transition-all text-white/50 hover:text-white"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            )}
          </div>
        </section>
      </div>

      {formSettings?.audition_form_enabled && (
        <AuditionModal
          isOpen={auditionModal}
          onClose={() => startTransition(() => setAuditionModal(false))}
        />
      )}
      
      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes heroFadeIn {
          from { opacity: 0; filter: blur(10px) brightness(0); }
          to { opacity: 1; filter: blur(0px) brightness(1); }
        }
        @keyframes heroTextReveal {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default HomeBound;