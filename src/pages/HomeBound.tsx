import React, { useState, startTransition } from 'react';
import { Music, Instagram, Play, CheckCircle2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { AuditionModal } from '../components/AuditionModal';
import { SEO } from '../components/SEO';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import { ArtistCard } from '../components/HomeBound/ArtistScrollSection'; 

export const HomeBound: React.FC = () => {
  const { bandMembers, formSettings, homeboundSettings } = useData();
  const [auditionModal, setAuditionModal] = useState(false);

  // Filter enabled band members and sort by order
  let enabledBandMembers: any[] = (bandMembers || [])
    .filter((member: any) => member.enabled)
    .sort((a: any, b: any) => {
       if (a.is_featured && !b.is_featured) return -1;
       if (!a.is_featured && b.is_featured) return 1;
       return a.order_position - b.order_position;
    })
    .map(member => ({
      ...member,
      id: String(member.id)
    }));

  return (
    <div className="bg-[#121212] text-white min-h-screen font-sans antialiased selection:bg-green-500/30 pb-20">
      <SEO 
        title="Home Bound" 
        description={`The official band of ${BRAND_NAME} ${BRAND_YEAR}.`} 
        canonical="https://ricorrenza.fun/home-bound" 
      />

      {/* Spotify Top Gradient Layer */}
      <div className="absolute top-0 left-0 w-full h-[60vh] bg-gradient-to-b from-blue-900/40 via-[#121212]/80 to-[#121212] pointer-events-none z-0"></div>

      <div className="w-full max-w-[1920px] mx-auto pt-24 md:pt-32 px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* PREMIUM HERO BANNER */}
        <section className="flex flex-col md:flex-row items-end gap-6 md:gap-8 mb-12 lg:mb-16">
          {/* Main Cover Image Effect */}
          <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 flex-shrink-0 shadow-[0_8px_40px_rgba(0,0,0,0.6)] rounded-lg overflow-hidden bg-white/5 relative border border-white/10 flex items-center justify-center">
             {/* Abstract Cover / Logo Placeholder */}
             <div className="absolute inset-0 bg-gradient-to-tr from-blue-900 to-indigo-500 opacity-50"></div>
             <Music size={80} className="text-white/80 drop-shadow-2xl relative z-10" />
          </div>

          <div className="flex flex-col justify-end w-full">
            <div className="flex items-center gap-2 text-sm md:text-base font-semibold mb-2 text-white/90">
              <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-400/20" />
              <span className="uppercase tracking-widest text-[10px] md:text-xs text-white/70">Verified Official Artist</span>
            </div>
            
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[7rem] font-black tracking-tighter leading-none mb-4 md:mb-6">
              HOMEBOUND
            </h1>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm md:text-base text-white/60 font-medium">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Rico" className="w-6 h-6 rounded-full bg-white/10" onError={(e) => { e.currentTarget.style.display='none' }} />
                <span className="text-white hover:underline cursor-pointer">{BRAND_NAME} {BRAND_YEAR}</span>
              </div>
              <span className="hidden sm:inline">•</span>
              <span>{enabledBandMembers.length} Members</span>
            </div>
          </div>
        </section>

        {/* PLAY CONTROLS */}
        <div className="flex items-center gap-6 mb-12">
           <button className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-green-500 hover:bg-green-400 hover:scale-105 transition-all flex items-center justify-center shadow-[0_8px_24px_rgba(29,185,84,0.3)]">
             <Play fill="black" size={28} className="ml-1 text-black" />
           </button>
           
           {homeboundSettings?.instagram_enabled && homeboundSettings?.instagram_url ? (
             <a 
               href={homeboundSettings.instagram_url}
               target="_blank"
               rel="noopener noreferrer"
               className="h-10 px-6 rounded-full border border-white/30 text-white font-bold text-sm hover:border-white hover:scale-105 transition-all tracking-widest uppercase flex items-center justify-center"
             >
               Follow
             </a>
           ) : (
             <button disabled className="h-10 px-6 rounded-full border border-white/10 text-white/30 font-bold text-sm tracking-widest uppercase cursor-not-allowed">
               Follow
             </button>
           )}
        </div>

        {/* ARTIST GRID */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-6">Lineup</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {enabledBandMembers.map((member, index) => (
              <ArtistCard key={member.id} member={member as any} index={index} />
            ))}
          </div>
        </section>

        {/* CTA SECTION: VIP Audition */}
        <section className="relative w-full rounded-2xl bg-[#181818] border border-white/5 overflow-hidden p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10 hover:bg-[#202020] transition-colors">
          <div className="absolute top-0 right-0 w-96 h-96 bg-green-600/10 rounded-full blur-[100px]"></div>
          
          <div className="relative z-10 flex-1">
            <h3 className="text-3xl md:text-5xl font-black text-white mb-3">
              Join The Core
            </h3>
            <p className="text-[#a7a7a7] text-lg max-w-xl">
              Think you have what it takes? Submit your audition and become part of the official {BRAND_YEAR} Homebound lineup.
            </p>
          </div>
          
          <div className="relative z-10 flex-shrink-0">
             {formSettings?.audition_form_enabled ? (
                  <button 
                    onClick={() => startTransition(() => setAuditionModal(true))}
                    className="px-8 py-4 bg-white text-black hover:bg-gray-200 hover:scale-105 rounded-full font-bold text-lg transition-all duration-300 flex items-center gap-3 shadow-xl"
                  >
                    <Music className="w-5 h-5" />
                    Submit Audition
                  </button>
                ) : (
                  <div className="px-8 py-4 bg-[#242424] rounded-full text-[#a7a7a7] font-bold text-lg border border-white/10 flex items-center gap-3">
                    <Music className="w-5 h-5" />
                    Auditions Closed
                  </div>
                )}
          </div>
        </section>

        {/* Social Footer */}
        {(homeboundSettings?.instagram_enabled && homeboundSettings?.instagram_url) && (
          <div className="mt-16 flex justify-center pb-10 border-t border-white/5 pt-10">
            <div className="flex flex-col items-center gap-4">
              <span className="text-[#a7a7a7] font-bold tracking-widest text-xs uppercase">Find us on Instagram</span>
              <a
                href={homeboundSettings.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-14 h-14 bg-[#181818] rounded-full flex items-center justify-center hover:bg-[#282828] hover:scale-110 transition-all text-white border border-white/10 hover:border-white/30"
              >
                <Instagram className="w-6 h-6" />
              </a>
            </div>
          </div>
        )}

      </div>

      {formSettings?.audition_form_enabled && (
        <AuditionModal
          isOpen={auditionModal}
          onClose={() => startTransition(() => setAuditionModal(false))}
        />
      )}
      
      <style>{`
        body { background-color: #121212 !important; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default HomeBound;